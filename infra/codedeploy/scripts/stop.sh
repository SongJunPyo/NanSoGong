#!/bin/bash
# ApplicationStop: 떠 있는 서버 컨테이너를 끈다 (처음 배포라 없으면 그냥 넘어간다)
set -euo pipefail
docker rm -f nansogong-api > /dev/null 2>&1 || true
