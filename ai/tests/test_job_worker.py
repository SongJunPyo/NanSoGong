"""워커 흐름 (실제 Postgres 등록부 · 체크포인트 + 가짜 Spring · 가짜 LLM, 실제 모델 호출 없음)."""

import pytest

from app.clients.spring import ReportRejected
from app.jobs.handlers import JobStart, RecipeDraftHandler
from app.jobs.worker import LEASE, MAX_ATTEMPTS, Worker
from app.models.job import JobAccept, JobErrorCode, JobStatus, JobType, ReportStatus
from tests.conftest import expire_lease
from tests.fakes import BAD_DRAFT, GOOD_DRAFT, INVALID, VALID, FakeSpring, FakeWriter


class WorkerCrash(BaseException):
    """프로세스가 죽은 것처럼 워커의 오류 처리를 건너뛰고 빠져나간다 (재시도 처리가 아니라 중단)."""


def accept(registry, job_id=1):
    registry.accept(
        JobAccept(job_id=job_id, job_type=JobType.RECIPE_DRAFT, workflow_key=f"MENU:{job_id}", input={"menuName": "딸기라떼"})
    )


def make_worker(registry, checkpointer, spring, writer, owner="worker-a") -> Worker:
    handlers = {JobType.RECIPE_DRAFT: RecipeDraftHandler(spring, writer)}
    return Worker(registry, handlers, spring, checkpointer, owner)


def sent(spring):
    return [(r.seq, r.step, r.status) for _, r in spring.reports]


# ---------- 흐름 ----------


def test_job_runs_to_saved_suggestion_and_reports_each_step(registry, checkpointer):
    accept(registry)
    spring = FakeSpring([VALID])
    worker = make_worker(registry, checkpointer, spring, FakeWriter([GOOD_DRAFT]))

    assert worker.run_once() is True

    job = registry.get(1)
    assert job.status == JobStatus.SUCCEEDED and job.attempts == 1
    assert sent(spring) == [
        (1, "LOAD_CONTEXT", ReportStatus.RUNNING),
        (2, "GENERATE_DRAFT", ReportStatus.RUNNING),
        (3, "VALIDATE", ReportStatus.RUNNING),
        (4, "SAVE", ReportStatus.RUNNING),
        (5, "SAVE", ReportStatus.SUCCEEDED),
    ]
    assert spring.reports[-1][1].suggestion_id == 500
    assert {job_id for job_id, _ in spring.reports} == {1}
    assert registry.unsent_reports() == []                     # 모두 보냈다


def test_validation_failure_ends_job_as_failed_without_saving(registry, checkpointer):
    accept(registry)
    spring = FakeSpring([INVALID, INVALID, INVALID])
    worker = make_worker(registry, checkpointer, spring, FakeWriter([BAD_DRAFT] * 3))

    worker.run_once()

    job = registry.get(1)
    assert job.status == JobStatus.FAILED and job.error_code == JobErrorCode.VALIDATION_FAILED
    assert spring.saved == []
    last = spring.reports[-1][1]
    assert (last.status, last.error_code) == (ReportStatus.FAILED, "VALIDATION_FAILED")


def test_nothing_to_do_returns_false(registry, checkpointer):
    worker = make_worker(registry, checkpointer, FakeSpring([]), FakeWriter([]))

    assert worker.run_once() is False


def test_same_job_accepted_twice_runs_once(registry, checkpointer):
    accept(registry)
    accept(registry)                                           # Spring 재시도로 같은 접수가 두 번 옴
    spring = FakeSpring([VALID])
    writer = FakeWriter([GOOD_DRAFT])
    worker = make_worker(registry, checkpointer, spring, writer)

    assert worker.run_once() is True
    assert worker.run_once() is False

    assert len(spring.saved) == 1 and len(writer.feedbacks) == 1


# ---------- 오류 · 재시작 ----------


def test_error_is_retried_from_the_failed_step(registry, checkpointer, pool):
    accept(registry)
    spring = FakeSpring([ConnectionError("Spring 503"), VALID])
    writer = FakeWriter([GOOD_DRAFT])
    worker = make_worker(registry, checkpointer, spring, writer)

    worker.run_once()
    job = registry.get(1)
    assert job.status == JobStatus.RUNNING                     # 실패로 끝내지 않고 재시도 대기
    assert worker.run_once() is False                          # 재시도 간격 전에는 다시 받지 않는다

    expire_lease(pool, 1)                                      # 재시도 간격이 지났다
    worker.run_once()

    job = registry.get(1)
    assert job.status == JobStatus.SUCCEEDED and job.attempts == 2
    assert len(writer.feedbacks) == 1                          # 초안(LLM)은 다시 만들지 않고 검증부터 이어 갔다
    assert len(spring.saved) == 1


def test_repeated_errors_end_job_after_max_attempts(registry, checkpointer, pool):
    accept(registry)
    spring = FakeSpring([ConnectionError("Spring 503")] * MAX_ATTEMPTS)
    worker = make_worker(registry, checkpointer, spring, FakeWriter([GOOD_DRAFT]))

    for _ in range(MAX_ATTEMPTS):
        worker.run_once()
        expire_lease(pool, 1)

    job = registry.get(1)
    assert job.status == JobStatus.FAILED and job.error_code == JobErrorCode.RETRY_EXHAUSTED
    last = spring.reports[-1][1]
    assert (last.status, last.step, last.error_code) == (ReportStatus.FAILED, "VALIDATE", "RETRY_EXHAUSTED")
    assert spring.saved == []


def test_job_resumes_from_checkpoint_after_worker_dies(registry, checkpointer, pool):
    accept(registry)
    writer = FakeWriter([GOOD_DRAFT])
    dying = make_worker(registry, checkpointer, FakeSpring([WorkerCrash()]), writer, owner="worker-a")

    with pytest.raises(WorkerCrash):
        dying.run_once()                                       # 검증 도중 워커 프로세스가 죽었다
    expire_lease(pool, 1)                                      # 기한이 지나 회수할 수 있게 됐다

    spring = FakeSpring([VALID])
    restarted = make_worker(registry, checkpointer, spring, writer, owner="worker-b")
    restarted.run_once()

    job = registry.get(1)
    assert job.status == JobStatus.SUCCEEDED and job.attempts == 2 and job.lease_owner == "worker-b"
    assert len(writer.feedbacks) == 1                          # 끝낸 단계(초안 생성)는 다시 하지 않았다
    assert len(spring.saved) == 1
    assert spring.reports[0][1].step == "VALIDATE"             # 이어 가는 단계부터 보고한다


def test_worker_dying_after_graph_end_does_not_save_twice(registry, checkpointer, pool):
    accept(registry)
    spring = FakeSpring([VALID])
    writer = FakeWriter([GOOD_DRAFT])                          # 초안은 한 번 분량만 준비
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    # worker-a 가 그래프를 끝까지 돌리고(제안 저장까지) 등록부에 끝 표시를 하기 직전에 죽었다
    handler = RecipeDraftHandler(spring, writer)
    handler.build_graph(checkpointer).invoke(
        handler.initial_state(JobStart(1, "MENU:1", {"menuName": "딸기라떼"})), {"configurable": {"thread_id": "1"}}
    )
    expire_lease(pool, 1)

    make_worker(registry, checkpointer, spring, writer, owner="worker-b").run_once()

    job = registry.get(1)
    assert job.status == JobStatus.SUCCEEDED
    assert spring.reports[-1][1].suggestion_id == 500          # 체크포인트에 남은 결과로 끝낸다
    assert len(spring.saved) == 1 and len(writer.feedbacks) == 1   # 저장 · LLM 을 다시 하지 않았다


def test_cancel_during_run_stops_before_saving(registry, checkpointer):
    accept(registry)

    class CancelingSpring(FakeSpring):
        def validate_recipe(self, job_id, draft):
            registry.cancel(job_id)                            # 검증 중에 사장님이 취소함
            return super().validate_recipe(job_id, draft)

    spring = CancelingSpring([VALID])
    worker = make_worker(registry, checkpointer, spring, FakeWriter([GOOD_DRAFT]))

    worker.run_once()

    assert registry.get(1).status == JobStatus.CANCELED
    assert spring.saved == []                                  # 다음 단계(저장)로 가지 않았다
    assert all(r.status == ReportStatus.RUNNING for _, r in spring.reports)   # 취소는 보고하지 않는다


# ---------- 보고 전송 ----------


def test_failed_report_is_resent_in_order(registry, checkpointer):
    accept(registry)
    spring = FakeSpring([VALID])
    spring.report_errors = [ConnectionError("Spring 꺼짐")] * 5    # 보고 5번 모두 전송 실패
    worker = make_worker(registry, checkpointer, spring, FakeWriter([GOOD_DRAFT]))

    worker.run_once()
    assert registry.get(1).status == JobStatus.SUCCEEDED       # 보고가 안 가도 작업은 끝난다
    assert spring.reports == []

    worker.deliver_reports()                                   # Spring 이 돌아온 뒤

    assert [seq for seq, _, _ in sent(spring)] == [1, 2, 3, 4, 5]   # 빠짐없이 순서대로


def test_rejected_report_is_not_resent(registry, checkpointer):
    accept(registry)
    spring = FakeSpring([VALID])
    spring.report_errors = [ReportRejected("끝난 작업")]
    worker = make_worker(registry, checkpointer, spring, FakeWriter([GOOD_DRAFT]))

    worker.run_once()

    assert [seq for seq, _, _ in sent(spring)] == [2, 3, 4, 5]     # 1번은 거절돼 다시 보내지 않았다
    assert registry.unsent_reports() == []
