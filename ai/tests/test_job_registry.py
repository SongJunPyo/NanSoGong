"""작업 등록부 (실제 Postgres 17, testcontainers): 표 생성 · 접수 중복 · 선점 · 기한 · 취소 · 보고 순번."""

import threading
from datetime import timedelta

import pytest

from app.db.migrate import migrate
from app.jobs.registry import JobConflict, LeaseLost
from app.models.job import JobAccept, JobErrorCode, JobStatus, JobType, ReportStatus
from tests.conftest import expire_lease

LEASE = timedelta(minutes=5)
MAX_ATTEMPTS = 3


def accept(registry, job_id=1, menu_name="딸기라떼"):
    request = JobAccept(
        job_id=job_id, job_type=JobType.RECIPE_DRAFT, workflow_key=f"MENU:{job_id}", input={"menuName": menu_name}
    )
    return registry.accept(request)


def reports(registry):
    return [(p.job_id, p.report) for p in registry.unsent_reports()]


# ---------- 표 생성 (배포 명령) ----------


def test_migrate_twice_applies_nothing_new(ai_db_url):
    assert migrate(ai_db_url) == []                             # 이미 적용된 파일은 다시 적용하지 않는다


def test_tables_are_only_in_ai_schema(pool):
    with pool.connection() as conn:
        rows = conn.execute(
            "SELECT table_schema, table_name FROM information_schema.tables"
            " WHERE table_schema NOT IN ('pg_catalog', 'information_schema')"
        ).fetchall()

    assert {r["table_schema"] for r in rows} == {"ai"}          # 업무 스키마(public)에 표를 만들지 않는다
    assert {"job", "job_report", "registry_migration", "checkpoints"} <= {r["table_name"] for r in rows}


# ---------- 접수 ----------


def test_same_job_id_is_accepted_once(registry):
    first, created = accept(registry)
    again, created_again = accept(registry)

    assert created is True and created_again is False
    assert again.job_id == first.job_id and again.status == JobStatus.PENDING
    assert again.created_at == first.created_at                # 새 행을 만들지 않았다


def test_same_job_id_with_different_input_is_rejected(registry):
    accept(registry, menu_name="딸기라떼")

    with pytest.raises(JobConflict):
        accept(registry, menu_name="바닐라라떼")


# ---------- 선점 · 기한 ----------


def test_job_is_claimed_by_one_worker_only(registry):
    accept(registry)

    first = registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    second = registry.claim("worker-b", LEASE, MAX_ATTEMPTS)

    assert first.status == JobStatus.RUNNING and first.attempts == 1 and first.lease_owner == "worker-a"
    assert second is None


def test_concurrent_claims_get_one_job_once(registry):
    accept(registry)
    barrier = threading.Barrier(4)
    claimed = []

    def claim(name):
        barrier.wait()                                          # 네 워커가 동시에 선점을 시도한다
        claimed.append(registry.claim(name, LEASE, MAX_ATTEMPTS))

    threads = [threading.Thread(target=claim, args=(f"worker-{i}",)) for i in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len([c for c in claimed if c is not None]) == 1


def test_expired_job_is_taken_over_and_old_worker_is_locked_out(registry, pool):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    expire_lease(pool, 1)                                       # worker-a 가 죽었다

    taken = registry.claim("worker-b", LEASE, MAX_ATTEMPTS)

    assert taken.lease_owner == "worker-b" and taken.attempts == 2
    # 늦게 깨어난 worker-a 는 진행 · 보고 · 끝내기를 하지 못한다
    with pytest.raises(LeaseLost):
        registry.heartbeat(1, "worker-a", LEASE)
    with pytest.raises(LeaseLost):
        registry.report(1, "worker-a", "VALIDATE")
    with pytest.raises(LeaseLost):
        registry.finish(1, "worker-a", JobStatus.SUCCEEDED, "SAVE", suggestion_id=500)
    assert registry.get(1).status == JobStatus.RUNNING


def test_job_out_of_attempts_is_not_claimed_but_closed_as_failed(registry, pool):
    accept(registry)
    for attempt in range(MAX_ATTEMPTS):
        registry.claim(f"worker-{attempt}", LEASE, MAX_ATTEMPTS)
        if attempt == 0:
            registry.report(1, "worker-0", "VALIDATE")
        expire_lease(pool, 1)

    assert registry.claim("worker-x", LEASE, MAX_ATTEMPTS) is None
    assert registry.close_abandoned(MAX_ATTEMPTS) == [1]

    job = registry.get(1)
    assert job.status == JobStatus.FAILED and job.error_code == JobErrorCode.RETRY_EXHAUSTED
    last = reports(registry)[-1][1]
    assert (last.status, last.step, last.error_code) == (ReportStatus.FAILED, "VALIDATE", "RETRY_EXHAUSTED")


# ---------- 취소 ----------


def test_cancel_pending_job_ends_it_at_once(registry):
    accept(registry)

    canceled = registry.cancel(1)

    assert canceled.status == JobStatus.CANCELED and canceled.finished_at is not None
    assert registry.claim("worker-a", LEASE, MAX_ATTEMPTS) is None


def test_cancel_running_job_is_seen_by_its_worker(registry):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)

    marked = registry.cancel(1)

    assert marked.status == JobStatus.RUNNING and marked.cancel_requested is True
    assert registry.heartbeat(1, "worker-a", LEASE) is True        # 워커가 다음 단계 전에 알게 된다


def test_cancel_finished_job_changes_nothing(registry):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    registry.finish(1, "worker-a", JobStatus.SUCCEEDED, "SAVE", suggestion_id=500)

    assert registry.cancel(1).status == JobStatus.SUCCEEDED
    assert registry.cancel(999) is None


def test_canceled_while_worker_dead_is_closed_as_canceled(registry, pool):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    registry.cancel(1)
    expire_lease(pool, 1)

    assert registry.close_abandoned(MAX_ATTEMPTS) == [1]
    assert registry.get(1).status == JobStatus.CANCELED


# ---------- 보고 편지함 ----------


def test_reports_get_increasing_seq_and_final_report_with_finish(registry):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)

    registry.report(1, "worker-a", "LOAD_CONTEXT")
    registry.report(1, "worker-a", "VALIDATE")
    registry.finish(1, "worker-a", JobStatus.SUCCEEDED, "SAVE", suggestion_id=500)

    sent = [r for _, r in reports(registry)]
    assert [r.seq for r in sent] == [1, 2, 3]
    assert [r.status for r in sent] == [ReportStatus.RUNNING, ReportStatus.RUNNING, ReportStatus.SUCCEEDED]
    assert sent[-1].suggestion_id == 500
    assert registry.get(1).finished_at is not None


def test_sent_report_is_not_listed_again(registry):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    registry.report(1, "worker-a", "LOAD_CONTEXT")

    registry.mark_sent(1, 1)

    assert reports(registry) == []


def test_reports_of_canceled_job_are_not_sent(registry):
    accept(registry)
    registry.claim("worker-a", LEASE, MAX_ATTEMPTS)
    registry.report(1, "worker-a", "LOAD_CONTEXT")
    registry.cancel(1)
    registry.finish(1, "worker-a", JobStatus.CANCELED, "LOAD_CONTEXT")

    assert reports(registry) == []                              # Spring 은 끝난 작업의 보고를 거절한다
