#!/bin/bash
# 🔄 dev EC2 에서 최신 코드 · 이미지로 다시 띄운다 (docker compose + docker-compose.dev.yml)
#   GitHub Actions 가 dev 머지 때 SSM Run Command 로 실행한다. 손으로 실행해도 된다
#
#   ./infra/dev/update.sh                  지금 기록된 이미지 그대로 다시 띄우기 (처음 띄울 때 · 비밀값 바꾼 뒤)
#   ./infra/dev/update.sh api tree-abc123  서버 이미지를 이 태그로 바꾸고 다시 띄우기
#   ./infra/dev/update.sh web tree-def456  화면 이미지를 이 태그로 바꾸고 다시 띄우기
#
# 하는 일
#   1) git pull: docker-compose*.yml · 목업(mock/mappings) 변경을 받는다
#   2) Secrets Manager 의 nansogong/dev 비밀 → .env (JWT_SECRET · ANTHROPIC_API_KEY 등)
#   3) ECR 로그인 → 기록된 태그의 이미지를 받아 다시 띄운다 (EC2 에서는 빌드하지 않는다)
set -euo pipefail

cd "$(dirname "$0")/../.."
REGION=ap-northeast-2
TAGS_FILE=.deploy-tags                 # 지금 dev 에 떠 있는 이미지 태그 (깃에 올라가지 않는다)
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)

touch "$TAGS_FILE"
set_tag() {   # API_TAG=... / WEB_TAG=... 한 줄을 바꾼다
  grep -v "^$1=" "$TAGS_FILE" > "$TAGS_FILE.tmp" || true
  echo "$1=$2" >> "$TAGS_FILE.tmp"
  mv "$TAGS_FILE.tmp" "$TAGS_FILE"
}
case "${1:-}" in
  api) set_tag API_TAG "${2:?태그를 넣어 주세요}" ;;
  web) set_tag WEB_TAG "${2:?태그를 넣어 주세요}" ;;
  "")  ;;
  *)   echo "사용법: $0 [api|web <태그>]"; exit 1 ;;
esac

# 1) 설정 파일 · 목업 최신화
git fetch --quiet origin dev
git checkout --quiet dev
git reset --quiet --hard origin/dev

# 2) .env 만들기: dev 비밀 + ECR 주소 + 이미지 태그
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

# 기록된 태그가 없으면(처음) ECR 에 가장 최근에 올라온 이미지를 쓴다
fill_latest() {   # fill_latest API_TAG nansogong-api
  grep -q "^$1=" "$TAGS_FILE" && return
  local tag
  tag=$(aws ecr describe-images --region "$REGION" --repository-name "$2" \
          --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[?starts_with(@, `tree-`)] | [0]' \
          --output text 2>/dev/null || true)
  if [ -z "$tag" ] || [ "$tag" = "None" ]; then
    echo "🚨 ECR $2 에 이미지가 없습니다. GitHub Actions 에서 dev 로 backend · frontend 워크플로를 먼저 실행해 주세요"; exit 1
  fi
  set_tag "$1" "$tag"
}
fill_latest API_TAG nansogong-api
fill_latest WEB_TAG nansogong-web
{
  aws secretsmanager get-secret-value --region "$REGION" --secret-id nansogong/dev \
      --query SecretString --output text | jq -r 'to_entries[] | "\(.key)=\(.value)"'
  echo "ECR_REGISTRY=$REGISTRY"
  cat "$TAGS_FILE"
} > .env.tmp
chmod 600 .env.tmp && mv .env.tmp .env

# 3) 이미지 받기 → 다시 띄우기 (바뀐 컨테이너만 교체된다)
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" > /dev/null
"${COMPOSE[@]}" pull --quiet app web
"${COMPOSE[@]}" up -d --no-build --remove-orphans
docker image prune -f > /dev/null

"${COMPOSE[@]}" ps
echo "✅ dev 갱신 완료 ($(tr '\n' ' ' < "$TAGS_FILE"))"
