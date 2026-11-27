"""Spring 에 저장을 요청하는 제안 (suggestion 표, #35 초안 계약)."""

from typing import Any

from app.models.base import CamelModel


class SuggestionSave(CamelModel):
    workflow_key: str
    suggestion_type: str                        # MENU · PURCHASE · COUPON …
    title: str
    summary: str | None = None
    payload: dict[str, Any]                     # 최종 제안 내용 (레시피면 초안)
    evidence: dict[str, Any]                    # 근거 (레시피면 Spring 검증 결과)
    generation_context: dict[str, Any] | None = None
    langsmith_trace_id: str | None = None


class SavedSuggestion(CamelModel):
    suggestion_id: int
    version: int
