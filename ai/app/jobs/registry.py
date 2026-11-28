"""작업 등록부 (ai.job · ai.job_report). 표 구조: app/db/migrations/0001-create-job-registry.sql

지키는 것
- 같은 jobId 는 한 번만 접수한다. 같은 내용으로 다시 오면 기존 작업을 돌려주고, 내용이 다르면 거절한다.
- 작업 하나는 한 워커만 처리한다. 선점은 FOR UPDATE SKIP LOCKED 로 원자적으로 한다.
- 워커가 죽으면 기한(lease_expires_at)이 지난 뒤 다른 워커가 회수한다. 시도 한도를 넘으면 실패로 끝낸다.
- 처리 · 보고 · 끝내기는 "지금 이 워커가 기한 안에 잡고 있을 때만" 반영한다.
  기한이 지나 다른 워커가 가져간 작업에 늦게 쓰는 일을 막는다 (LeaseLost).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from app.models.job import JobAccept, JobErrorCode, JobReport, JobStatus, JobView, ReportStatus


class JobConflict(Exception):
    """같은 jobId 로 다른 내용(종류 · 업무 키 · 입력)의 작업이 들어왔다."""


class LeaseLost(Exception):
    """이 워커가 더 이상 작업을 잡고 있지 않다 (기한이 지나 회수됐거나 이미 끝남)."""


class JobRecord(JobView):
    """등록부 한 줄. 조회 응답(JobView)에 워커 내부 값을 더한 것."""

    input: dict[str, Any]
    lease_owner: str | None = None
    lease_expires_at: datetime | None = None


@dataclass(frozen=True)
class PendingReport:
    job_id: int
    report: JobReport


class JobRegistry:
    def __init__(self, pool: ConnectionPool):
        self._pool = pool

    # ---------- 접수 · 조회 · 취소 (API) ----------

    def accept(self, request: JobAccept) -> tuple[JobRecord, bool]:
        """(작업, 새로 접수했는지). 같은 jobId 로 내용이 다르면 JobConflict."""
        with self._pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO job (job_id, job_type, workflow_key, input) VALUES (%s, %s, %s, %s)"
                " ON CONFLICT (job_id) DO NOTHING RETURNING *",
                (request.job_id, request.job_type.value, request.workflow_key, Jsonb(request.input)),
            ).fetchone()
            if row is not None:
                return JobRecord.model_validate(row), True
            existing = JobRecord.model_validate(
                conn.execute("SELECT * FROM job WHERE job_id = %s", (request.job_id,)).fetchone()
            )
        same = (existing.job_type, existing.workflow_key, existing.input) == (
            request.job_type,
            request.workflow_key,
            request.input,
        )
        if not same:
            raise JobConflict(request.job_id)
        return existing, False

    def get(self, job_id: int) -> JobRecord | None:
        with self._pool.connection() as conn:
            row = conn.execute("SELECT * FROM job WHERE job_id = %s", (job_id,)).fetchone()
        return JobRecord.model_validate(row) if row else None

    def cancel(self, job_id: int) -> JobRecord | None:
        """아직 받지 않은 작업은 바로 취소, 처리 중이면 취소 요청만 표시 (워커가 단계 사이에서 멈춘다).

        이미 끝난 작업은 그대로 돌려준다 (Spring 이 재시도해도 결과가 같다). 없는 작업이면 None.
        """
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                UPDATE job SET
                  status = CASE WHEN status = 'PENDING' THEN 'CANCELED' ELSE status END,
                  finished_at = CASE WHEN status = 'PENDING' THEN now() ELSE finished_at END,
                  cancel_requested = true,
                  updated_at = now()
                WHERE job_id = %s AND status IN ('PENDING', 'RUNNING')
                RETURNING *
                """,
                (job_id,),
            ).fetchone()
        return JobRecord.model_validate(row) if row else self.get(job_id)

    # ---------- 선점 · 기한 · 끝내기 (워커) ----------

    def claim(self, owner: str, lease: timedelta, max_attempts: int) -> JobRecord | None:
        """처리할 작업 하나를 잡는다: 아직 받지 않은 작업, 또는 기한이 지난 처리 중 작업 (시도 한도 안)."""
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                UPDATE job SET
                  status = 'RUNNING', attempts = attempts + 1, lease_owner = %(owner)s,
                  lease_expires_at = now() + make_interval(secs => %(lease)s), updated_at = now()
                WHERE job_id = (
                  SELECT job_id FROM job
                  WHERE status = 'PENDING'
                     OR (status = 'RUNNING' AND lease_expires_at < now()
                         AND attempts < %(max_attempts)s AND NOT cancel_requested)
                  ORDER BY created_at, job_id
                  LIMIT 1
                  FOR UPDATE SKIP LOCKED
                )
                RETURNING *
                """,
                {"owner": owner, "lease": lease.total_seconds(), "max_attempts": max_attempts},
            ).fetchone()
        return JobRecord.model_validate(row) if row else None

    def heartbeat(self, job_id: int, owner: str, lease: timedelta) -> bool:
        """기한을 연장하고 취소 요청이 있는지 돌려준다. 이 워커가 잡고 있지 않으면 LeaseLost."""
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                UPDATE job SET lease_expires_at = now() + make_interval(secs => %(lease)s), updated_at = now()
                WHERE job_id = %(job_id)s AND status = 'RUNNING' AND lease_owner = %(owner)s
                  AND lease_expires_at >= now()
                RETURNING cancel_requested
                """,
                {"job_id": job_id, "owner": owner, "lease": lease.total_seconds()},
            ).fetchone()
        if row is None:
            raise LeaseLost(job_id)
        return row["cancel_requested"]

    def retry_later(self, job_id: int, owner: str, delay: timedelta) -> None:
        """오류가 난 작업을 delay 뒤에 다시 받을 수 있게 둔다 (기한을 재시도 시각으로 당긴다)."""
        with self._pool.connection() as conn:
            conn.execute(
                """
                UPDATE job SET lease_expires_at = now() + make_interval(secs => %(delay)s), updated_at = now()
                WHERE job_id = %(job_id)s AND status = 'RUNNING' AND lease_owner = %(owner)s
                """,
                {"job_id": job_id, "owner": owner, "delay": delay.total_seconds()},
            )

    def report(self, job_id: int, owner: str, step: str, trace_id: str | None = None) -> None:
        """진행 보고(RUNNING)를 편지함에 넣는다. 이 워커가 잡고 있지 않으면 LeaseLost.

        trace_id: 이번 실행의 LangSmith 루트 실행 ID (추적을 끄면 None).
        """
        with self._pool.connection() as conn, conn.transaction():
            self._lock_owned(conn, job_id, owner)
            self._insert_report(conn, job_id, step, ReportStatus.RUNNING, trace_id=trace_id)

    def finish(
        self,
        job_id: int,
        owner: str,
        status: JobStatus,
        step: str,
        error_code: str | None = None,
        suggestion_id: int | None = None,
        trace_id: str | None = None,
    ) -> None:
        """작업을 끝내고 마지막 보고를 같은 트랜잭션에서 넣는다 (끝났는데 보고가 빠지는 일이 없게).

        취소로 끝낼 때는 보고하지 않는다 (Spring 이 먼저 CANCELED 로 바꿨고, 끝난 작업의 보고는 거절한다).
        """
        with self._pool.connection() as conn, conn.transaction():
            self._lock_owned(conn, job_id, owner)
            conn.execute(
                """
                UPDATE job SET status = %(status)s, error_code = %(error_code)s, finished_at = now(),
                  lease_expires_at = NULL, updated_at = now()
                WHERE job_id = %(job_id)s
                """,
                {"job_id": job_id, "status": status.value, "error_code": error_code},
            )
            if status != JobStatus.CANCELED:
                self._insert_report(
                    conn, job_id, step, ReportStatus(status.value), error_code, suggestion_id, trace_id
                )

    def close_abandoned(self, max_attempts: int) -> list[int]:
        """기한이 지났는데 더 시도할 수 없는 작업을 끝낸다. 끝낸 jobId 목록.

        - 취소 요청이 있던 작업: 취소로 끝낸다 (보고 없음)
        - 시도 한도를 다 쓴 작업: RETRY_EXHAUSTED 실패 + 실패 보고 (단계는 마지막으로 보고한 단계)
        """
        closed: list[int] = []
        with self._pool.connection() as conn, conn.transaction():
            rows = conn.execute(
                """
                UPDATE job SET
                  status = CASE WHEN cancel_requested THEN 'CANCELED' ELSE 'FAILED' END,
                  error_code = CASE WHEN cancel_requested THEN NULL ELSE %(code)s END,
                  finished_at = now(), lease_expires_at = NULL, updated_at = now()
                WHERE job_id IN (
                  SELECT job_id FROM job
                  WHERE status = 'RUNNING' AND lease_expires_at < now()
                    AND (attempts >= %(max_attempts)s OR cancel_requested)
                  FOR UPDATE SKIP LOCKED
                )
                RETURNING job_id, status
                """,
                {"code": JobErrorCode.RETRY_EXHAUSTED.value, "max_attempts": max_attempts},
            ).fetchall()
            for row in rows:
                closed.append(row["job_id"])
                if row["status"] == JobStatus.FAILED:
                    last_step = conn.execute(
                        "SELECT step FROM job_report WHERE job_id = %s ORDER BY seq DESC LIMIT 1", (row["job_id"],)
                    ).fetchone()
                    self._insert_report(
                        conn,
                        row["job_id"],
                        last_step["step"] if last_step else "START",
                        ReportStatus.FAILED,
                        JobErrorCode.RETRY_EXHAUSTED.value,
                    )
        return closed

    # ---------- 보고 편지함 ----------

    def unsent_reports(self, limit: int = 100) -> list[PendingReport]:
        """아직 보내지 못한 보고. 작업마다 seq 순서. 취소된 작업의 보고는 보내지 않는다."""
        with self._pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT r.* FROM job_report r JOIN job j ON j.job_id = r.job_id
                WHERE r.sent_at IS NULL AND j.status <> 'CANCELED'
                ORDER BY r.job_id, r.seq
                LIMIT %s
                """,
                (limit,),
            ).fetchall()
        return [PendingReport(job_id=row["job_id"], report=JobReport.model_validate(row)) for row in rows]

    def mark_sent(self, job_id: int, seq: int) -> None:
        with self._pool.connection() as conn:
            conn.execute("UPDATE job_report SET sent_at = now() WHERE job_id = %s AND seq = %s", (job_id, seq))

    # ---------- 내부 ----------

    @staticmethod
    def _lock_owned(conn, job_id: int, owner: str) -> None:
        row = conn.execute(
            """
            SELECT job_id FROM job
            WHERE job_id = %s AND status = 'RUNNING' AND lease_owner = %s AND lease_expires_at >= now()
            FOR UPDATE
            """,
            (job_id, owner),
        ).fetchone()
        if row is None:
            raise LeaseLost(job_id)

    @staticmethod
    def _insert_report(
        conn,
        job_id: int,
        step: str,
        status: ReportStatus,
        error_code: str | None = None,
        suggestion_id: int | None = None,
        trace_id: str | None = None,
    ) -> None:
        # 다음 순번은 작업 행을 잠근 뒤에 계산한다 (두 보고가 같은 순번을 받지 않게)
        conn.execute(
            """
            INSERT INTO job_report (job_id, seq, step, status, error_code, suggestion_id, langsmith_trace_id)
            VALUES (%(job_id)s, COALESCE((SELECT MAX(seq) FROM job_report WHERE job_id = %(job_id)s), 0) + 1,
                    %(step)s, %(status)s, %(error_code)s, %(suggestion_id)s, %(trace_id)s)
            """,
            {
                "job_id": job_id,
                "step": step,
                "status": status.value,
                "error_code": error_code,
                "suggestion_id": suggestion_id,
                "trace_id": trace_id,
            },
        )

