#!/bin/bash
# 🔐 서버가 읽을 비밀값을 AWS Secrets Manager 에 넣는다 (요구사항 구현-6-2 · 7-1: API 키는 Secrets Manager 보관)
#   비밀 이름: nansogong/dev , nansogong/prod  (환경마다 비밀 1개, 안에 KEY=값 들을 JSON 으로 담는다)
# 사용법:  ./infra/secrets-put.sh dev     또는     ./infra/secrets-put.sh prod
#   → 값을 하나씩 물어본다 (입력은 화면에 보이지 않는다). 빈 값(Enter)은 기존 값을 그대로 둔다
# 필요: aws CLI v2, jq
# 🚨 이 파일에 진짜 값을 적어서 커밋하지 않는다
# 값을 바꾼 뒤에는 다시 배포해야 반영된다 (prod: Actions 의 deploy-prod Re-run / dev: dev EC2 에서 infra/dev/update.sh)
#
# 🚨 DB · Redis 값(DB_URL DB_USER DB_PASSWORD REDIS_HOST)은 넣지 않는다
#   prod: data 스택이 DB 비밀번호(nansogong/prod/db)를, app 스택이 DB · Redis 주소를 서버에 넣어 준다
#   dev : 같은 EC2 의 PostgreSQL · Redis 컨테이너를 쓴다 (docker-compose.dev.yml)
set -euo pipefail

APP_ENV=${1:?"dev 또는 prod 를 넣어 주세요"}
REGION=ap-northeast-2
SECRET_ID="nansogong/$APP_ENV"

# 서버(application-aws.yml)가 기본값 없이 요구하는 값 + 선택 값
#   dev 는 목업 주소(POS_BASE_URL 등)가 compose 에 들어 있어 비워 둬도 된다 (Enter)
KEYS=(
  JWT_SECRET CREDENTIAL_ENCRYPTION_KEY
  ANTHROPIC_API_KEY AI_MODEL
  DATA_GO_KR_SERVICE_KEY NAVER_CLIENT_ID NAVER_CLIENT_SECRET
  POS_BASE_URL SUPPLIER_BASE_URL MYDATA_BASE_URL
  VERIFICATION_MODE CORS_ALLOWED_ORIGINS
)

# 기존 값 불러오기 (처음이면 빈 JSON)
if CURRENT=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "$SECRET_ID" \
               --query SecretString --output text 2>/dev/null); then
  EXISTS=true
else
  CURRENT='{}'; EXISTS=false
fi

echo "도움말) JWT_SECRET 만들기: openssl rand -base64 48 / CREDENTIAL_ENCRYPTION_KEY 만들기: openssl rand -base64 32"
for key in "${KEYS[@]}"; do
  has=$(echo "$CURRENT" | jq -r --arg k "$key" 'has($k)')
  read -r -s -p "$SECRET_ID $key $( [ "$has" = true ] && echo '(있음, Enter=유지)' ) = " value; echo
  if [ -n "$value" ]; then
    CURRENT=$(echo "$CURRENT" | jq --arg k "$key" --arg v "$value" '. + {($k): $v}')
  fi
done

if [ "$EXISTS" = true ]; then
  aws secretsmanager put-secret-value --region "$REGION" --secret-id "$SECRET_ID" --secret-string "$CURRENT" > /dev/null
else
  aws secretsmanager create-secret --region "$REGION" --name "$SECRET_ID" --secret-string "$CURRENT" \
    --tags Key=Environment,Value="$APP_ENV" > /dev/null
fi
echo "저장됨: $SECRET_ID ($(echo "$CURRENT" | jq 'keys | length')개 항목)"
