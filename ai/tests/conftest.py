"""DB 가 필요한 테스트(작업 등록부 · 체크포인트)용 Postgres 17 컨테이너 (testcontainers).

인프라 초기화 스크립트가 할 일(Python 전용 계정 · 그 계정이 소유한 ai 스키마)을 흉내 낸 뒤,
배포 명령과 같은 migrate() 로 표를 만든다. 테스트마다 표를 비운다.

Docker 가 없으면 내 PC 에서는 DB 테스트만 건너뛴다. CI(CI=true) 에서는 건너뛰지 않고 실패한다.
"""

import os

import psycopg
import pytest
from langgraph.checkpoint.postgres import PostgresSaver

from app.db.migrate import migrate
from app.db.pool import make_pool
from app.jobs.registry import JobRegistry

AI_USER = "ai_app"


@pytest.fixture(scope="session")
def ai_db_url():
    try:
        from testcontainers.community.postgres import PostgresContainer

        container = PostgresContainer("postgres:17-alpine", driver=None).start()
    except Exception as exc:
        if os.environ.get("CI"):
            raise
        pytest.skip(f"Docker 를 쓸 수 없어 DB 테스트를 건너뜀 ({type(exc).__name__})")

    try:
        with psycopg.connect(container.get_connection_url(), autocommit=True) as admin:
            admin.execute(f"CREATE ROLE {AI_USER} LOGIN PASSWORD '{AI_USER}'")
            admin.execute(f"CREATE SCHEMA ai AUTHORIZATION {AI_USER}")
        host, port = container.get_container_host_ip(), container.get_exposed_port(5432)
        url = f"postgresql://{AI_USER}:{AI_USER}@{host}:{port}/{container.dbname}"
        migrate(url)
        yield url
    finally:
        container.stop()


@pytest.fixture(scope="session")
def pool(ai_db_url):
    pool = make_pool(ai_db_url)
    yield pool
    pool.close()


@pytest.fixture
def registry(pool) -> JobRegistry:
    with pool.connection() as conn:
        conn.execute("TRUNCATE job, job_report, checkpoints, checkpoint_blobs, checkpoint_writes")
    return JobRegistry(pool)


@pytest.fixture
def checkpointer(pool) -> PostgresSaver:
    return PostgresSaver(pool)


def expire_lease(pool, job_id: int) -> None:
    """워커가 죽었거나 재시도 대기 시간이 지난 상황을 만든다."""
    with pool.connection() as conn:
        conn.execute("UPDATE job SET lease_expires_at = now() - interval '1 second' WHERE job_id = %s", (job_id,))
