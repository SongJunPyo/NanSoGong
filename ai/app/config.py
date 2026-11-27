"""환경변수에서 읽는 설정.

이름은 환경변수와 같다 (대소문자 무시): ai_service_token ← AI_SERVICE_TOKEN
비밀값은 SecretStr 로 둔다 → 로그 · 오류 메시지에 찍혀도 '**********' 로만 보인다.
"""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    # Spring → Python 내부 호출 토큰 (X-Internal-Token). 비어 있으면 내부 API 를 모두 거절한다
    ai_service_token: SecretStr = SecretStr("")
    # AI 작업 저장소(ai 스키마) 접속 주소. Python 전용 계정이다 (업무 표 쓰기 권한 없음, docs/rules/db.md)
    # 예: postgresql://ai_app:비밀번호@postgres:5432/nansogong. 비어 있으면 작업 API 가 503 을 돌려준다
    ai_database_url: SecretStr = SecretStr("")

    # ---------- 워커 (python -m app.worker) ----------
    # Spring 주소 (같은 docker 네트워크). 예: http://app:8080
    spring_base_url: str = ""
    # Python → Spring 내부 호출 토큰 (X-Internal-Token). Spring app.internal.token 과 같은 환경변수 · 같은 값
    internal_api_token: SecretStr = SecretStr("")
    # Claude. 이름은 Spring 설정(application.yml)과 같은 환경변수를 쓴다
    anthropic_api_key: SecretStr = SecretStr("")
    ai_model: str = "claude-haiku-5-5"          # 개발 중 기본 모델 (docs/rules/ai.md). 운영 모델은 환경변수로 바꾼다


@lru_cache
def get_settings() -> Settings:
    return Settings()
