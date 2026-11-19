#!/bin/bash
# 🎬 발표용 데모 데이터(매장 · 메뉴 · 매출 등)를 한 번에 넣는다. 이 폴더의 *.sql 을 이름 순서대로 실행
#
#   내 PC · dev EC2 (docker compose 의 postgres):
#     bash infra/demo-data/load.sh local
#   prod (CodeDeploy 가 서버 EC2 의 /opt/nansogong/deploy/demo-data 에 함께 깔아 둔다):
#     SSM Session Manager 로 prod 서버 EC2 한 대에 접속 → sudo bash /opt/nansogong/deploy/demo-data/load.sh aws
#     (DB 주소 · 계정은 서버가 쓰는 /etc/nansogong/app.env 에서 읽는다. RDS 는 private 이라 서버 EC2 에서만 닿는다)
#
#   SQL 은 여러 번 실행해도 결과가 같게 쓴다 (README.md 의 규칙). 하나라도 실패하면 그 파일 전체가 취소되고 멈춘다
set -euo pipefail
cd "$(dirname "$0")"
MODE=${1:?"local 또는 aws"}

shopt -s nullglob
FILES=( [0-9]*.sql )
if [ ${#FILES[@]} -eq 0 ]; then
  echo "넣을 SQL 파일이 아직 없습니다 (README.md 참고: 01_store.sql 처럼 숫자로 시작하는 파일)"; exit 0
fi

case "$MODE" in
  local)
    cd ../..                                         # docker-compose.yml 이 있는 곳
    [ -f .env ] && set -a && . ./.env && set +a
    run_sql() { docker compose exec -T postgres psql -v ON_ERROR_STOP=1 --single-transaction \
                  -U "${DB_USER:-dev}" -d "${DB_NAME:-nansogong}" < "infra/demo-data/$1"; }
    ;;
  aws)
    ENV_FILE=/etc/nansogong/app.env
    [ -r "$ENV_FILE" ] || { echo "🚨 $ENV_FILE 를 읽을 수 없습니다 (서버 EC2 에서 sudo 로 실행)"; exit 1; }
    DB_URL=$(grep '^DB_URL=' "$ENV_FILE" | cut -d= -f2-)
    PGUSER=$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2-)
    PGPASSWORD=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
    HOSTPORT_DB=${DB_URL#jdbc:postgresql://}          # host:5432/nansogong
    PGHOST=${HOSTPORT_DB%%:*} PGDATABASE=${HOSTPORT_DB##*/} PGSSLMODE=require
    export PGUSER PGPASSWORD PGHOST PGDATABASE PGSSLMODE
    run_sql() { docker run --rm -i -e PGHOST -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE \
                  postgres:17-alpine psql -v ON_ERROR_STOP=1 --single-transaction < "$1"; }
    ;;
  *) echo "local 또는 aws"; exit 1 ;;
esac

for f in "${FILES[@]}"; do
  echo "▶ $f"
  run_sql "$f"
done
echo "✅ 데모 데이터 ${#FILES[@]}개 파일 적용 완료"
