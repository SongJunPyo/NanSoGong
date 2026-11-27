"""워커 실행 명령 (python -m app.worker): 설정 확인 · 반복 · 조립. 실제 Claude · Spring 호출 없음."""

import threading

from pydantic import SecretStr

from app.config import Settings
from app.jobs.worker import Worker
from app.worker import build_worker, missing_settings, run_forever


def test_missing_settings_are_listed_by_name():
    settings = Settings(spring_base_url="http://app:8080", anthropic_api_key=SecretStr("sk-test"))

    assert missing_settings(settings) == ["AI_DATABASE_URL", "INTERNAL_API_TOKEN"]


class ScriptedWorker:
    """run_once 가 차례로 돌려줄 값(예외면 던짐)을 정해 둔 가짜 워커. 다 쓰면 멈춘다."""

    def __init__(self, results, stop: threading.Event):
        self._results = list(results)
        self._stop = stop
        self.calls = 0

    def run_once(self) -> bool:
        self.calls += 1
        result = self._results.pop(0)
        if not self._results:
            self._stop.set()
        if isinstance(result, Exception):
            raise result
        return result


def test_loop_keeps_going_after_errors_until_stopped():
    stop = threading.Event()
    worker = ScriptedWorker([True, ConnectionError("DB 꺼짐"), False, True], stop)

    run_forever(worker, stop, idle_seconds=0, error_seconds=0)

    assert worker.calls == 4                                   # 오류가 나도 워커가 죽지 않았다


def test_loop_does_not_start_when_already_stopped():
    stop = threading.Event()
    stop.set()
    worker = ScriptedWorker([True], stop)

    run_forever(worker, stop)

    assert worker.calls == 0


def test_build_worker_wires_parts_without_calling_outside(ai_db_url):
    settings = Settings(
        ai_database_url=SecretStr(ai_db_url),
        spring_base_url="http://spring.invalid:8080",
        internal_api_token=SecretStr("s3cret"),
        anthropic_api_key=SecretStr("sk-test-not-used"),
    )

    worker, close = build_worker(settings)
    try:
        assert isinstance(worker, Worker)
        assert worker.run_once() is False                      # 등록부가 비어 있으면 Spring · Claude 를 부르지 않는다
    finally:
        close()
