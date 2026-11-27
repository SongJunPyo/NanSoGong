"""Python → Spring 내부 API 약속 (#34 ② · #35).

여기에는 "어떤 함수가 있어야 하는가" 만 적는다 (Protocol = 인터페이스).
실제 HTTP 호출 구현은 Spring 내부 API 가 생기면 추가한다. 그 전까지는 테스트의 가짜 구현을 쓴다.
모든 호출은 jobId 기준이다. 매장 · 사용자는 Spring 이 ai_job 행에서 정한다 (요청 본문 값을 믿지 않음).
"""

from typing import Protocol

from app.models.recipe import RecipeContext, RecipeDraft, RecipeValidation
from app.models.suggestion import SavedSuggestion, SuggestionSave


class SpringClient(Protocol):
    def get_recipe_context(self, job_id: str) -> RecipeContext:
        """GET /internal/ai-jobs/{jobId}/recipe-context"""
        ...

    def validate_recipe(self, job_id: str, draft: RecipeDraft) -> RecipeValidation:
        """POST /internal/ai-jobs/{jobId}/recipe-drafts/validate"""
        ...

    def save_suggestion(self, job_id: str, suggestion: SuggestionSave) -> SavedSuggestion:
        """POST /internal/ai-jobs/{jobId}/suggestions"""
        ...
