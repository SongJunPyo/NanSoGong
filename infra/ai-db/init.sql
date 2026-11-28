-- 🧠 AI 작업 저장소(ai 스키마)와 Python 전용 계정 (#34 ④, docs/rules/db.md "AI 작업 저장소")
--   infra/ai-db/init.sh 가 관리자(슈퍼유저) 계정으로 실행한다. 직접 실행하지 않는다
--   psql 변수: ai_user (계정 이름, init.sh 가 -v 로 넘긴다) · ai_password (환경변수 AI_DB_PASSWORD 를 \getenv 로 읽는다)
--
--   만드는 것
--     - 계정: 로그인만 되는 일반 계정 (슈퍼유저 · 계정 생성 · DB 생성 권한 없음)
--     - ai 스키마: 소유자 = 이 계정. 표(작업 등록부 · 체크포인트)는 Python 배포 명령 python -m app.db.migrate 가 만든다
--     - 기본 search_path = ai
--   주지 않는 것: 업무 표(public 스키마) 권한. 업무 데이터는 Spring 내부 API 로만 읽고 쓴다
--   Flyway 는 ai 스키마를 다루지 않는다 (Spring 계정이 스키마 소유자가 되지 않게)
--
--   여러 번 실행해도 결과가 같다. 계정 · 스키마가 있으면 비밀번호 · 소유자 · 설정만 다시 맞춘다
--   🚨 비밀번호는 이 파일 · 명령줄에 쓰지 않는다. 비밀번호를 넣는 문장은 서버 로그에도 남지 않게 한다 (아래 SET)

\set ON_ERROR_STOP on
\getenv ai_password AI_DB_PASSWORD

-- 비밀번호가 없으면 아무것도 바꾸지 않고 멈춘다 (init.sh 가 먼저 확인하지만 한 번 더)
\if :{?ai_password}
\else
  \echo 'AI_DB_PASSWORD 가 없습니다'
  SELECT 1 / 0 AS "AI_DB_PASSWORD 없음";
\endif

BEGIN;

-- 이 트랜잭션 안에서는 문장을 서버 로그에 쓰지 않는다 (ALTER ROLE ... PASSWORD 가 평문으로 남지 않게)
SET LOCAL log_statement = 'none';
SET LOCAL log_min_error_statement = 'panic';

SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE', :'ai_user')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'ai_user') \gexec

SELECT format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'ai_user', :'ai_password') \gexec

SELECT format('CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION %I', :'ai_user') \gexec
SELECT format('ALTER SCHEMA ai OWNER TO %I', :'ai_user') \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'ai_user') \gexec
SELECT format('ALTER ROLE %I IN DATABASE %I SET search_path = ai', :'ai_user', current_database()) \gexec

COMMIT;

-- 확인: 계정 속성 · 스키마 소유자 (비밀번호는 보여 주지 않는다)
SELECT r.rolname AS "계정", r.rolsuper AS "슈퍼유저", n.nspname AS "스키마",
       pg_get_userbyid(n.nspowner) AS "스키마 소유자"
FROM pg_roles r LEFT JOIN pg_namespace n ON n.nspname = 'ai'
WHERE r.rolname = :'ai_user';
