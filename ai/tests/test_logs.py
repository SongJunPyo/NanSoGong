"""표준 출력 JSON 로그: 한 줄 = JSON 하나, 작업 처리 중에는 jobId · traceId 가 붙는다."""

import io
import json
import logging

import pytest

from app.logs import JsonFormatter, configure_logging, log_context


@pytest.fixture
def capture():
    """JsonFormatter 를 단 로거 하나와, 찍힌 줄을 JSON 으로 읽는 함수."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("test.logs")
    logger.handlers[:] = [handler]
    logger.propagate = False
    logger.setLevel(logging.INFO)

    def lines() -> list[dict]:
        return [json.loads(line) for line in stream.getvalue().splitlines()]

    yield logger, lines
    logger.handlers.clear()


def test_each_line_is_json_with_level_logger_and_message(capture):
    logger, lines = capture

    logger.info("작업 %s 시작", 7)

    [line] = lines()
    assert (line["level"], line["logger"], line["message"]) == ("INFO", "test.logs", "작업 7 시작")
    assert line["time"].endswith("+00:00")
    assert "jobId" not in line and "traceId" not in line


def test_job_and_trace_ids_are_added_inside_log_context(capture):
    logger, lines = capture

    with log_context(job_id=7, trace_id="trace-1"):
        logger.info("처리 중")
    logger.info("끝난 뒤")

    inside, after = lines()
    assert (inside["jobId"], inside["traceId"]) == (7, "trace-1")
    assert "jobId" not in after                                # 구간을 벗어나면 붙지 않는다


def test_extra_ids_on_one_line(capture):
    logger, lines = capture

    logger.info("접수", extra={"job_id": 9})

    assert lines()[0]["jobId"] == 9


def test_exception_is_kept_in_the_same_line(capture):
    logger, lines = capture

    try:
        raise ValueError("깨짐")
    except ValueError:
        logger.exception("오류")

    [line] = lines()
    assert line["message"] == "오류"
    assert "ValueError: 깨짐" in line["exception"]


def test_configure_logging_leaves_one_json_handler_even_if_called_twice():
    root = logging.getLogger()
    saved_handlers, saved_level = root.handlers[:], root.level
    try:
        configure_logging()
        configure_logging()

        assert len(root.handlers) == 1
        assert isinstance(root.handlers[0].formatter, JsonFormatter)
        assert logging.getLogger("uvicorn.access").handlers == []
        assert logging.getLogger("uvicorn.access").propagate is True
    finally:
        root.handlers[:] = saved_handlers
        root.setLevel(saved_level)
