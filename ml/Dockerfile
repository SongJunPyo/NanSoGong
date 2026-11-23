# 🤖 수요 예측 실험용 Jupyter (docker compose --profile ml up -d → http://localhost:8888, 토큰 nansogong)
FROM python:3.12-slim

# libgomp1: LightGBM 이 CPU 여러 개를 쓰는 데 필요 / fonts-nanum: 그래프 한글 깨짐 방지
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 fonts-nanum \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

ENV PYTHONPATH=/workspace
EXPOSE 8888
CMD jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root \
    --ServerApp.root_dir=/workspace --IdentityProvider.token="${JUPYTER_TOKEN}"
