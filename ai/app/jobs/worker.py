"""워커: 등록부에서 작업을 하나씩 받아 그래프를 돌리고, 결과를 Spring 에 보고한다.

한 번 돌 때(run_once) 하는 일
1. 더 시도할 수 없는 작업 정리 (시도 한도 초과 → 실패, 취소 요청 → 취소)
2. 못 보낸 보고 보내기
3. 작업 하나 선점 → 그래프 실행 (단계마다 체크포인트 저장 · 기한 연장 · 취소 확인 · 진행 보고) → 끝내기

재시작 · 재시도: 체크포인트 thread_id 가 jobId 라서, 다시 받은 작업은 마지막으로 끝낸 단계 다음부터 이어 간다.
끝난 단계(LLM 호출 · 제안 저장)를 다시 하지 않는다.
시도 한도 · 기한 · 재시도 간격은 코드가 정한다 (docs/rules/ai.md 한도를 둔다).
"""

import logging
from datetime import timedelta

from langgraph.checkpoint.base import BaseCheckpointSaver

from app.clients.spring import ReportRejected, SpringClient
from app.jobs.handlers import JobHandler, JobStart
from app.jobs.registry import JobRecord, JobRegistry, LeaseLost
from app.models.job import JobErrorCode, JobStatus, JobType

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3                                # 오류 · 워커 중단을 포함해 작업 하나를 받는 최대 횟수
LEASE = timedelta(minutes=5)                    # 단계 하나가 이보다 오래 걸리면 다른 워커가 회수할 수 있다
RETRY_DELAY = timedelta(seconds=10)             # 오류 뒤 다시 받기까지 기다리는 시간 × 시도 횟수


def step_name(node: str) -> str:
    """그래프 노드 이름 → 보고 단계 이름 (Spring ai_job.current_step). 예: validate → VALIDATE"""
    return node.upper()


class _Canceled(Exception):
    pass


class Worker:
    def __init__(
        self,
        registry: JobRegistry,
        handlers: dict[JobType, JobHandler],
        spring: SpringClient,
        checkpointer: BaseCheckpointSaver,
        owner: str,
    ):
        self._registry = registry
        self._handlers = handlers
        self._spring = spring
        self._checkpointer = checkpointer
        self._owner = owner

    def run_once(self) -> bool:
        """작업을 하나 처리했으면 True, 받을 작업이 없었으면 False."""
        for job_id in self._registry.close_abandoned(MAX_ATTEMPTS):
            logger.warning("작업 %s: 더 시도할 수 없어 끝냄", job_id)
        self.deliver_reports()

        job = self._registry.claim(self._owner, LEASE, MAX_ATTEMPTS)
        if job is None:
            return False
        try:
            self._run(job)
        except LeaseLost:
            logger.warning("작업 %s: 기한이 지나 다른 워커에게 넘어감. 이 워커는 손을 뗀다", job.job_id)
        self.deliver_reports()
        return True

    def deliver_reports(self) -> None:
        """못 보낸 보고를 작업마다 seq 순서대로 보낸다. 한 작업에서 전송 오류가 나면 그 작업의 뒤 보고는 다음 차례로 미룬다."""
        blocked: set[int] = set()
        for pending in self._registry.unsent_reports():
            if pending.job_id in blocked:
                continue
            try:
                self._spring.report(pending.job_id, pending.report)
            except ReportRejected:
                # 끝난 작업 · 순서 역전 등: 다시 보내도 같은 답이라 보낸 것으로 친다
                logger.warning("작업 %s 보고 %s: Spring 이 거절", pending.job_id, pending.report.seq)
            except Exception:
                logger.warning("작업 %s 보고 %s: 전송 실패, 다음에 다시 보냄", pending.job_id, pending.report.seq)
                blocked.add(pending.job_id)
                continue
            self._registry.mark_sent(pending.job_id, pending.report.seq)

    # ---------- 작업 하나 ----------

    def _run(self, job: JobRecord) -> None:
        handler = self._handlers[job.job_type]          # 접수 API 가 지원하는 종류만 받는다
        config = {"configurable": {"thread_id": str(job.job_id)}}
        step = step_name(handler.entry_node)

        try:
            graph = handler.build_graph(self._checkpointer)
            # 체크포인트에 남은 다음 단계가 있으면 거기서 이어 간다 (워커 재시작 · 재시도)
            # 그래프가 이미 끝까지 간 작업이면 그래프가 처음 갈림길에서 바로 끝낸다 (LLM · 저장을 다시 하지 않음)
            resume_from = graph.get_state(config).next
            inputs = None if resume_from else handler.initial_state(JobStart(job.job_id, job.workflow_key, job.input))
            if resume_from:
                step = step_name(resume_from[0])
            self._registry.report(job.job_id, self._owner, step)
            self.deliver_reports()

            # durability="sync": 단계마다 체크포인트를 다 쓴 뒤에 다음 단계로 간다 (중간에 죽어도 끝낸 단계는 남는다)
            for update in graph.stream(inputs, config, stream_mode="updates", durability="sync"):
                if self._registry.heartbeat(job.job_id, self._owner, LEASE):
                    raise _Canceled
                next_nodes = graph.get_state(config).next
                if next_nodes:
                    step = step_name(next_nodes[0])
                    self._registry.report(job.job_id, self._owner, step)
                    self.deliver_reports()
                else:
                    step = step_name(next(iter(update)))   # 마지막으로 끝낸 단계

            result = handler.result(graph.get_state(config).values)
        except _Canceled:
            self._registry.finish(job.job_id, self._owner, JobStatus.CANCELED, step)
            logger.info("작업 %s: 취소 요청으로 멈춤", job.job_id)
            return
        except LeaseLost:
            raise
        except Exception:
            self._fail_or_retry(job, step)
            return

        self._registry.finish(
            job.job_id, self._owner, result.status, step, result.error_code, result.suggestion_id
        )
        logger.info("작업 %s: %s", job.job_id, result.status)

    def _fail_or_retry(self, job: JobRecord, step: str) -> None:
        if job.attempts >= MAX_ATTEMPTS:
            logger.exception("작업 %s: %s 단계 오류, 시도 한도를 다 써서 실패로 끝냄", job.job_id, step)
            self._registry.finish(
                job.job_id, self._owner, JobStatus.FAILED, step, JobErrorCode.RETRY_EXHAUSTED.value
            )
        else:
            logger.exception("작업 %s: %s 단계 오류, 나중에 다시 시도 (%s/%s)", job.job_id, step, job.attempts, MAX_ATTEMPTS)
            self._registry.retry_later(job.job_id, self._owner, RETRY_DELAY * job.attempts)
