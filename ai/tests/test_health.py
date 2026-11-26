"""서버 틀이 뜨는지 확인하는 테스트. 외부(DB · 모델)를 쓰지 않는다."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_up():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_metrics_are_exposed_for_prometheus():
    client.get("/health")

    response = client.get("/metrics")

    assert response.status_code == 200
    assert "http_requests_total" in response.text
