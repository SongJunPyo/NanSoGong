#!/bin/bash
# 🧠 AI 작업 저장소(Postgres ai 스키마)와 Python 전용 계정을 만든다 (#34 ④, docs/rules/db.md "AI 작업 저장소")
#
#   내 PC (docker compose 의 postgres):
#     bash infra/ai-db/init.sh local
#     → 다음 단계(표 만들기 · 올리기)는 AI 서비스의 배포 명령 python -m app.db.migrate 가 한다 (ai/README.md)
#
#   dev (팀 공용 온프레미스 DB) · prod (RDS): 아직 없다. AI 워커를 dev 에 배포할 때 추가한다
#
#   필요한 값 (.env)
#     AI_DB_PASSWORD   Python 전용 계정 비밀번호 (필수). 만들기: openssl rand -hex 24
#                      🚨 AI_DATABASE_URL 주소에 그대로 들어가므로 영문 · 숫자만 쓴다 (hex 권장)
#     AI_DB_USER       계정 이름 (기본 ai_app)
#     DB_USER · DB_NAME  관리자 계정 · DB (docker compose 의 postgres 와 같은 값)
#
#   비밀번호는 환경변수로만 넘긴다: SQL 파일 · 명령줄 · 서버 로그에 남지 않는다 (init.sql)
#   여러 번 실행해도 결과가 같다. 비밀번호를 바꾼 뒤 다시 실행하면 새 비밀번호로 맞춘다
set -euo pipefail
cd "$(dirname "$0")/../.."                           # docker-compose.yml 이 있는 곳
MODE=${1:?"사용법: $0 local"}

case "$MODE" in
  local)
    [ -f .env ] && set -a && . ./.env && set +a
    : "${AI_DB_PASSWORD:?AI_DB_PASSWORD 가 없습니다. .env 에 넣어 주세요 (.env.example 참고)}"
    export AI_DB_PASSWORD
    AI_USER=${AI_DB_USER:-ai_app}
    # -e AI_DB_PASSWORD: 값 없이 이름만 넘기면 지금 환경의 값을 컨테이너로 넘긴다 (명령줄에 비밀번호가 보이지 않는다)
    docker compose exec -T -e AI_DB_PASSWORD postgres \
      psql -X -q -v ON_ERROR_STOP=1 -v ai_user="$AI_USER" \
           -U "${DB_USER:-dev}" -d "${DB_NAME:-nansogong}" < infra/ai-db/init.sql
    ;;
  *)
    echo "사용법: $0 local   (dev · prod 는 아직 없음)"; exit 1 ;;
esac

echo "✅ ai 스키마 · $AI_USER 계정 준비 완료 (DB ${DB_NAME:-nansogong})"
