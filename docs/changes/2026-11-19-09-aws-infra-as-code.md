# 09. AWS 인프라 코드화 (CloudFormation) · ECR + CodeDeploy 배포 · 작은 dev 환경

- 날짜: 2026-11-19
- 요청 · 작성: 경모
- 관련: 요구사항 구현-6-2 · 7-1 (Secrets Manager), 구현-7-3 (PWA), 아키텍처 이미지(ALB · WAF · ASG · RDS Multi-AZ · ElastiCache · CloudFront · CodeDeploy), [02](2026-11-19-02-aws-dev-prod-split.md)

## 요청 · 배경

dev · prod 운영 비용과 방식을 비교한 끝에 **B안**으로 정했다.

- dev 는 **작게**: EC2 t4g.small 1대에서 docker compose 로 화면 · 서버 · DB · Redis · 목업을 모두 띄운다 (하루 약 $0.7)
- prod 는 아키텍처 그대로 (하루 약 $8.8). 발표 전에 미리 띄워 배포 · HTTPS · DNS · DB 연결을 리허설한다

prod 를 이틀 안에 안정적으로 만들고, 발표 후 지웠다가 필요하면 다시 만들려면 인프라를 코드로 남겨야 한다.
또 아키텍처는 ECR · CodeDeploy · Graviton 인데 기존 CI/CD 는 Docker Hub · ASG 교체 · amd64 였다.
(운영 일정은 이 기록에 넣지 않았다.)

## 바꾼 것

| 파일 | 변경 내용 |
|---|---|
| `infra/cloudformation/shared.yml` | 새 파일. ECR 저장소 `nansogong-api` · `nansogong-web`, AWS Budgets 월 $100 알림 |
| `infra/cloudformation/network.yml` | 새 파일. VPC, public · private · data 서브넷 x2, NAT 2개, 보안 그룹 (CloudFront 접두사 목록 → ALB → 서버 → RDS · Redis) |
| `infra/cloudformation/data.yml` | 새 파일. RDS PostgreSQL 17 Multi-AZ (timezone=Asia/Seoul), ElastiCache Redis 7.1 2노드(TLS), DB 비밀번호 자동 생성(`nansogong/<env>/db`) |
| `infra/cloudformation/app.yml` | 새 파일. ALB(HTTPS, `/actuator/*` 403) · WAF · ASG(t4g, arm64) · CodeDeploy · S3 · CloudFront(`/api/*` → ALB) · Route 53 · CloudWatch 알람 · 서버 로그 |
| `infra/cloudformation/dev.yml` | 새 파일. dev EC2 1대 (Docker · compose 설치, 고정 IP, SSM 접속, 팀원 IP 만 80 포트) |
| `infra/codedeploy/` | 새 폴더. `appspec.yml` + 단계별 스크립트 (끄기 → ECR 이미지 받기 → 비밀값으로 실행 → 헬스체크, 실패 시 자동 롤백) |
| `infra/dev/update.sh`, `infra/dev/run-remote.sh` | 새 파일. dev EC2 에서 최신 설정 · 이미지로 compose 갱신 / Actions 가 SSM 으로 원격 실행 |
| `infra/demo-data/` | 새 폴더. 발표용 데모 데이터 넣기 스크립트(`load.sh local` / `load.sh aws`)와 SQL 작성 규칙. SQL 은 표가 생긴 뒤 각 담당자가 추가 |
| `infra/ec2-user-data.sh` | **삭제**. User data 는 `app.yml` 시작 템플릿 안으로 옮겼다 (Docker Hub 이미지 직접 실행 → CodeDeploy 가 실행) |
| `infra/iam/ec2-instance-policy-dev.json` | **삭제**. EC2 역할은 `dev.yml` · `app.yml` 이 만든다 |
| `infra/iam/github-build-role-*.json` | 새 파일. 이미지 빌드 역할 (dev · main 브랜치만, ECR 푸시만) |
| `infra/iam/github-deploy-role-policy-dev.json` | ASG · S3 · CloudFront 권한 → dev EC2 에 SSM 명령만 |
| `infra/iam/github-deploy-role-policy-prod.json` | 새 파일. CodeDeploy 배포 · 화면 S3 업로드 · CloudFront 캐시 비우기 |
| `infra/secrets-put.sh` | `DB_URL` · `DB_USER` · `DB_PASSWORD` · `REDIS_HOST` 를 KEYS 에서 뺐다 (스택이 넣어 준다) |
| `infra/README.md` | 새 구조에 맞춰 다시 씀: 미리 준비 · dev 만들기 · prod 만들기 · 지우기 · 주의 |
| `.github/workflows/backend.yml` | Docker Hub → **ECR**, amd64 → **arm64**, ASG 교체 → dev 는 **SSM + update.sh**, prod 는 **CodeDeploy** (승인 후) |
| `.github/workflows/frontend.yml` | dev: S3 → **nginx 화면 이미지를 ECR 에 올려 dev EC2 갱신**. main: 그대로 S3 · CloudFront |
| `backend/Dockerfile` | 빌드 단계에 `--platform=$BUILDPLATFORM` (arm64 이미지도 에뮬레이션 없이 빠르게 빌드) |
| `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore` | 새 파일. 화면 빌드 결과를 nginx 로 서빙, `/api` 는 서버 컨테이너로 프록시 |
| `docker-compose.yml` | `web`(nginx) 서비스 추가 (`--profile web`, 로컬 8000 포트) |
| `docker-compose.dev.yml` | 새 파일. dev EC2 전용: ECR 이미지 사용, 화면을 80 포트로, DB · Redis · 목업 포트는 닫음, 비밀값 필수 |
| `backend/src/main/resources/application-aws.yml` | 주석만: 환경변수를 넣는 곳이 CodeDeploy · 스택으로 바뀜 |
| `.gitignore` | `.deploy-tags` (dev EC2 의 현재 이미지 태그 기록) |
| `README.md` | 기술 스택 · 폴더 구조(중복된 `.env.example` 줄 정리) · 환경 구성 표 · CI/CD 표와 GitHub 변수 · 자주 나는 문제(`exec format error`) |

### 바뀐 배포 흐름

```
dev 머지 → 테스트 → arm64 이미지 → ECR → SSM → dev EC2: update.sh (git pull + ECR 이미지로 compose 갱신)
main 머지   → 테스트 → (같은 이미지 재사용) → 승인 → CodeDeploy → prod ASG 한 대씩 교체 (실패 시 자동 롤백)
                                                  → 화면 S3 업로드 → CloudFront 캐시 비우기
```

### GitHub 변수 변경

| 없앤 것 | 새로 넣을 것 |
|---|---|
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `ASG_NAME` | 공통 `AWS_BUILD_ROLE_ARN` / dev `DEV_INSTANCE_ID` / prod `CODEDEPLOY_APP` · `CODEDEPLOY_GROUP` · `ARTIFACT_BUCKET` |

## 팀원이 할 일

- [ ] 없음 (로컬 개발 방법은 그대로. `docker compose up -d` · `npm run dev`)
- [ ] (선택) 배포 모양 화면 · PWA 확인: `docker compose --profile web up -d --build` → http://localhost:8000
- [ ] (데모 데이터 담당 영역) 자기 표가 생기면 `infra/demo-data/` 에 `NN_<영역>.sql` 추가 (`infra/demo-data/README.md` 규칙)
- [ ] (인프라 담당) `infra/README.md` 의 "미리 준비" 진행, GitHub 변수 교체 (위 표)
- [ ] (커밋하는 사람) 셸 스크립트에 실행 권한: `git add --chmod=+x infra/dev/*.sh infra/codedeploy/scripts/*.sh infra/demo-data/*.sh`

## 아직 남은 결정

- prod 에서 목업(WireMock)을 어디에 띄울지. 정하기 전에는 `nansogong/prod` 에 `POS_BASE_URL` 등이 없어 prod 서버가 뜨지 않는다
- prod 의 Prometheus · Grafana. 지금은 CloudWatch 지표 · 알람 · 로그로 대신한다

## 확인 방법

- 로컬: `docker compose --profile web up -d --build` → http://localhost:8000 에 연결 확인판 4줄이 `연결됨`
- 템플릿 문법: `cfn-lint infra/cloudformation/*.yml` (오류 없음)
- dev: `dev` 머지 후 Actions `deploy-dev` 성공 → `http://<dev 고정 IP>/api/ping`
- prod: `main` 머지 · 승인 후 CodeDeploy 콘솔에서 배포 성공 → `https://<도메인>`
