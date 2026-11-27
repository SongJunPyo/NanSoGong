"""오류 응답이 Spring 과 같은 { code, message } 모양인지 확인한다."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.errors import AppError, register_error_handlers


class Body(BaseModel):
    qty: int


def make_client() -> TestClient:
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/business-error")
    def business_error():
        raise AppError(409, "JOB_ALREADY_RUNNING", "이미 진행 중인 작업이 있습니다")

    @app.post("/validated")
    def validated(body: Body):
        return body

    @app.get("/boom")
    def boom():
        raise RuntimeError("secret-detail")

    return TestClient(app, raise_server_exceptions=False)


def test_app_error_keeps_status_and_code():
    response = make_client().get("/business-error")

    assert response.status_code == 409
    assert response.json() == {"code": "JOB_ALREADY_RUNNING", "message": "이미 진행 중인 작업이 있습니다"}


def test_validation_error_is_400_without_input_values():
    response = make_client().post("/validated", json={"qty": "not-a-number-010-1234-5678"})

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "INVALID_REQUEST"
    assert body["errors"][0]["field"] == "body.qty"
    assert "010-1234-5678" not in response.text      # 요청 값은 돌려주지 않는다


def test_unknown_path_is_404_with_code():
    response = make_client().get("/nope")

    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


def test_unexpected_error_hides_detail():
    response = make_client().get("/boom")

    assert response.status_code == 500
    assert response.json() == {"code": "INTERNAL_ERROR", "message": "서버 내부 오류가 발생했습니다"}
    assert "secret-detail" not in response.text
