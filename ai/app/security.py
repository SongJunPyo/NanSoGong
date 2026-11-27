"""Spring → Python 내부 호출 인증 (#34 ③).

내부 API 라우터에 dependencies=[Depends(require_internal_token)] 로 붙인다.
/health · /metrics 는 붙이지 않는다 (docker 헬스체크 · Prometheus 용, 인터넷에 열지 않는 포트).
"""

import hmac
from typing import Annotated

from fastapi import Depends, Header

from app.config import Settings, get_settings
from app.errors import AppError

INTERNAL_TOKEN_HEADER = "X-Internal-Token"


def require_internal_token(
    settings: Annotated[Settings, Depends(get_settings)],
    token: Annotated[str | None, Header(alias=INTERNAL_TOKEN_HEADER)] = None,
) -> None:
    expected = settings.ai_service_token.get_secret_value()
    # 토큰을 설정하지 않은 서버는 내부 API 를 열지 않는다 (빈 값끼리 일치하는 일을 막는다)
    # compare_digest: 비교에 걸리는 시간으로 토큰을 한 글자씩 알아내는 공격을 막는다
    if not expected or not token or not hmac.compare_digest(token.encode(), expected.encode()):
        raise AppError(401, "INVALID_INTERNAL_TOKEN", "내부 인증 토큰이 없거나 올바르지 않습니다")
