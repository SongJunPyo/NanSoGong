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


@lru_cache
def get_settings() -> Settings:
    return Settings()
