"""Python → Spring 내부 API 의 HTTP 구현 (Spring AgentInternalController, PR #56).

- 인증: X-Internal-Token 헤더 = INTERNAL_API_TOKEN (Spring app.internal.token 과 같은 값)
- 요청 JSON 은 camelCase, 금액 · 수량 Decimal 은 문자열("200")로 보낸다 (contracts/recipe-draft/README.md: Spring 이 받음)
- 오류 구분
  - 400 · 404 · 409 → SpringRejected: 다시 보내도 같은 답 (요청 오류 · 없는 작업 · 끝난 작업 · 순서 역전)
  - 401 · 5xx · 연결 오류 · 시간 초과 → httpx 예외 그대로: 토큰 설정이나 일시 장애라 나중에 다시 시도한다
- 요청 · 응답 본문은 예외 메시지 · 로그에 넣지 않는다 (메뉴 · 재료 정보가 섞인다). 방법 · 경로 · 상태 코드만 남긴다
"""

import httpx
from pydantic import BaseModel

from app.clients.spring import SpringRejected
from app.models.job import JobReport
from app.models.recipe import RecipeContext, RecipeDraft, RecipeValidation
from app.models.suggestion import SavedSuggestion, SuggestionSave
from app.security import INTERNAL_TOKEN_HEADER

REJECTED_STATUSES = frozenset({400, 404, 409})
DEFAULT_TIMEOUT = httpx.Timeout(10.0)


class HttpSpringClient:
    def __init__(self, base_url: str, token: str, transport: httpx.BaseTransport | None = None):
        """transport 는 테스트에서 가짜 응답(httpx.MockTransport)을 넣을 때만 쓴다."""
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={INTERNAL_TOKEN_HEADER: token},
            timeout=DEFAULT_TIMEOUT,
            transport=transport,
        )

    def close(self) -> None:
        self._http.close()

    def get_recipe_context(self, job_id: int) -> RecipeContext:
        response = self._send("GET", f"/internal/ai-jobs/{job_id}/recipe-context")
        return RecipeContext.model_validate(response.json())

    def validate_recipe(self, job_id: int, draft: RecipeDraft) -> RecipeValidation:
        response = self._send("POST", f"/internal/ai-jobs/{job_id}/recipe-drafts/validate", draft)
        return RecipeValidation.model_validate(response.json())

    def save_suggestion(self, job_id: int, suggestion: SuggestionSave) -> SavedSuggestion:
        response = self._send("POST", f"/internal/ai-jobs/{job_id}/suggestions", suggestion)
        return SavedSuggestion.model_validate(response.json())

    def report(self, job_id: int, report: JobReport) -> None:
        # 같은 seq 를 다시 보내면 Spring 이 applied=false 로 답한다 (오류 아님). 응답 본문은 쓰지 않는다
        self._send("POST", f"/internal/ai-jobs/{job_id}/reports", report)

    def _send(self, method: str, path: str, body: BaseModel | None = None) -> httpx.Response:
        json = body.model_dump(mode="json") if body is not None else None
        response = self._http.request(method, path, json=json)
        if response.status_code in REJECTED_STATUSES:
            raise SpringRejected(f"{method} {path} → {response.status_code}")
        response.raise_for_status()
        return response
