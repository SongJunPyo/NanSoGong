# infra — AWS 서울 리전(ap-northeast-2) · dev / prod 분리

| | dev (작게) | prod |
|---|---|---|
| 구성 | EC2 t4g.small **1대**에서 docker compose (화면 nginx · 서버 · PostgreSQL · Redis · 목업) | CloudFront · S3 · ALB · WAF · ASG(Graviton 2대) · RDS Multi-AZ · ElastiCache 2노드 · NAT 2개 |
| 템플릿 | `cloudformation/dev.yml` | `cloudformation/network.yml` → `data.yml` → `app.yml` |
| 배포 시점 | `dev` 머지 | `main` 머지 + 승인 |
| 배포 방식 | Actions → SSM Run Command → `dev/update.sh` (ECR 이미지로 compose 갱신) | Actions → CodeDeploy (`codedeploy/appspec.yml`, 한 대씩 교체 · 실패 시 자동 롤백) |
| Spring 프로필 | `dev` (DB · Redis 가 같은 EC2 의 컨테이너) | `aws,prod` |
| 비밀값 (Secrets Manager) | `nansogong/dev` | `nansogong/prod` + `nansogong/prod/db`(data 스택이 자동 생성) |
| 접속 | `http://<고정 IP>` (팀원 IP 만 허용) | `https://<도메인>` |
| 하루 비용(대략) | $0.7 | $8.8 |

두 환경은 리소스 · 비밀값 · 배포 권한을 하나도 같이 쓰지 않습니다. 이미지 저장소(ECR)만 공용이고, dev 에서 검증한 이미지를 그대로 prod 에 씁니다.
dev 가 작아서 **네트워크 · 보안 그룹 · IAM · ElastiCache TLS · HTTPS 인증서 · DNS 같은 문제는 dev 에서 드러나지 않습니다.** prod 를 발표 전에 미리 띄워 리허설로 확인합니다.

## 파일

| 파일 | 용도 |
|---|---|
| `cloudformation/shared.yml` | (계정에 한 번) ECR 저장소 `nansogong-api` · `nansogong-web`, AWS Budgets $100 알림 |
| `cloudformation/network.yml` | VPC, public · private · data 서브넷 (각 2개 가용 영역), NAT 게이트웨이 2개, 보안 그룹 (CloudFront → ALB → 서버 → RDS · Redis) |
| `cloudformation/data.yml` | RDS PostgreSQL 17 Multi-AZ (timezone=Asia/Seoul), ElastiCache Redis 7.1 2노드(TLS), DB 비밀번호 자동 생성 |
| `cloudformation/app.yml` | ALB(HTTPS) · WAF · ASG(t4g, arm64) · CodeDeploy · S3(화면 · 배포 묶음) · CloudFront · Route 53 · CloudWatch 알람 |
| `cloudformation/dev.yml` | dev EC2 1대 (Docker · compose 설치, 고정 IP, SSM 접속, ECR · `nansogong/dev` 읽기 권한) |
| `codedeploy/` | prod 배포 설명서(`appspec.yml`)와 단계별 스크립트 (끄기 → 이미지 받기 → 비밀값으로 실행 → 헬스체크) |
| `dev/update.sh` | dev EC2 에서 최신 설정 · 이미지로 compose 다시 띄우기 |
| `dev/run-remote.sh` | Actions 가 dev EC2 의 `update.sh` 를 SSM 으로 원격 실행 |
| `demo-data/` | 발표용 데모 데이터 SQL 과 넣기 스크립트 (`demo-data/README.md`) |
| `secrets-put.sh` | 서버 비밀값(API 키 · JWT 등)을 Secrets Manager 에 넣는다: `./infra/secrets-put.sh dev` / `prod` |
| `iam/github-build-role-*.json` | Actions 이미지 빌드 역할 (dev · main 브랜치만, ECR 푸시만) |
| `iam/github-deploy-role-trust-{dev,prod}.json` | 배포 역할 **신뢰 정책**. 🚨 `environment:dev/prod` 로 적어야 한다 |
| `iam/github-deploy-role-policy-dev.json` | dev 배포 역할 권한 (dev EC2 에 SSM 명령만) |
| `iam/github-deploy-role-policy-prod.json` | prod 배포 역할 권한 (CodeDeploy 배포 · 화면 S3 업로드 · CloudFront 캐시 비우기) |

## 미리 준비 (계정에 한 번, 비용 거의 없음)

1. 루트 계정 MFA 켜기, 작업용 IAM 사용자 만들기 (이후 작업은 이 사용자로)
2. 도메인: Route 53 에서 사거나 가진 도메인의 호스팅 영역을 만든다
3. ACM 인증서 2개 (무료, DNS 검증 — 시간이 걸릴 수 있으니 미리)
   - CloudFront 용 `<도메인>`: 🚨 **버지니아(us-east-1)** 에서 발급. 서울에서 발급하면 CloudFront 에 붙지 않는다
   - ALB 용 `api.<도메인>`: 서울(ap-northeast-2) 에서 발급
4. 공용 스택: ECR 저장소 + 예산 알림
   ```bash
   aws cloudformation deploy --region ap-northeast-2 --stack-name nansogong-shared \
     --template-file infra/cloudformation/shared.yml --parameter-overrides BudgetEmail=<메일>
   ```
5. GitHub OIDC: IAM > Identity providers 에 `token.actions.githubusercontent.com` (Audience `sts.amazonaws.com`) 등록
6. IAM 역할 3개를 `iam/` 의 JSON 으로 만든다 (`<ACCOUNT_ID>` 등 꺾쇠 값을 바꿔서)
   | 역할 | 신뢰 정책 | 권한 | GitHub 에 넣을 곳 |
   |---|---|---|---|
   | `nansogong-build` | `github-build-role-trust.json` | `github-build-role-policy.json` | Variables `AWS_BUILD_ROLE_ARN` |
   | `nansogong-deploy-dev` | `github-deploy-role-trust-dev.json` | `github-deploy-role-policy-dev.json` | Environment `dev` → `AWS_DEPLOY_ROLE_ARN` |
   | `nansogong-deploy-prod` | `github-deploy-role-trust-prod.json` | `github-deploy-role-policy-prod.json` | Environment `prod` → `AWS_DEPLOY_ROLE_ARN` |

   dev / prod 권한 JSON 의 인스턴스 ID · 버킷 이름은 스택을 만든 뒤 출력값(Outputs)으로 채운다
7. GitHub 저장소 Settings > Environments: `dev`, `prod` 생성. `prod` 에는 **Required reviewers** 와 **Deployment branches: `main` 만**

## dev 만들기 (약 1시간)

1. 비밀값: `./infra/secrets-put.sh dev` (JWT_SECRET · CREDENTIAL_ENCRYPTION_KEY · ANTHROPIC_API_KEY 만 넣고 나머지는 Enter)
2. 스택 생성 (기본 VPC 의 public 서브넷, 내 IP)
   ```bash
   aws cloudformation deploy --region ap-northeast-2 --stack-name nansogong-dev \
     --template-file infra/cloudformation/dev.yml --capabilities CAPABILITY_IAM \
     --parameter-overrides VpcId=<vpc-...> SubnetId=<subnet-...> AllowedCidr=<내 IP>/32
   ```
   팀원 IP 는 콘솔 > EC2 > 보안 그룹 `nansogong-dev` 에 80 포트로 한 줄씩 추가
3. GitHub Environment `dev` 에 `DEV_INSTANCE_ID` (스택 출력 `InstanceId`) 입력, `iam/github-deploy-role-policy-dev.json` 의 `<DEV_INSTANCE_ID>` 도 같은 값으로
4. EC2 콘솔 > 인스턴스 > 연결 > **Session Manager** 로 접속해서
   ```bash
   sudo -iu ec2-user
   git clone -b dev https://github.com/SongJunPyo/NanSoGong.git /opt/nansogong
   ```
   (저장소가 private 이면 읽기 전용 fine-grained 토큰으로 clone: `https://<토큰>@github.com/...`)
5. GitHub Actions 에서 `backend` · `frontend` 워크플로를 `dev` 으로 **Run workflow** → ECR 에 이미지가 생기고 dev 가 뜬다
   이미지가 이미 있으면 EC2 에서 바로 `bash /opt/nansogong/infra/dev/update.sh`
6. `http://<고정 IP>` 에서 화면, `http://<고정 IP>/api/ping` 에서 연결 확인. 이후 `dev` 머지마다 자동 갱신
7. 데모 데이터: `bash /opt/nansogong/infra/demo-data/load.sh local`

## prod 만들기 (2~3시간)

1. 비밀값: `./infra/secrets-put.sh prod` — DB · Redis 값은 넣지 않는다. `CORS_ALLOWED_ORIGINS=https://<도메인>`
2. 스택 3개를 순서대로
   ```bash
   aws cloudformation deploy --region ap-northeast-2 --stack-name nansogong-prod-network \
     --template-file infra/cloudformation/network.yml --parameter-overrides Environment=prod          # 약 5분
   aws cloudformation deploy --region ap-northeast-2 --stack-name nansogong-prod-data \
     --template-file infra/cloudformation/data.yml --parameter-overrides Environment=prod             # 20~30분 (RDS Multi-AZ)
   aws cloudformation deploy --region ap-northeast-2 --stack-name nansogong-prod-app \
     --template-file infra/cloudformation/app.yml --capabilities CAPABILITY_IAM \
     --parameter-overrides Environment=prod DomainName=<도메인> ApiDomainName=api.<도메인> \
       HostedZoneId=<Z...> AlbCertificateArn=<서울 인증서> CloudFrontCertificateArn=<버지니아 인증서> \
       AlarmEmail=<메일>                                                                          # 10~20분 (CloudFront)
   ```
3. app 스택 출력값을 GitHub Environment `prod` 에 입력: `CODEDEPLOY_APP` · `CODEDEPLOY_GROUP` · `ARTIFACT_BUCKET` · `WEB_BUCKET` · `CF_DISTRIBUTION_ID`
   (`iam/github-deploy-role-policy-prod.json` 의 꺾쇠 값도 같은 값으로)
4. `dev` → `main` 머지 → Actions 에서 승인 → CodeDeploy 첫 배포 + 화면 S3 업로드
5. 데모 데이터: SSM 으로 prod 서버 EC2 한 대에 접속 → `sudo bash /opt/nansogong/deploy/demo-data/load.sh aws`
6. 확인
   - `https://<도메인>` 접속 · 로그인
   - `https://<도메인>/api/...` 응답 (`/actuator/*` 는 밖에서 403 이 정상)
   - CodeDeploy 콘솔에서 배포 성공, CloudWatch Logs `/nansogong/prod/api` 에 서버 로그
   - CloudWatch 알람 메일 구독 확인 (메일의 인증 링크를 눌러야 받기 시작)
7. 장애 리허설
   - EC2 한 대 강제 종료 → ASG 가 새 서버를 띄우고 CodeDeploy 가 자동으로 마지막 버전을 깐다
   - RDS > 재부팅 > "장애 조치로 재부팅" → Standby 로 전환되는 동안(1~2분) 서버가 다시 연결되는지

## 지우기 (🚨 남겨 두면 계속 과금)

```bash
# prod: 버킷을 비운 뒤 app → data → network 순서
aws s3 rm s3://<WEB_BUCKET> --recursive && aws s3 rm s3://<ARTIFACT_BUCKET> --recursive
aws cloudformation delete-stack --region ap-northeast-2 --stack-name nansogong-prod-app
aws cloudformation wait stack-delete-complete --region ap-northeast-2 --stack-name nansogong-prod-app
aws cloudformation delete-stack --region ap-northeast-2 --stack-name nansogong-prod-data      # RDS 마지막 스냅숏을 남긴다
aws cloudformation wait stack-delete-complete --region ap-northeast-2 --stack-name nansogong-prod-data
aws cloudformation delete-stack --region ap-northeast-2 --stack-name nansogong-prod-network

# dev: 고정 IP 도 함께 반납된다
aws cloudformation delete-stack --region ap-northeast-2 --stack-name nansogong-dev

# 다 끝났으면: ECR 이미지 · 예산 알림
aws cloudformation delete-stack --region ap-northeast-2 --stack-name nansogong-shared
```

- RDS 최종 스냅숏(`DeletionPolicy: Snapshot`)은 RDS 콘솔 > 스냅숏에서 직접 지운다 (남기면 월 소액)
- Secrets Manager 비밀(`nansogong/dev`, `nansogong/prod`)은 삭제 예약(7~30일 대기)으로 지운다
- 며칠 뒤 결제 콘솔(Billing > Bills)에서 남은 과금 항목이 없는지 확인

## 주의

- 서버 이미지는 **arm64(Graviton)** 입니다. Actions 가 만든 이미지만 배포하고, 내 PC 에서 만든 이미지(amd64)는 올리지 않는다
- 테이블은 Flyway 가 만든다. RDS 에서 손으로 표를 만들거나 고치지 않는다 (dev · prod 구조가 달라진다)
- 비밀값을 바꾸면 다시 배포해야 반영된다 (prod: Actions 의 `deploy-prod` Re-run / dev: `update.sh`)
- ASG 헬스체크는 EC2 기준입니다. 첫 배포 전에는 서버 컨테이너가 없어서 ALB 헬스체크가 실패하는데, ELB 기준이면 ASG 가 EC2 를 계속 갈아 끼우기 때문 (`app.yml` 주석)
- ALB 는 CloudFront 에서 오는 요청만 받는다 (보안 그룹 = CloudFront 관리형 접두사 목록). `api.<도메인>` 으로 직접 접속하면 연결되지 않는 것이 정상
- POS · 거래처 · 마이데이터는 MVP 에서 목업이다. prod 에서 목업(WireMock)을 어디에 띄울지는 아직 정하지 않았다 → 정한 뒤 `POS_BASE_URL` 등을 `nansogong/prod` 에 넣는다 (넣지 않으면 서버가 뜨지 않는다)
- prod 의 Prometheus · Grafana 는 아직 템플릿에 없다. 지금은 CloudWatch 지표 · 알람 · 로그로 본다
