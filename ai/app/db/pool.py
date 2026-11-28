"""ai 스키마 연결.

- search_path 를 ai 로 고정한다 → 표 이름에 스키마를 붙이지 않아도 ai 스키마 표만 본다.
  ai 스키마가 없으면 표를 만들 곳이 없어서 바로 실패한다 (다른 스키마에 몰래 만들지 않는다).
- LangGraph PostgresSaver 가 요구하는 설정(autocommit · dict_row · prepare_threshold=0)을 등록부도 같이 쓴다.
  여러 문장을 묶어야 하는 곳은 conn.transaction() 으로 묶는다.
"""

from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

AI_SCHEMA = "ai"

CONNECTION_KWARGS: dict[str, Any] = {
    "autocommit": True,
    "row_factory": dict_row,
    "prepare_threshold": 0,
    "options": f"-c search_path={AI_SCHEMA}",
}


def make_pool(url: str, max_size: int = 4) -> ConnectionPool:
    """연결 묶음을 만든다. DB 가 잠깐 꺼져 있어도 서버는 뜨고, 요청은 5초까지 연결을 기다린다."""
    return ConnectionPool(url, min_size=1, max_size=max_size, kwargs=CONNECTION_KWARGS, timeout=5, open=True)
