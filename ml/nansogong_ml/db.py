"""로컬 PostgreSQL(docker compose)에 붙는 도우미.

노트북에서:
    from nansogong_ml.db import read_sql
    df = read_sql("select * from shedlock")
"""
import os

import pandas as pd
from sqlalchemy import create_engine, text

_engine = None


def engine():
    """DATABASE_URL 환경변수(docker-compose.yml 의 ml 서비스가 넣어 준다)로 연결한다."""
    global _engine
    if _engine is None:
        _engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
    return _engine


def read_sql(sql: str, **params) -> pd.DataFrame:
    """SQL 결과를 DataFrame 으로. 값은 :이름 으로 넘긴다 → read_sql("... where store_id = :sid", sid=1)"""
    with engine().connect() as conn:
        return pd.read_sql(text(sql), conn, params=params)
