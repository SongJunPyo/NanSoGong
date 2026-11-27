"""Spring 내부 API HTTP 클라이언트 (가짜 HTTP 응답, 실제 Spring 없음).

응답 예시는 Spring AgentInternalController 의 DTO 모양(PR #56, contracts/recipe-draft/)을 따른다.
"""

import json
from decimal import Decimal

import httpx
import pytest

from app.clients.spring import SpringRejected
from app.clients.spring_http import HttpSpringClient
from app.models.job import JobReport, ReportStatus
from app.models.suggestion import SuggestionSave
from app.security import INTERNAL_TOKEN_HEADER
from tests.fakes import GOOD_DRAFT

CONTEXT_JSON = {
    "items": [
        {"itemId": 2, "name": "우유", "unit": "ML", "unitCost": 2.5, "costSource": "MANUAL"},
        {"itemId": 3, "name": "딸기퓨레", "unit": "ML", "unitCost": None, "costSource": None},
    ],
    "menus": [
        {
            "menuId": 10, "name": "카페라떼", "category": "커피", "price": 4500,
            "recipe": [{"itemId": 2, "itemName": "우유", "unit": "ML", "quantity": 200, "appliesTo": "ALL"}],
        }
    ],
}

VALIDATE_JSON = {
    "valid": True,
    "lines": [
        {"ok": True, "reason": None, "itemId": 2, "normalizedQty": 200.000, "unit": "ML", "unitCost": 2.5},
        {"ok": True, "reason": "NEW_ITEM", "itemId": None, "normalizedQty": 50.000, "unit": "G", "unitCost": None},
    ],
    "reasons": [],
    "totalCost": None,
    "missingCosts": [3],
}


def client_with(handler) -> tuple[HttpSpringClient, list[httpx.Request]]:
    """handler(request) → httpx.Response 로 답하는 클라이언트와, 받은 요청 목록."""
    seen: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    return HttpSpringClient("http://spring:8080/", "s3cret", transport=httpx.MockTransport(record)), seen


def answer(status=200, body=None):
    return lambda request: httpx.Response(status, json=body if body is not None else {})


# ---------- 요청 모양 ----------


def test_every_call_sends_internal_token_under_job_path():
    client, seen = client_with(answer(body=CONTEXT_JSON))

    client.get_recipe_context(7)

    assert seen[0].method == "GET"
    assert seen[0].url == "http://spring:8080/internal/ai-jobs/7/recipe-context"
    assert seen[0].headers[INTERNAL_TOKEN_HEADER] == "s3cret"


def test_draft_is_sent_in_camel_case_with_decimal_as_string():
    client, seen = client_with(answer(body=VALIDATE_JSON))

    client.validate_recipe(7, GOOD_DRAFT)

    sent = json.loads(seen[0].content)
    assert seen[0].url.path == "/internal/ai-jobs/7/recipe-drafts/validate"
    assert sent["menuName"] == "딸기라떼"
    assert sent["lines"][0] == {"itemId": 1, "itemName": "딸기청", "quantity": "40", "unit": "G"}   # Spring 이 문자열 수량을 받는다


def test_report_body():
    client, seen = client_with(answer(body={"jobId": 7, "applied": True, "status": "RUNNING", "lastReportSeq": 1}))

    client.report(7, JobReport(seq=1, step="LOAD_CONTEXT", status=ReportStatus.RUNNING))

    sent = json.loads(seen[0].content)
    assert seen[0].url.path == "/internal/ai-jobs/7/reports"
    assert (sent["seq"], sent["step"], sent["status"]) == (1, "LOAD_CONTEXT", "RUNNING")


# ---------- 응답 읽기 ----------


def test_context_response_is_read_ignoring_extra_fields():
    client, _ = client_with(answer(body=CONTEXT_JSON))

    context = client.get_recipe_context(7)

    assert [i.item_id for i in context.items] == [2, 3]
    assert context.items[0].unit_cost == Decimal("2.5") and context.items[1].unit_cost is None


def test_validation_response_is_read():
    client, _ = client_with(answer(body=VALIDATE_JSON))

    validation = client.validate_recipe(7, GOOD_DRAFT)

    assert validation.valid is True and validation.missing_costs == [3]
    assert validation.lines[1].reason == "NEW_ITEM" and validation.lines[1].item_id is None


def test_saved_suggestion_is_read():
    client, seen = client_with(answer(body={"suggestionId": 500, "version": 2}))
    suggestion = SuggestionSave(workflow_key="MENU:7", suggestion_type="MENU", title="딸기라떼 레시피 초안", payload={}, evidence={})

    saved = client.save_suggestion(7, suggestion)

    assert (saved.suggestion_id, saved.version) == (500, 2)
    assert json.loads(seen[0].content)["suggestionType"] == "MENU"


# ---------- 오류 구분 ----------


@pytest.mark.parametrize("status", [400, 404, 409])
def test_refusals_are_spring_rejected(status):
    client, _ = client_with(answer(status, {"message": "이미 끝난 작업입니다"}))

    with pytest.raises(SpringRejected) as error:
        client.report(7, JobReport(seq=1, step="SAVE", status=ReportStatus.SUCCEEDED))

    assert "이미 끝난" not in str(error.value)                 # 응답 본문은 예외 메시지에 넣지 않는다


@pytest.mark.parametrize("status", [401, 500, 503])
def test_retryable_errors_are_not_rejections(status):
    client, _ = client_with(answer(status))

    with pytest.raises(httpx.HTTPStatusError):
        client.get_recipe_context(7)


def test_connection_error_is_raised_for_retry():
    def refuse(request):
        raise httpx.ConnectError("연결 거부", request=request)

    client, _ = client_with(refuse)

    with pytest.raises(httpx.ConnectError):
        client.get_recipe_context(7)
