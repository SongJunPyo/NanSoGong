"""레시피 초안 그래프 (#36, docs/rules/ai.md 메뉴 · 레시피).

    START ─(이미 끝난 작업)─────────────────────────────────────────────→ END
      └→ load_context → generate_draft ─(초안 형식 오류)─────────────────→ END  GENERATION_FAILED
                            └→ validate ─(통과)───────────────────→ save → END  SAVED
                                 ↑   ├─(실패, 수정 2회 미만)→ revise ┐
                                 └───┼───────────────────────────────┘ (revise 도 형식 오류면 END)
                                     └─(실패, 수정 2회 다 씀)→ give_up → END  VALIDATION_FAILED

- 숫자(단위 환산 · 원가)는 Spring 검증 API 가 계산한다. LLM 은 재료와 사용량 초안만 만든다.
- 수정 반복 한도는 코드(MAX_REVISIONS)가 정한다. LLM 이 반복을 정하지 않는다.
- 검증을 통과한 초안만 제안으로 저장한다.
- 같은 jobId(thread)로 다시 실행해도, 이미 끝난 작업이면 아무것도 하지 않는다 (중복 저장 방지).
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Protocol, TypedDict

from langchain_core.exceptions import OutputParserException
from langchain_core.language_models import BaseChatModel
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError

from app.clients.spring import SpringClient
from app.models.recipe import (
    RecipeContext,
    RecipeDraft,
    RecipeGenerationContext,
    RecipeReason,
    RecipeValidation,
)
from app.models.suggestion import SuggestionSave
from app.prompts import render
from app.tracing import TRACE_ID_KEY

MAX_REVISIONS = 2
ENTRY_NODE = "load_context"                     # 처음 실행하는 노드 (작업 실행기가 첫 진행 보고에 쓴다)
GRAPH_VERSION = "recipe-draft/3"                # 2: 초안 사용량 칸 qty → quantity (#35 계약) / 3: jobId 숫자 (Spring ai_job_id)


class RecipeOutcome(StrEnum):
    SAVED = "SAVED"                             # 검증 통과 → 제안 저장
    VALIDATION_FAILED = "VALIDATION_FAILED"     # 수정 한도까지 고쳐도 검증 실패 → 저장 안 함
    GENERATION_FAILED = "GENERATION_FAILED"     # LLM 이 형식에 맞는 초안을 주지 못함 → 저장 안 함


class RecipeState(TypedDict, total=False):
    """그래프가 단계마다 주고받는 값.

    체크포인트(DB)에 그대로 저장되므로 Pydantic 객체 대신 JSON 으로 바꾼 dict 를 담는다.
    노드 안에서 Model.model_validate(dict) 로 다시 객체로 만든다.
    """

    # 시작할 때 넣는 값
    job_id: int
    workflow_key: str
    menu_name: str
    # 단계를 지나며 채워지는 값
    context: dict[str, Any]
    draft: dict[str, Any]
    validation: dict[str, Any]
    revisions: int
    outcome: str
    suggestion_id: int


class DraftGenerationError(Exception):
    """LLM 이 형식에 맞는 초안을 돌려주지 않았다 (수량 0, 재료 없음, 응답 없음 등)."""


class DraftWriter(Protocol):
    """초안을 쓰는 쪽. 실제로는 Claude, 테스트에서는 정해진 초안을 돌려주는 가짜."""

    def write(
        self,
        menu_name: str,
        context: RecipeContext,
        previous: RecipeDraft | None = None,
        validation: RecipeValidation | None = None,
    ) -> RecipeDraft: ...


# Spring 검증 코드 → LLM 이 무엇을 고칠지 알 수 있는 문장. NEW_ITEM 은 ok 줄에만 와서 여기에 없다
REASON_MESSAGES: dict[str, str] = {
    RecipeReason.ITEM_NOT_FOUND: "itemId 가 매장 품목 목록에 없습니다. 목록의 itemId 를 쓰거나, 목록에 없는 재료면 itemId 를 비우세요",
    RecipeReason.ITEM_INACTIVE: "사용 중지된 품목입니다. 매장 품목 목록에 있는 품목을 쓰세요",
    RecipeReason.ITEM_AMBIGUOUS: "같은 이름의 품목이 여러 개입니다. 매장 품목 목록에서 itemId 를 골라 적으세요",
    RecipeReason.DUPLICATE_ITEM: "같은 품목이 앞줄에 이미 있습니다. 한 줄로 합치세요",
    RecipeReason.UNKNOWN_UNIT: "알 수 없는 단위입니다. G · ML · EA 중 하나로 적으세요",
    RecipeReason.UNIT_MISMATCH: "단위가 품목 관리 단위와 다릅니다. 품목의 단위로 바꿔 적으세요",
    RecipeReason.INVALID_QTY: "사용량이 0 이하입니다. 소수 셋째 자리까지 적어도 0 보다 큰 값으로 적으세요",
}


def reason_text(code: str | None, unit: str | None = None) -> str:
    """검증 코드를 문장으로 바꾼다. 모르는 코드는 그대로 둔다 (코드가 늘어도 수정 흐름이 멈추지 않게)."""
    if code is None:
        return "사유 없음"
    if code == RecipeReason.UNIT_MISMATCH and unit:
        return f"단위가 품목 관리 단위와 다릅니다. {unit} 단위로 바꿔 적으세요"
    return REASON_MESSAGES.get(code, code)


def describe_problems(previous: RecipeDraft, validation: RecipeValidation) -> list[str]:
    """검증 결과를 LLM 이 고칠 수 있는 문장 목록으로 바꾼다."""
    problems = [reason_text(code) for code in validation.reasons]
    # 검증 결과는 초안과 같은 순서 · 같은 개수로 온다는 약속. 개수가 다르면 재료 이름을 붙이지 않는다
    same_shape = len(validation.lines) == len(previous.lines)
    for index, check in enumerate(validation.lines):
        if check.ok:
            continue
        name = previous.lines[index].item_name if same_shape else f"{index + 1}번째 검증 항목"
        problems.append(f"{name}: {reason_text(check.reason, check.unit)}")
    return problems or ["(구체적인 사유 없음)"]


def build_prompt(
    menu_name: str,
    context: RecipeContext,
    previous: RecipeDraft | None = None,
    validation: RecipeValidation | None = None,
) -> str:
    """LLM 에 보낼 글을 만든다. 단가 · 원가는 넣지 않는다 (필요한 정보만 보낸다)."""
    items = "\n".join(f"{i.item_id} | {i.name} | {i.unit}" for i in context.items) or "(없음)"
    menus = "\n".join(f"- {m.name}" for m in context.menus) or "(없음)"

    feedback = ""
    if previous is not None and validation is not None:
        feedback = render(
            "recipe-feedback",
            previous_draft=previous.model_dump_json(exclude_none=True),
            problems="\n".join(f"- {p}" for p in describe_problems(previous, validation)),
        )

    return render("recipe-draft", menu_name=menu_name, items=items, menus=menus, feedback=feedback)


class ClaudeDraftWriter:
    """Claude 구조화 출력으로 RecipeDraft 를 받는다. 테스트에서는 쓰지 않는다 (실제 모델 = 과금).

    형식 오류만 DraftGenerationError 로 바꾼다. 네트워크 · API 오류는 그대로 올려서 작업 실행기가 재시도한다.
    """

    def __init__(self, chat_model: BaseChatModel):
        # json_schema: 도구 호출을 강제하지 않고 Claude 구조화 출력(output_config.format)으로 받는다.
        # 도구 강제 방식은 thinking 이 켜진 모델에서 막힌다. 받은 결과는 RecipeDraft 가 다시 검사한다
        self._structured = chat_model.with_structured_output(RecipeDraft, method="json_schema")

    def write(self, menu_name, context, previous=None, validation=None) -> RecipeDraft:
        try:
            draft = self._structured.invoke(build_prompt(menu_name, context, previous, validation))
        except (ValidationError, OutputParserException) as exc:
            raise DraftGenerationError("모델 출력이 초안 형식에 맞지 않습니다") from exc
        if draft is None:
            raise DraftGenerationError("모델이 초안을 돌려주지 않았습니다")
        return draft


def build_recipe_graph(spring: SpringClient, writer: DraftWriter, checkpointer=None):
    """그래프를 조립한다. spring · writer 를 밖에서 넣어 주므로 테스트에서 가짜로 바꿀 수 있다."""

    def write_draft(state: RecipeState, **feedback) -> dict:
        """초안을 받아 상태에 넣는다. 형식 오류면 GENERATION_FAILED 로 끝낸다."""
        try:
            draft = writer.write(state["menu_name"], RecipeContext.model_validate(state["context"]), **feedback)
        except DraftGenerationError:
            return {"outcome": RecipeOutcome.GENERATION_FAILED.value}
        # 메뉴 이름은 LLM 이 바꾸지 못하게 사용자가 요청한 이름으로 고정한다
        draft = draft.model_copy(update={"menu_name": state["menu_name"]})
        return {"draft": draft.model_dump(mode="json")}

    def load_context(state: RecipeState) -> dict:
        context = spring.get_recipe_context(state["job_id"])
        return {"context": context.model_dump(mode="json")}

    def generate_draft(state: RecipeState) -> dict:
        return {**write_draft(state), "revisions": 0}

    def validate(state: RecipeState) -> dict:
        draft = RecipeDraft.model_validate(state["draft"])
        validation = spring.validate_recipe(state["job_id"], draft)
        return {"validation": validation.model_dump(mode="json")}

    def revise(state: RecipeState) -> dict:
        update = write_draft(
            state,
            previous=RecipeDraft.model_validate(state["draft"]),
            validation=RecipeValidation.model_validate(state["validation"]),
        )
        return {**update, "revisions": state["revisions"] + 1}

    def save(state: RecipeState, config: RunnableConfig) -> dict:
        draft = RecipeDraft.model_validate(state["draft"])
        # 워커가 넣어 준 이번 실행의 LangSmith 루트 실행 ID (추적을 끄면 없음). 제안과 추적을 잇는다
        trace_id = config.get("configurable", {}).get(TRACE_ID_KEY)
        context = RecipeGenerationContext(
            job_id=state["job_id"],
            graph_version=GRAPH_VERSION,
            revisions=state["revisions"],
            generated_at=datetime.now(UTC),
        )
        saved = spring.save_suggestion(
            state["job_id"],
            SuggestionSave(
                workflow_key=state["workflow_key"],
                suggestion_type="MENU",
                title=f"{draft.menu_name} 레시피 초안",
                summary=draft.description,
                payload=state["draft"],
                evidence=state["validation"],
                generation_context=context.model_dump(mode="json"),
                langsmith_trace_id=trace_id,
            ),
        )
        return {"suggestion_id": saved.suggestion_id, "outcome": RecipeOutcome.SAVED.value}

    def give_up(state: RecipeState) -> dict:
        return {"outcome": RecipeOutcome.VALIDATION_FAILED.value}

    # ---------- 갈림길 (다음에 갈 노드 이름을 돌려준다) ----------

    def skip_if_done(state: RecipeState) -> str:
        return END if state.get("outcome") else ENTRY_NODE

    def stop_if_generation_failed(state: RecipeState) -> str:
        return END if state.get("outcome") == RecipeOutcome.GENERATION_FAILED else "validate"

    def after_validate(state: RecipeState) -> str:
        if state["validation"]["valid"]:
            return "save"
        if state["revisions"] >= MAX_REVISIONS:
            return "give_up"
        return "revise"

    builder = StateGraph(RecipeState)
    builder.add_node(ENTRY_NODE, load_context)
    builder.add_node("generate_draft", generate_draft)
    builder.add_node("validate", validate)
    builder.add_node("revise", revise)
    builder.add_node("save", save)
    builder.add_node("give_up", give_up)

    builder.add_conditional_edges(START, skip_if_done, [ENTRY_NODE, END])
    builder.add_edge(ENTRY_NODE, "generate_draft")
    builder.add_conditional_edges("generate_draft", stop_if_generation_failed, ["validate", END])
    builder.add_conditional_edges("validate", after_validate, ["save", "revise", "give_up"])
    builder.add_conditional_edges("revise", stop_if_generation_failed, ["validate", END])
    builder.add_edge("save", END)
    builder.add_edge("give_up", END)

    return builder.compile(checkpointer=checkpointer)
