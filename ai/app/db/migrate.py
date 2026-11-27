"""ai 스키마 표 만들기 · 올리기 (배포 명령).

    python -m app.db.migrate            # AI_DATABASE_URL 의 DB 에 적용

- 서버 · 워커가 실행 중에 표를 만들지 않는다. 배포할 때 이 명령을 먼저 한 번 돌린다 (docs/rules/db.md AI 작업 저장소).
- 작업 등록부: migrations/ 의 SQL 파일을 이름 순서대로, 아직 적용하지 않은 것만 적용한다 (registry_migration 표에 기록).
  이미 적용된 파일은 고치지 않는다. 바꿀 내용은 다음 번호 파일로 만든다.
- 체크포인트: LangGraph PostgresSaver.setup() 이 자기 표를 만들고 올린다 (버전은 requirements.txt 에 고정).
- 두 컨테이너가 동시에 돌려도 한쪽씩 적용되도록 DB 잠금(advisory lock)을 건다.
"""

import logging
from pathlib import Path

import psycopg
from langgraph.checkpoint.postgres import PostgresSaver

from app.config import get_settings
from app.db.pool import CONNECTION_KWARGS

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent / "migrations"
_LOCK_KEY = 36_0001                                     # 이 명령끼리만 쓰는 잠금 번호 (#36)


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def migrate(url: str) -> list[str]:
    """적용한 등록부 파일 이름 목록을 돌려준다 (이미 모두 적용돼 있으면 빈 목록)."""
    applied: list[str] = []
    with psycopg.connect(url, **CONNECTION_KWARGS) as conn:
        conn.execute("SELECT pg_advisory_lock(%s)", (_LOCK_KEY,))
        try:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS registry_migration ("
                " name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            )
            done = {row["name"] for row in conn.execute("SELECT name FROM registry_migration")}
            for path in migration_files():
                if path.name in done:
                    continue
                with conn.transaction():                # 파일 하나가 중간에 실패하면 그 파일 전체를 되돌린다
                    # 한 파일에 문장이 여러 개라 미리 준비(prepare)하지 않고 그대로 보낸다
                    conn.execute(path.read_text(encoding="utf-8"), prepare=False)
                    conn.execute("INSERT INTO registry_migration (name) VALUES (%s)", (path.name,))
                applied.append(path.name)
                logger.info("작업 등록부 적용: %s", path.name)

            PostgresSaver(conn).setup()
        finally:
            conn.execute("SELECT pg_advisory_unlock(%s)", (_LOCK_KEY,))
    return applied


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    url = get_settings().ai_database_url.get_secret_value()
    if not url:
        raise SystemExit("AI_DATABASE_URL 이 없습니다")
    applied = migrate(url)
    logger.info("완료: 새로 적용 %d개 + 체크포인트 표 확인", len(applied))


if __name__ == "__main__":
    main()
