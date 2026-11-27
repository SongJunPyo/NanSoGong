"""Spring → Python 내부 토큰 검사 (#34 ③)."""

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.errors import register_error_handlers
from app.main import app as real_app
from app.security import INTERNAL_TOKEN_HEADER, require_internal_token


def make_client(configured_token: str) -> TestClient:
    app = FastAPI()
    register_error_handlers(app)
    internal = APIRouter(dependencies=[Depends(require_internal_token)])

    @internal.get("/internal-thing")
    def internal_thing():
        return {"ok": True}

    app.include_router(internal)
    app.dependency_overrides[get_settings] = lambda: Settings(ai_service_token=SecretStr(configured_token))
    return TestClient(app)


def test_correct_token_passes():
    response = make_client("s3cret").get("/internal-thing", headers={INTERNAL_TOKEN_HEADER: "s3cret"})

    assert response.status_code == 200


@pytest.mark.parametrize(
    "headers",
    [
        {},                                             # 토큰 없음
        {INTERNAL_TOKEN_HEADER: "wrong"},               # 틀린 토큰
        {"Authorization": "Bearer user-jwt"},           # 사용자 JWT 로는 들어올 수 없다
    ],
)
def test_missing_or_wrong_token_is_401(headers):
    response = make_client("s3cret").get("/internal-thing", headers=headers)

    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_INTERNAL_TOKEN"


def test_server_without_configured_token_rejects_everything():
    response = make_client("").get("/internal-thing", headers={INTERNAL_TOKEN_HEADER: ""})

    assert response.status_code == 401


def test_health_does_not_need_token():
    response = TestClient(real_app).get("/health")

    assert response.status_code == 200
