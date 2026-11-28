"""LangSmith 추적: 민감정보 지우기 · 루트 실행 ID 를 Spring 보고에 싣기 (네트워크 없음, 가짜 Client 가 요청을 기록).

실제 LangSmith 서버로 보내는 것은 여기서 확인하지 않는다.
"""

import json
from decimal import Decimal

import pytest
from langsmith import Client
from pydantic import SecretStr

from app.config import Settings
from app.jobs.handlers import RecipeDraftHandler
from app.jobs.worker import Worker
from app.models.job import JobAccept, JobType
from app.models.recipe import ContextItem, RecipeContext
from app.tracing import REDACTED, Tracing, make_client, mask, tracing_from_settings
from app.worker import missing_settings
from tests.fakes import GOOD_DRAFT, VALID, FakeSpring, FakeWriter

PHONE = "010-1234-5678"
FAKE_API_KEY = "lsv2_pt_fake_key_for_test"


# ---------- mask: 키 이름으로 지우기 ----------


def test_mask_removes_values_under_sensitive_keys_in_any_spelling():
    data = {
        "password": "p",
        "apiKey": "k",
        "api_key": "k",
        "Authorization": "Bearer x",
        "phoneNumber": "p",
        "businessNumber": "b",
        "deliveryAddress": "d",
        "refresh_token": "t",
        "nested": [{"cookie": "c", "menuName": "딸기라떼"}],
    }

    masked = mask(data)

    for key in ("password", "apiKey", "api_key", "Authorization", "phoneNumber", "businessNumber",
                "deliveryAddress", "refresh_token"):
        assert masked[key] == REDACTED, key
    assert masked["nested"] == [{"cookie": REDACTED, "menuName": "딸기라떼"}]


def test_mask_drops_auth_section_and_secret_prefixed_keys_whole():
    masked = mask({"auth": {"otp": "123456", "loginId": "owner"}, "secret_session": {"a": 1}, "step": "ORDER"})

    assert masked == {"auth": REDACTED, "secret_session": REDACTED, "step": "ORDER"}


# ---------- mask: 글 속에서 지우기 ----------


def test_mask_removes_personal_info_and_keys_inside_text():
    text = (
        f"사장님 {PHONE} / 01098765432 / 사업자 123-45-67890 / owner@example.com"
        " / sk-ant-api03-abcDEF / Bearer abc.def / lsv2_pt_abc"
    )

    masked = mask({"content": text})["content"]

    for leaked in (PHONE, "01098765432", "123-45-67890", "owner@example.com", "sk-ant-api03", "abc.def", "lsv2_pt"):
        assert leaked not in masked, leaked
    assert masked.startswith("사장님 [REDACTED_PHONE]")


def test_mask_keeps_business_values_needed_for_debugging():
    data = {"menuName": "딸기라떼", "lines": [{"itemId": 1, "quantity": Decimal("40.5"), "unit": "G"}], "valid": True}

    masked = mask(data)

    assert masked == {"menuName": "딸기라떼", "lines": [{"itemId": 1, "quantity": "40.5", "unit": "G"}], "valid": True}


def test_mask_does_not_change_the_original():
    data = {"password": "p", "items": [{"phone": PHONE}]}

    mask(data)

    assert data == {"password": "p", "items": [{"phone": PHONE}]}


def test_mask_reads_pydantic_models_as_json():
    item = ContextItem(item_id=1, name=f"딸기청 {PHONE}", unit="G")

    assert mask(item) == {"itemId": 1, "name": "딸기청 [REDACTED_PHONE]", "unit": "G", "unitCost": None}


# ---------- 켜기 · 끄기 ----------


def test_tracing_is_off_by_default_and_adds_nothing():
    tracing = tracing_from_settings(Settings())

    run = tracing.start(name="RECIPE_DRAFT", tags=["recipe"], metadata={"jobId": 1})

    assert tracing.enabled is False
    assert run.trace_id is None and run.config == {}


def test_tracing_turns_on_with_settings():
    settings = Settings(langsmith_tracing=True, langsmith_api_key=SecretStr(FAKE_API_KEY))

    assert tracing_from_settings(settings).enabled is True


def test_worker_needs_langsmith_key_only_when_tracing_is_on():
    base = dict(
        ai_database_url=SecretStr("postgresql://x"),
        spring_base_url="http://app:8080",
        internal_api_token=SecretStr("t"),
        anthropic_api_key=SecretStr("sk-test"),
    )

    assert missing_settings(Settings(**base)) == []
    assert missing_settings(Settings(**base, langsmith_tracing=True)) == ["LANGSMITH_API_KEY"]


# ---------- 워커 흐름: 실제 등록부 + 가짜 Spring · 가짜 LLM · 가짜 LangSmith ----------


class RecordingClient(Client):
    """LangSmith 로 보내는 요청을 네트워크 대신 기록한다. 민감정보 지우기는 실제 Client 그대로 돈다."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.sent: list[dict] = []

    def request_with_retries(self, method, pathname, *args, **kwargs):
        body = (kwargs.get("request_kwargs") or {}).get("data")
        if isinstance(body, (bytes, bytearray)):
            body = body.decode("utf-8")
        if body:
            self.sent.append(json.loads(body))

        class Ok:
            status_code = 200

            def json(self):
                return {}

            def raise_for_status(self):
                return None

        return Ok()


@pytest.fixture
def recording(monkeypatch) -> tuple[Tracing, RecordingClient]:
    """make_client 가 만드는 Client(민감정보 지우기 설정 그대로)를 기록용으로 바꿔 끼운다."""
    monkeypatch.setattr("app.tracing.Client", RecordingClient)
    client = make_client(FAKE_API_KEY, api_url="http://langsmith.invalid", auto_batch_tracing=False)
    return Tracing(client, "nansogong-test"), client


class SpringWithPersonalInfo(FakeSpring):
    """품목 이름에 전화번호가 섞여 온 매장 (추적에 남으면 안 된다)."""

    def get_recipe_context(self, job_id: int) -> RecipeContext:
        context = super().get_recipe_context(job_id)
        first = context.items[0].model_copy(update={"name": f"딸기청 (거래처 {PHONE})"})
        return context.model_copy(update={"items": [first, *context.items[1:]]})


def run_traced_job(registry, checkpointer, tracing):
    registry.accept(
        JobAccept(job_id=7, job_type=JobType.RECIPE_DRAFT, workflow_key="MENU:7", input={"menuName": "딸기라떼"})
    )
    spring = SpringWithPersonalInfo([VALID])
    handlers = {JobType.RECIPE_DRAFT: RecipeDraftHandler(spring, FakeWriter([GOOD_DRAFT]))}
    worker = Worker(registry, handlers, spring, checkpointer, "worker-a", tracing)
    worker.run_once()
    tracing.flush()
    return spring


def test_root_run_id_is_reported_to_spring_and_saved_with_suggestion(registry, checkpointer, recording):
    tracing, client = recording

    spring = run_traced_job(registry, checkpointer, tracing)

    trace_ids = {report.langsmith_trace_id for _, report in spring.reports}
    assert len(trace_ids) == 1 and None not in trace_ids          # 모든 보고에 같은 실행 ID
    trace_id = trace_ids.pop()
    assert spring.saved[0].langsmith_trace_id == trace_id
    root = [run for run in client.sent if run.get("id") == trace_id and run.get("parent_run_id") is None]
    assert root, "루트 실행이 LangSmith 로 가지 않았다"


def test_root_run_carries_tag_and_job_metadata(registry, checkpointer, recording):
    tracing, client = recording

    spring = run_traced_job(registry, checkpointer, tracing)

    trace_id = spring.reports[0][1].langsmith_trace_id
    root = next(run for run in client.sent if run.get("id") == trace_id and run.get("tags"))
    assert root["name"] == "RECIPE_DRAFT"
    assert root["tags"] == ["recipe"]
    metadata = root["extra"]["metadata"]
    assert (metadata["jobId"], metadata["workflowKey"], metadata["graphVersion"]) == (7, "MENU:7", "recipe-draft/3")


def test_nothing_sensitive_reaches_langsmith(registry, checkpointer, recording, monkeypatch):
    monkeypatch.setenv("LANGSMITH_API_KEY", FAKE_API_KEY)          # 환경변수가 실행 정보로 딸려 가지 않는지도 본다
    tracing, client = recording

    run_traced_job(registry, checkpointer, tracing)

    sent = json.dumps(client.sent, ensure_ascii=False)
    assert "딸기청" in sent                                        # 노드 입출력이 실제로 추적됐다
    assert PHONE not in sent
    assert "[REDACTED_PHONE]" in sent
    assert FAKE_API_KEY not in sent


def test_reports_have_no_trace_id_when_tracing_is_off(registry, checkpointer):
    spring = run_traced_job(registry, checkpointer, Tracing())

    assert {report.langsmith_trace_id for _, report in spring.reports} == {None}
    assert spring.saved[0].langsmith_trace_id is None
