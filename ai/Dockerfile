# 🤖 AI 서비스(FastAPI) 이미지
#   로컬: docker compose --profile ai up -d --build  → http://localhost:8001/docs
#   AWS : GitHub Actions(.github/workflows/ai.yml)가 arm64(Graviton) 이미지로 만들어 ECR nansogong-ai 에 올린다
# python 버전은 ml/Dockerfile 과 같게 맞춘다
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 라이브러리를 먼저 설치 → 코드만 바뀌면 이 단계는 캐시로 건너뛴다
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# root 가 아닌 사용자로 실행 (컨테이너가 뚫려도 할 수 있는 일을 줄인다)
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

# docker ps 에 healthy / unhealthy 로 보인다 (slim 이미지에는 curl 이 없어서 python 으로 확인)
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

# API 서버 (ai-api). 워커(ai-worker)는 같은 이미지를 python -m app.worker 로 띄운다
# 로그는 표준 출력 JSON 한 줄씩 (app/logs.py)
CMD ["python", "-m", "app.serve"]
