"""작업 종류별로 "어떤 그래프를, 어떤 입력으로 시작하고, 결과를 어떻게 읽는지".

새 작업 종류를 붙일 때: 입력 모델을 JOB_INPUTS 에 넣고, JobHandler 를 하나 만들어 워커에 넘긴다.
JOB_INPUTS 에 없는 종류는 접수 API 가 400 UNSUPPORTED_JOB_TYPE 으로 거절한다.
"""

from dataclasses import dataclass
from typing import Any, Protocol

from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel

from app.clients.spring import SpringClient
from app.graphs.recipe import ENTRY_NODE, GRAPH_VERSION, DraftWriter, RecipeOutcome, build_recipe_graph
from app.models.job import JobErrorCode, JobStatus, JobType
from app.models.recipe import RecipeJobInput

# 작업 종류 → 입력 모델. 접수할 때 이 모델로 검사한다
JOB_INPUTS: dict[JobType, type[BaseModel]] = {
    JobType.RECIPE_DRAFT: RecipeJobInput,
}


@dataclass(frozen=True)
class JobResult:
    status: JobStatus                           # SUCCEEDED · FAILED
    error_code: str | None = None
    suggestion_id: int | None = None


@dataclass(frozen=True)
class JobStart:
    """그래프를 처음 시작할 때 필요한 것."""

    job_id: int
    workflow_key: str
    input: dict[str, Any]


class JobHandler(Protocol):
    entry_node: str                             # 첫 진행 보고에 쓰는 단계
    graph_version: str                          # LangSmith 메타데이터 graphVersion
    trace_tag: str                              # LangSmith 태그 (업무 이름). 예: recipe

    def build_graph(self, checkpointer) -> CompiledStateGraph: ...

    def initial_state(self, start: JobStart) -> dict[str, Any]: ...

    def result(self, state: dict[str, Any]) -> JobResult: ...


class RecipeDraftHandler:
    entry_node = ENTRY_NODE
    graph_version = GRAPH_VERSION
    trace_tag = "recipe"

    def __init__(self, spring: SpringClient, writer: DraftWriter):
        self._spring = spring
        self._writer = writer

    def build_graph(self, checkpointer) -> CompiledStateGraph:
        return build_recipe_graph(self._spring, self._writer, checkpointer=checkpointer)

    def initial_state(self, start: JobStart) -> dict[str, Any]:
        job_input = RecipeJobInput.model_validate(start.input)
        return {"job_id": start.job_id, "workflow_key": start.workflow_key, "menu_name": job_input.menu_name}

    def result(self, state: dict[str, Any]) -> JobResult:
        outcome = state.get("outcome")
        if outcome == RecipeOutcome.SAVED:
            return JobResult(JobStatus.SUCCEEDED, suggestion_id=state["suggestion_id"])
        if outcome == RecipeOutcome.VALIDATION_FAILED:
            return JobResult(JobStatus.FAILED, error_code=JobErrorCode.VALIDATION_FAILED.value)
        if outcome == RecipeOutcome.GENERATION_FAILED:
            return JobResult(JobStatus.FAILED, error_code=JobErrorCode.GENERATION_FAILED.value)
        raise ValueError(f"레시피 그래프가 결과 없이 끝났습니다: {outcome!r}")
