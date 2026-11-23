# 서버 비밀값 (Secrets Manager) — 콘솔에서 넣기

서버가 읽는 API 키 · JWT 키 등은 환경마다 비밀 1개에 JSON 으로 담습니다.

| 환경 | 비밀 이름 | 붙여넣을 틀 |
|---|---|---|
| dev | `nansogong/dev` | [`dev.example.json`](dev.example.json) |
| prod | `nansogong/prod` | [`prod.example.json`](prod.example.json) |

🚨 이 폴더의 파일에 진짜 값을 적어서 커밋하지 않습니다. 틀만 복사해서 콘솔에 붙여넣습니다.

## 처음 만들기

1. 콘솔 오른쪽 위 리전이 **서울(ap-northeast-2)** 인지 확인
2. 랜덤 값 만들기: 콘솔 위쪽 `>_` 아이콘(CloudShell) → `openssl rand -base64 48` (JWT_SECRET), `openssl rand -base64 32` (CREDENTIAL_ENCRYPTION_KEY)
3. Secrets Manager > **새 보안 암호 저장** > **다른 유형의 보안 암호** > **일반 텍스트** 탭
4. 틀 파일 내용을 붙여넣고 `<...>` 를 진짜 값으로 바꾼다 (**키/값** 탭으로 바꿔 보면 칸별로 확인할 수 있다)
5. 다음 > 보안 암호 이름 `nansogong/dev` (또는 `nansogong/prod`), 태그 `Environment` = `dev` / `prod` → 다음 > 자동 교체는 끔 → 저장

## 값 바꾸기 · 키 추가

보안 암호 상세 > **보안 암호 값 검색** > **편집** → 키/값 탭에서 고치거나 **행 추가**.
바꾼 뒤에는 다시 배포해야 반영됩니다 (dev: EC2 에서 `bash /opt/nansogong/infra/dev/update.sh` / prod: Actions 의 `deploy-prod` Re-run).

## 키 목록

| 키 | dev | prod | 설명 |
|---|---|---|---|
| `JWT_SECRET` | 필수 | 필수 | 로그인 토큰 서명 키 (`openssl rand -base64 48`) |
| `CREDENTIAL_ENCRYPTION_KEY` | 필수 | 필수 | 연동 인증 정보 암호화 키 (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | 필수 | 필수 | AI 호출 |
| `POS_BASE_URL` · `SUPPLIER_BASE_URL` · `MYDATA_BASE_URL` | 넣지 않음 (compose 에 들어 있음) | 필수 (없으면 서버가 뜨지 않는다) | 목업 주소 |
| `CORS_ALLOWED_ORIGINS` | 선택 | 필수 `https://<도메인>` | |
| `AI_MODEL` · `DATA_GO_KR_SERVICE_KEY` · `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` · `VERIFICATION_MODE` | 선택 | 선택 | 필요할 때만 행 추가 |

- 값이 없는 키는 **빈 값으로 두지 말고 아예 넣지 않습니다** (빈 값도 그대로 환경변수로 들어간다)
- 🚨 `DB_URL` · `DB_USER` · `DB_PASSWORD` · `REDIS_HOST` 는 넣지 않습니다. prod 는 prod 스택이 넣어 주고, dev 는 같은 EC2 의 컨테이너를 씁니다
- 새 환경변수를 만들면 이 표와 틀 파일도 함께 고칩니다
