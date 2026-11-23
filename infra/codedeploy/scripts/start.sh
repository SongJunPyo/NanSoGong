#!/bin/bash
# ApplicationStart: 환경변수 파일을 만들고 서버 컨테이너를 띄운다
#   /etc/nansogong/app.env  =  nansogong/<env> 비밀 (API 키 · JWT 등, infra/secrets-put.sh)
#                            + nansogong/<env>/db 비밀 (DB 계정, data 스택이 자동 생성)
#                            + /etc/nansogong/infra.env (DB · Redis 주소, app 스택의 User data)
#                            + SPRING_PROFILES_ACTIVE=aws,<env>
#   비밀값을 바꿨으면 배포를 다시 하면 반영된다 (Actions 에서 Re-run)
set -euo pipefail
source /opt/nansogong/deploy/image.env
source /etc/nansogong/infra.env               # APP_ENV AWS_REGION DB_SECRET_ID DB_URL REDIS_HOST REDIS_SSL LOG_GROUP

ENV_FILE=/etc/nansogong/app.env
secret_json() { aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$1" --query SecretString --output text; }

{
  secret_json "nansogong/$APP_ENV" | jq -r 'to_entries[] | "\(.key)=\(.value)"'
  secret_json "$DB_SECRET_ID"      | jq -r '"DB_USER=\(.username)", "DB_PASSWORD=\(.password)"'
  grep -E '^(DB_URL|REDIS_HOST|REDIS_SSL)=' /etc/nansogong/infra.env    # 인프라 값이 마지막 → 같은 키가 있으면 이 값이 이긴다
  echo "SPRING_PROFILES_ACTIVE=aws,$APP_ENV"
} > "$ENV_FILE.tmp"
chmod 600 "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"

docker run -d --name nansogong-api --restart always \
  -p 8080:8080 \
  --env-file "$ENV_FILE" \
  --log-driver awslogs \
  --log-opt awslogs-region="$AWS_REGION" \
  --log-opt awslogs-group="$LOG_GROUP" \
  --log-opt awslogs-stream="$(hostname)" \
  "$IMAGE" > /dev/null

# 이전 버전 이미지 정리 (디스크)
docker image prune -af --filter "until=72h" > /dev/null || true
