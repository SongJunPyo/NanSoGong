"""레시피 초안 그래프 흐름 테스트 (가짜 Spring · 가짜 LLM)."""

from datetime import datetime

import pytest
from langchain_core.exceptions import OutputParserException
from langgraph.checkpoint.memory import InMemorySaver

from app.graphs.recipe import (
    MAX_REVISIONS,
    ClaudeDraftWriter,
    DraftGenerationError,
    RecipeOutcome,
    build_prompt,
    build_recipe_graph,
    describe_problems,
)
from app.models.recipe import RecipeLineCheck, RecipeValidation
from tests.fakes import BAD_DRAFT, CONTEXT, GOOD_DRAFT, INVALID, VALID, FakeSpring, FakeWriter

START_INPUT = {"job_id": "job-1", "workflow_key": "MENU:job-1", "menu_name": "딸기라떼"}


def run(spring: FakeSpring, writer: FakeWriter) -> dict:
    graph = build_recipe_graph(spring, writer)
    return graph.invoke(dict(START_INPUT))


# ---------- 흐름 ----------


def test_valid_draft_is_saved_once():
    spring = FakeSpring([VALID])
    writer = FakeWriter([GOOD_DRAFT])

    result = run(spring, writer)

    assert result["outcome"] == RecipeOutcome.SAVED
    assert result["suggestion_id"] == 500
    assert len(spring.saved) == 1
    saved = spring.saved[0]
    assert saved.suggestion_type == "MENU"
    assert saved.workflow_key == "MENU:job-1"
    assert saved.payload["menuName"] == "딸기라떼"          # Spring 으로 가는 JSON 은 camelCase
    assert saved.evidence["valid"] is True
    context = saved.generation_context
    assert context["jobId"] == "job-1" and context["revisions"] == 0
    assert datetime.fromisoformat(context["generatedAt"]).tzinfo is not None   # 기준 시각은 offset 포함


def test_invalid_draft_is_revised_with_feedback_then_saved():
    spring = FakeSpring([INVALID, VALID])
    writer = FakeWriter([BAD_DRAFT, GOOD_DRAFT])

    result = run(spring, writer)

    assert result["outcome"] == RecipeOutcome.SAVED
    assert result["revisions"] == 1
    assert writer.feedbacks[0] is None                     # 첫 초안은 피드백 없이
    assert writer.feedbacks[1].valid is False              # 수정 때는 검증 결과를 받는다
    assert spring.saved[0].generation_context["revisions"] == 1


def test_gives_up_without_saving_after_max_revisions():
    spring = FakeSpring([INVALID] * (MAX_REVISIONS + 1))
    writer = FakeWriter([BAD_DRAFT] * (MAX_REVISIONS + 1))

    result = run(spring, writer)

    assert result["outcome"] == RecipeOutcome.VALIDATION_FAILED
    assert len(spring.validated) == MAX_REVISIONS + 1      # 첫 초안 + 수정 2번 = 검증 3번
    assert spring.saved == []                              # 검증을 통과하지 못한 초안은 저장하지 않는다


def test_unusable_first_draft_ends_without_validation_or_save():
    spring = FakeSpring([])
    writer = FakeWriter([DraftGenerationError("형식 오류")])

    result = run(spring, writer)

    assert result["outcome"] == RecipeOutcome.GENERATION_FAILED
    assert spring.validated == []
    assert spring.saved == []


def test_unusable_revision_ends_without_save():
    spring = FakeSpring([INVALID])
    writer = FakeWriter([BAD_DRAFT, DraftGenerationError("형식 오류")])

    result = run(spring, writer)

    assert result["outcome"] == RecipeOutcome.GENERATION_FAILED
    assert spring.saved == []


def test_menu_name_from_llm_is_replaced_with_requested_name():
    renamed = GOOD_DRAFT.model_copy(update={"menu_name": "딸기 스무디"})
    spring = FakeSpring([VALID])

    run(spring, FakeWriter([renamed]))

    assert spring.validated[0].menu_name == "딸기라떼"
    assert spring.saved[0].title == "딸기라떼 레시피 초안"


# ---------- 체크포인트 · 다시 실행 ----------


def test_state_is_kept_in_checkpoint_by_job_id():
    graph = build_recipe_graph(FakeSpring([VALID]), FakeWriter([GOOD_DRAFT]), checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "job-1"}}

    graph.invoke(dict(START_INPUT), config)

    saved_state = graph.get_state(config).values
    assert saved_state["outcome"] == RecipeOutcome.SAVED
    assert saved_state["draft"]["menuName"] == "딸기라떼"


def test_running_finished_job_again_does_nothing():
    spring = FakeSpring([VALID])
    writer = FakeWriter([GOOD_DRAFT])                      # 초안은 한 번 분량만 준비
    graph = build_recipe_graph(spring, writer, checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "job-1"}}

    graph.invoke(dict(START_INPUT), config)
    graph.invoke(dict(START_INPUT), config)                # 재시도 등으로 같은 작업이 다시 들어옴

    assert len(spring.saved) == 1                          # 제안은 한 번만 저장
    assert len(writer.feedbacks) == 1                      # LLM 도 다시 부르지 않음 (비용)


# ---------- 프롬프트 · 피드백 ----------


def test_prompt_lists_items_without_costs():
    prompt = build_prompt("딸기라떼", CONTEXT)

    assert "1 | 딸기청 | g" in prompt
    assert "12.5" not in prompt                            # 단가는 LLM 에 보내지 않는다
    assert "이전 초안" not in prompt


def test_revise_prompt_contains_validation_problems():
    prompt = build_prompt("딸기라떼", CONTEXT, previous=BAD_DRAFT, validation=INVALID)

    assert "이전 초안" in prompt
    assert "딸기청: 단위 '스푼' 을 관리 단위 g 으로 바꿀 수 없음" in prompt
    assert "우유:" not in prompt                            # 문제없는 재료는 문제 목록에 넣지 않는다


def test_whole_draft_reasons_are_included():
    validation = RecipeValidation(
        valid=False, lines=[RecipeLineCheck(ok=True), RecipeLineCheck(ok=True)], reasons=["재료가 너무 많습니다"]
    )

    assert describe_problems(BAD_DRAFT, validation) == ["재료가 너무 많습니다"]


def test_mismatched_check_count_does_not_guess_ingredient_names():
    validation = RecipeValidation(valid=False, lines=[RecipeLineCheck(ok=False, reason="품목 없음")])

    problems = describe_problems(BAD_DRAFT, validation)       # 초안 재료 2개, 검증 결과 1개

    assert problems == ["1번째 검증 항목: 품목 없음"]


# ---------- 실제 Claude 연결부 (모델은 가짜) ----------


class _FakeChatModel:
    """ClaudeDraftWriter 가 쓰는 with_structured_output(...).invoke(...) 만 흉내 낸다."""

    def __init__(self, result):
        self._result = result

    def with_structured_output(self, schema):
        return self

    def invoke(self, prompt):
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


@pytest.mark.parametrize("result", [OutputParserException("깨진 JSON"), None])
def test_claude_writer_turns_bad_output_into_generation_error(result):
    writer = ClaudeDraftWriter(_FakeChatModel(result))

    with pytest.raises(DraftGenerationError):
        writer.write("딸기라떼", CONTEXT)


def test_claude_writer_lets_network_errors_through_for_retry():
    writer = ClaudeDraftWriter(_FakeChatModel(TimeoutError("응답 없음")))

    with pytest.raises(TimeoutError):
        writer.write("딸기라떼", CONTEXT)
