"""작업 API (Spring → Python): 내부 토큰 · 접수 중복 · 입력 검증 · 조회 · 취소."""

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.jobs.routes import get_registry
from app.main import app
from app.security import INTERNAL_TOKEN_HEADER

TOKEN = "s3cret"
AUTH = {INTERNAL_TOKEN_HEADER: TOKEN}


def body(job_id=1, job_type="RECIPE_DRAFT", **job_input):
    return {"jobId": job_id, "jobType": job_type, "workflowKey": f"MENU:{job_id}", "input": job_input or {"menuName": "딸기라떼"}}


@pytest.fixture
def client(registry):
    app.dependency_overrides[get_settings] = lambda: Settings(ai_service_token=SecretStr(TOKEN))
    app.dependency_overrides[get_registry] = lambda: registry
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client_without_store():
    app.dependency_overrides[get_settings] = lambda: Settings(ai_service_token=SecretStr(TOKEN))
    yield TestClient(app)                                       # lifespan 을 돌리지 않아 작업 저장소가 없다
    app.dependency_overrides.clear()


# ---------- 인증 · 저장소 ----------


def test_job_api_needs_internal_token(client_without_store):
    response = client_without_store.post("/jobs", json=body())

    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_INTERNAL_TOKEN"


def test_job_api_without_store_is_unavailable(client_without_store):
    response = client_without_store.post("/jobs", json=body(), headers=AUTH)

    assert response.status_code == 503
    assert response.json()["code"] == "JOB_STORE_NOT_CONFIGURED"


# ---------- 접수 ----------


def test_new_job_is_accepted(client):
    response = client.post("/jobs", json=body(), headers=AUTH)

    assert response.status_code == 202
    job = response.json()
    assert job["jobId"] == 1 and job["jobType"] == "RECIPE_DRAFT" and job["status"] == "PENDING"
    assert "input" not in job and "leaseOwner" not in job      # 워커 내부 값은 돌려주지 않는다


def test_same_job_again_returns_existing_job(client):
    client.post("/jobs", json=body(), headers=AUTH)

    response = client.post("/jobs", json=body(), headers=AUTH)

    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"


def test_same_job_id_with_other_content_is_conflict(client):
    client.post("/jobs", json=body(menuName="딸기라떼"), headers=AUTH)

    response = client.post("/jobs", json=body(menuName="바닐라라떼"), headers=AUTH)

    assert response.status_code == 409
    assert response.json()["code"] == "JOB_CONFLICT"


def test_unknown_input_fields_are_dropped(client, registry):
    client.post("/jobs", json=body(menuName="딸기라떼", memo="모르는 칸"), headers=AUTH)

    assert registry.get(1).input == {"menuName": "딸기라떼"}


def test_job_type_without_graph_is_rejected(client):
    response = client.post("/jobs", json=body(job_type="PURCHASE_SUGGEST"), headers=AUTH)

    assert response.status_code == 400
    assert response.json()["code"] == "UNSUPPORTED_JOB_TYPE"


def test_wrong_input_is_rejected_without_echoing_it(client):
    response = client.post("/jobs", json=body(menuName=""), headers=AUTH)

    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_JOB_INPUT"
    assert "errors" not in response.json()


@pytest.mark.parametrize(
    "bad",
    [
        {**body(), "jobId": 0},                                 # Spring ai_job_id 는 1부터
        {**body(), "jobType": "MAKE_COFFEE"},                   # 없는 작업 종류
        {**body(), "workflowKey": ""},
    ],
)
def test_malformed_request_is_400(client, bad):
    response = client.post("/jobs", json=bad, headers=AUTH)

    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_REQUEST"


# ---------- 조회 · 취소 ----------


def test_get_job(client):
    client.post("/jobs", json=body(), headers=AUTH)

    assert client.get("/jobs/1", headers=AUTH).json()["status"] == "PENDING"
    assert client.get("/jobs/2", headers=AUTH).status_code == 404


def test_cancel_job(client):
    client.post("/jobs", json=body(), headers=AUTH)

    response = client.post("/jobs/1/cancel", headers=AUTH)

    assert response.status_code == 200
    assert response.json()["status"] == "CANCELED"
    assert client.post("/jobs/1/cancel", headers=AUTH).json()["status"] == "CANCELED"   # 다시 불러도 같다
    assert client.post("/jobs/2/cancel", headers=AUTH).json()["code"] == "JOB_NOT_FOUND"
