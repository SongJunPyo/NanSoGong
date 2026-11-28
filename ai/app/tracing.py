"""LangSmith 추적 (#36, docs/rules/ai.md 프롬프트 · 추적 · 비용).

- 켜고 끄기: LANGSMITH_TRACING (기본 꺼짐). pytest · CI 에서는 끈다 (tests/conftest.py).
- 환경별 프로젝트: LANGSMITH_PROJECT (예: nansogong-local · nansogong-dev).
- 민감정보: 공용 Client(hide_inputs · hide_outputs = mask) 하나로 보내기 전에 지운다.
  실행 환경 정보(OS · 환경변수 등)도 보내지 않는다 (omit_traced_runtime_info).
- 작업 한 번 실행 = 루트 실행 하나. 루트 실행 ID 를 여기서 정해(run_id) Spring 보고의 langsmithTraceId 로 보낸다.
  재시도 · 재시작하면 새 루트 실행이 생기고, Spring ai_job 에는 마지막 실행 ID 가 남는다.
- 인증 구간 제외 틀: 입력 · 출력 · 상태의 `auth` 키나 `secret_` 로 시작하는 키는 값을 통째로 뺀다.
  로그인 · 결제 인증 단계(#40)는 그 값을 이 키 아래에 둔다. 추가 인증 중에는 그래프를 멈추므로(interrupt) 추적도 멈춘다.
"""

import dataclasses
import re
import uuid
from dataclasses import dataclass, field
from typing import Any

from langchain_core.tracers import LangChainTracer
from langsmith import Client
from pydantic import BaseModel

from app.config import Settings

REDACTED = "[REDACTED]"
TRACE_ID_KEY = "langsmith_trace_id"             # 그래프 config["configurable"] 에서 이번 실행의 루트 실행 ID 를 찾는 키

# 값을 통째로 지우는 키. 비교할 때 '_' · '-' 를 빼고 소문자로 맞춘다 (api_key · apiKey · API-KEY 모두 같다)
_SENSITIVE_KEYS = frozenset({
    # 인증 · 세션
    "password", "passwd", "pwd", "secret", "token", "accesstoken", "refreshtoken", "apikey",
    "authorization", "cookie", "cookies", "session", "sessionid", "otp", "authcode", "verificationcode",
    # 결제
    "cardnumber", "cardno", "cvc", "cvv",
    # 개인정보 (이름 · 전화번호 · 사업자번호 · 배송지 · 이메일)
    "phone", "phonenumber", "mobile", "tel", "email",
    "businessnumber", "businessregistrationnumber", "bizno",
    "address", "deliveryaddress", "shippingaddress", "receiveraddress",
    "ownername", "membername", "receivername", "recipientname",
})
_SENSITIVE_SUFFIXES = ("password", "token", "apikey", "secret")
_EXCLUDED_KEYS = frozenset({"auth"})            # 인증 구간 값 (위 '인증 구간 제외 틀')
_EXCLUDED_PREFIX = "secret_"

# 키 이름과 상관없이 글 속에서 지우는 모양
_SENSITIVE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"sk-ant-[A-Za-z0-9_\-]+"), "[REDACTED_KEY]"),
    (re.compile(r"lsv2_[A-Za-z0-9_]+"), "[REDACTED_KEY]"),
    (re.compile(r"(?i)bearer\s+[A-Za-z0-9._\-]+"), "Bearer [REDACTED]"),
    (re.compile(r"(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)"), "[REDACTED_PHONE]"),
    (re.compile(r"(?<!\d)\d{3}-\d{2}-\d{5}(?!\d)"), "[REDACTED_BIZNO]"),
    (re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"), "[REDACTED_EMAIL]"),
)


def _is_sensitive_key(key: object) -> bool:
    if not isinstance(key, str):
        return False
    lowered = key.lower()
    if lowered in _EXCLUDED_KEYS or lowered.startswith(_EXCLUDED_PREFIX):
        return True
    normalized = lowered.replace("_", "").replace("-", "")
    return normalized in _SENSITIVE_KEYS or normalized.endswith(_SENSITIVE_SUFFIXES)


def _mask_text(text: str) -> str:
    for pattern, replacement in _SENSITIVE_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def mask(data: Any) -> Any:
    """추적에 보내기 전에 민감정보를 지운 복사본을 돌려준다. 원본은 바꾸지 않는다."""
    if isinstance(data, dict):
        return {key: REDACTED if _is_sensitive_key(key) else mask(value) for key, value in data.items()}
    if isinstance(data, (list, tuple)):
        return [mask(value) for value in data]
    if isinstance(data, str):
        return _mask_text(data)
    if data is None or isinstance(data, (bool, int, float)):
        return data
    if isinstance(data, BaseModel):
        return mask(data.model_dump(mode="json"))
    if dataclasses.is_dataclass(data) and not isinstance(data, type):
        return mask(dataclasses.asdict(data))
    # 모르는 객체(Decimal · datetime 등)는 글로 바꿔서 검사한다 (그대로 보내면 안에 든 글을 못 지운다)
    return _mask_text(str(data))


def make_client(api_key: str, **kwargs: Any) -> Client:
    """민감정보를 지우고 보내는 LangSmith 클라이언트. 서비스 전체에서 하나만 만든다."""
    return Client(api_key=api_key, hide_inputs=mask, hide_outputs=mask, omit_traced_runtime_info=True, **kwargs)


@dataclass(frozen=True)
class TraceRun:
    """작업 한 번 실행의 추적 설정. 추적을 끄면 trace_id 는 None, config 는 비어 있다."""

    trace_id: str | None = None
    config: dict[str, Any] = field(default_factory=dict)


class Tracing:
    """작업 실행을 LangSmith 에 남길지와, 남길 때 쓸 설정을 만든다. client 가 없으면 꺼진 상태다."""

    def __init__(self, client: Client | None = None, project: str = "nansogong-local"):
        self._client = client
        self._project = project

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def start(self, *, name: str, tags: list[str], metadata: dict[str, Any]) -> TraceRun:
        """그래프 실행 config 에 합칠 값. 루트 실행 ID(run_id)를 미리 정해 두고 그것을 trace_id 로 쓴다."""
        if self._client is None:
            return TraceRun()
        run_id = uuid.uuid4()
        tracer = LangChainTracer(project_name=self._project, client=self._client)
        return TraceRun(
            trace_id=str(run_id),
            config={"run_id": run_id, "run_name": name, "tags": tags, "metadata": metadata, "callbacks": [tracer]},
        )

    def flush(self) -> None:
        """아직 보내지 못한 추적을 보낸다 (워커를 끝낼 때)."""
        if self._client is not None:
            self._client.flush()


def tracing_from_settings(settings: Settings) -> Tracing:
    if not settings.langsmith_tracing:
        return Tracing()
    return Tracing(make_client(settings.langsmith_api_key.get_secret_value()), settings.langsmith_project)
