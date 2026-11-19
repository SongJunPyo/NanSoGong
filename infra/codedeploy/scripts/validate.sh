#!/bin/bash
# ValidateService: 서버가 진짜로 요청을 받을 수 있을 때(UP)까지 기다린다. 5분 안에 안 되면 배포 실패 → 자동 롤백
# 실패 원인은 CloudWatch Logs 의 /nansogong/<env>/api 에서 본다 (예: Secrets Manager 에 키가 빠져 Validation failed for object='app')
set -uo pipefail
for i in $(seq 1 56); do
  if curl -fsS http://localhost:8080/actuator/health | grep -q '"UP"'; then
    echo "서버 정상 (${i}번째 확인)"; exit 0
  fi
  if ! docker ps --format '{{.Names}}' | grep -q '^nansogong-api$'; then
    echo "🚨 서버 컨테이너가 꺼졌습니다. 마지막 로그:"; docker logs --tail 50 nansogong-api 2>&1 || true; exit 1
  fi
  sleep 5
done
echo "🚨 5분 안에 /actuator/health 가 UP 이 되지 않았습니다"; docker logs --tail 50 nansogong-api 2>&1 || true
exit 1
