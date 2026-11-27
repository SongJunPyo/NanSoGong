"""Python → Spring 내부 API 약속 (#34 ② · #35).

여기에는 "어떤 함수가 있어야 하는가" 만 적는다 (Protocol = 인터페이스).
실제 HTTP 호출 구현은 Spring 내부 API 가 생기면 추가한다. 그 전까지는 테스트의 가짜 구현을 쓴다.
모든 호출은 jobId(Spring ai_job_id) 기준이다. 매장 · 사용자는 Spring 이 ai_job 행에서 정한다 (요청 본문 값을 믿지 않음).
"""

from typing import Protocol

from app.models.job import JobReport
from app.models.recipe import RecipeContext, RecipeDraft, RecipeValidation
from app.models.suggestion import SavedSuggestion, SuggestionSave


class ReportRejected(Exception):
    """Spring 이 보고를 받지 않겠다고 답했다 (끝난 작업 · 순서 역전 · 없는 작업).

    다시 보내도 결과가 같으므로 재전송하지 않는다. 네트워크 오류 · 5xx 는 이 예외가 아니다 (다시 보낸다).
    """


class SpringClient(Protocol):
    def get_recipe_context(self, job_id: int) -> RecipeContext:
        """GET /internal/ai-jobs/{jobId}/recipe-context"""
        ...

    def validate_recipe(self, job_id: int, draft: RecipeDraft) -> RecipeValidation:
        """POST /internal/ai-jobs/{jobId}/recipe-drafts/validate"""
        ...

    def save_suggestion(self, job_id: int, suggestion: SuggestionSave) -> SavedSuggestion:
        """POST /internal/ai-jobs/{jobId}/suggestions"""
        ...

    def report(self, job_id: int, report: JobReport) -> None:
        """POST /internal/ai-jobs/{jobId}/reports. 거절이면 ReportRejected"""
        ...
