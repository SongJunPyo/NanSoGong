# infra — AWS 서울 리전(ap-northeast-2) · dev / prod 분리

| | dev (작게) | prod |
|---|---|---|
| 구성 | EC2 t4g.small **1대**에서 docker compose (화면 nginx · 서버 · Redis · 목업 · AI 서비스) + DB 는 팀 공용 온프레미스 PostgreSQL 17 | CloudFront · S3 · ALB · WAF · ASG(Graviton 2대) · RDS Multi-AZ · ElastiCache 2노드 · NAT 2개 |
| 템플릿 (스택) | `cloudformation/dev.yml` (`nansogong-dev`) | `cloudformation/prod.yml` (`nansogong-prod`, 스택 하나) |
| 배포 시점 | `dev` 머지 | `main` 머지 + 승인 |
| 배포 방식 | Actions → SSM Run Command → `dev/update.sh` (ECR 이미지로 compose 갱신) | Actions → CodeDeploy (`codedeploy/appspec.yml`, 한 대씩 교체 · 실패 시 자동 롤백) |
| Spring 프로필 | `dev` (Redis 는 같은 EC2 의 컨테이너, DB 는 온프레미스) | `aws,prod` |
| 비밀값 (Secrets Manager) | `nansogong/dev` | `nansogong/prod` + `nansogong/prod/db`(prod 스택이 자동 생성) |
| 접속 | `http://<고정 IP>` (팀원 IP 만 허용) | `https://<도메인>` |
| 하루 비용(대략) | $0.7 | $8.8 |

두 환경은 리소스 · 비밀값 · 배포 권한을 하나도 같이 쓰지 않습니다. 이미지 저장소(ECR)만 공용이고, dev 에서 검증한 이미지를 그대로 prod 에 씁니다.
dev 가 작아서 **네트워크 · 보안 그룹 · IAM · ElastiCache TLS · HTTPS 인증서 · DNS 같은 문제는 dev 에서 드러나지 않습니다.** prod 를 발표 전에 미리 띄워 리허설로 확인합니다.

**모든 작업은 AWS 웹 콘솔에서 합니다.** 내 PC 에 AWS CLI 를 설치하지 않아도 됩니다. 랜덤 값이 필요할 때만 콘솔 안의 CloudShell(`>_` 아이콘)을 씁니다.

## 파일

| 파일 | 용도 |
|---|---|
| `cloudformation/shared.yml` | (계정에 한 번) ECR 저장소 `nansogong-api` · `nansogong-web` · `nansogong-ai`, AWS Budgets $100 알림, GitHub OIDC 공급자, 빌드 역할 `nansogong-build` |
| `cloudformation/prod.yml` | prod 전체를 스택 하나로. ① 네트워크: VPC, public · private · data 서브넷 (각 2개 가용 영역), NAT 2개, 보안 그룹 (CloudFront → ALB → 서버 → RDS · Redis) ② 데이터: RDS PostgreSQL 17 Multi-AZ (timezone=Asia/Seoul), ElastiCache Redis 7.1 2노드(TLS), DB 비밀번호 자동 생성 ③ 앱: ALB(HTTPS) · WAF · ASG(t4g, arm64) · CodeDeploy · S3(화면 · 배포 묶음) · CloudFront · Route 53 · CloudWatch 알람, 배포 역할 `nansogong-deploy-prod` |
| `cloudformation/dev.yml` | dev EC2 1대 (Docker · compose 설치, 고정 IP, SSM 접속, ECR · `nansogong/dev` 읽기 권한), 배포 역할 `nansogong-deploy-dev` |
| `secrets/` | 서버 비밀값(API 키 · JWT 등)을 콘솔에서 넣는 방법과 붙여넣을 JSON 틀 (`secrets/README.md`) |
| `codedeploy/` | prod 배포 설명서(`appspec.yml`)와 단계별 스크립트 (끄기 → 이미지 받기 → 비밀값으로 실행 → 헬스체크) |
| `dev/update.sh` | dev EC2 에서 최신 설정 · 이미지로 compose 다시 띄우기 |
| `dev/run-remote.sh` | Actions 가 dev EC2 의 `update.sh` 를 SSM 으로 원격 실행 |
| `demo-data/` | 발표용 데모 데이터 SQL 과 넣기 스크립트 (`demo-data/README.md`) |

### GitHub Actions 역할 (스택이 만든다)

| 역할 | 만드는 스택 | 쓸 수 있는 곳 | 권한 | GitHub 에 넣을 곳 (스택 출력) |
|---|---|---|---|---|
| `nansogong-build` | shared | `dev` · `main` 브랜치 | ECR 세 저장소에 이미지 올리기 | 저장소 Variables `AWS_BUILD_ROLE_ARN` (`BuildRoleArn`) |
| `nansogong-deploy-dev` | dev | Environment `dev` | dev EC2 에 SSM 명령 보내기 | Environment `dev` → `AWS_DEPLOY_ROLE_ARN` (`DeployRoleArn`) |
| `nansogong-deploy-prod` | prod | Environment `prod` | CodeDeploy 배포 · 화면 S3 업로드 · CloudFront 캐시 비우기 | Environment `prod` → `AWS_DEPLOY_ROLE_ARN` (`DeployRoleArn`) |

역할 이름이 정해져 있어서, 스택 검토 화면에서 **"사용자 지정 이름으로 IAM 리소스를 생성할 수 있음을 승인합니다"** 를 체크해야 만들어집니다 (shared · dev · prod).

## 콘솔에서 스택 만들기 (공통)

1. 콘솔 오른쪽 위 리전이 **서울(ap-northeast-2)** 인지 확인
2. CloudFormation > **스택 생성** > **새 리소스 사용(표준)** > **기존 템플릿 선택** > **템플릿 파일 업로드** → `infra/cloudformation/<파일>.yml`
3. 스택 이름 · 파라미터 입력 → 스택 옵션은 기본값 → 검토 화면에서 IAM 승인 체크(나오면) → **제출**
4. **이벤트** 탭에서 `CREATE_COMPLETE` 까지 대기 → **출력** 탭에서 값 복사
   - 실패(`ROLLBACK_COMPLETE`)하면 이벤트 탭의 `CREATE_FAILED` 사유를 보고, 스택을 삭제한 뒤 다시 만든다
   - 템플릿을 업로드하면 S3 에 `cf-templates-...` 버킷이 자동으로 생긴다 (정리할 때 함께 삭제)

## 미리 준비 (계정에 한 번, 비용 거의 없음)

1. 루트 계정 MFA 켜기, 작업용 IAM 사용자 만들기 (콘솔 접근 허용, `AdministratorAccess`). 이후 작업은 이 사용자로
2. 도메인: Route 53 에서 사거나 가진 도메인의 호스팅 영역을 만든다
3. ACM 인증서 2개 (무료, DNS 검증 — 시간이 걸릴 수 있으니 미리). 인증서 상세의 **"Route 53에서 레코드 생성"** 으로 검증
   - CloudFront 용 `<도메인>`: 🚨 **버지니아(us-east-1)** 에서 발급. 서울에서 발급하면 CloudFront 에 붙지 않는다
   - ALB 용 `api.<도메인>`: 서울(ap-northeast-2) 에서 발급
4. 공용 스택 `nansogong-shared` (`shared.yml`)
   - `BudgetEmail`: 예산 알림 메일 / `GitHubRepository`: `SongJunPyo/NanSoGong`
   - `CreateGitHubOidcProvider`: IAM > 자격 증명 공급자에 `token.actions.githubusercontent.com` 이 **이미 있으면 `false`**, 없으면 `true`
   - IAM 승인 체크 → 만든 뒤 출력 `BuildRoleArn` 을 GitHub 저장소 Settings > Secrets and variables > Actions > Variables 의 `AWS_BUILD_ROLE_ARN` 에
   - 이미 만든 스택에 새 ECR 저장소(`nansogong-ai`)를 추가할 때: 스택 선택 > **업데이트** > **현재 템플릿 교체** > `shared.yml` 업로드 > 입력값은 그대로 > IAM 승인 체크 → 제출
5. GitHub 저장소 Settings > Environments: `dev`, `prod` 생성. `prod` 에는 **Required reviewers** 와 **Deployment branches: `main` 만**

## dev 만들기 (약 1시간)

1. 비밀값 `nansogong/dev`: [`secrets/README.md`](secrets/README.md) 대로 콘솔에서 (`secrets/dev.example.json` 붙여넣기). 온프레미스 DB 의 `DB_URL` · `DB_USER` · `DB_PASSWORD` 포함
2. 스택 `nansogong-dev` (`dev.yml`)
   - `VpcId`: 기본 VPC / `SubnetId`: 기본 VPC 의 서브넷 아무거나 / `AllowedCidr`: `<내 IP>/32` (https://checkip.amazonaws.com)
   - IAM 승인 체크
   - 팀원 IP 는 EC2 > 보안 그룹 `nansogong-dev` > 인바운드 규칙 편집에서 HTTP 80 으로 한 줄씩 추가
3. 스택 출력을 GitHub Environment `dev` 의 Variables 에: `DeployRoleArn` → `AWS_DEPLOY_ROLE_ARN`, `InstanceId` → `DEV_INSTANCE_ID`
   온프레미스 DB 방화벽에 스택 출력 `Url` 의 고정 IP 를 `/32` 로 허용한다 (그 IP 하나만)
4. EC2 > 인스턴스 > `nansogong-dev` > 연결 > **Session Manager** 로 접속해서
   ```bash
   sudo -iu ec2-user
   docker run --rm postgres:17-alpine pg_isready -h <DB 주소> -p <포트>   # "accepting connections" 면 DB 에 닿는다
   git clone -b dev https://github.com/SongJunPyo/NanSoGong.git /opt/nansogong
   ```
   (저장소가 private 이면 읽기 전용 fine-grained 토큰으로 clone: `https://<토큰>@github.com/...`)
5. GitHub Actions 에서 `backend` · `frontend` 워크플로를 `dev` 으로 **Run workflow** → ECR 에 이미지가 생기고 dev 가 뜬다
   이미지가 이미 있으면 EC2 에서 바로 `bash /opt/nansogong/infra/dev/update.sh`
   AI 서비스(FastAPI)는 `ai` 워크플로를 같은 방법으로 실행하면 함께 뜬다. 이미지가 없으면 건너뛰므로 서버 · 화면 배포에는 영향이 없다
   (확인: EC2 에서 `cd /opt/nansogong && docker compose -f docker-compose.yml -f docker-compose.dev.yml exec app wget -qO- http://ai-api:8000/health`)
6. 스택 출력 `Url`(`http://<고정 IP>`) 에서 화면, `http://<고정 IP>/api/ping` 에서 연결 확인. 이후 `dev` 머지마다 자동 갱신
7. 데모 데이터: dev 는 팀 공용 온프레미스 DB 라 `load.sh` 를 쓰지 않는다 ([`demo-data/README.md`](demo-data/README.md))

## prod 만들기 (약 1~2시간)

1. 비밀값 `nansogong/prod`: [`secrets/README.md`](secrets/README.md) 대로 (`secrets/prod.example.json`). DB · Redis 값은 넣지 않는다
2. 스택 `nansogong-prod` (`prod.yml`, 40~50분: RDS Multi-AZ 20~30분 + CloudFront 10~20분)
   - 입력: `Environment=prod`, `DomainName=<도메인>`, `ApiDomainName=api.<도메인>`, `HostedZoneId`(드롭다운), `AlbCertificateArn=<서울 인증서>`, `CloudFrontCertificateArn=<버지니아 인증서>`, `AlarmEmail=<메일>`. 나머지는 기본값
   - 만들기 전 확인: VPC > 관리형 접두사 목록에서 `com.amazonaws.global.cloudfront.origin-facing` 의 ID 가 `CloudFrontPrefixListId` 기본값(`pl-22a6434b`)과 같은지
   - 스택 옵션 > **스택 실패 옵션: "성공적으로 프로비저닝된 리소스 보존"** 을 권장. 중간(예: CloudFront)에서 실패해도 다 만든 RDS 등을 지우지 않아서, 원인을 고친 뒤 스택 **업데이트**로 이어 갈 수 있다 (기본값이면 전부 지우고 처음부터 다시)
   - IAM 승인 체크
   - 실패하면 이벤트 탭의 `CREATE_FAILED` 사유 확인. PostgreSQL 버전 오류면 RDS > 데이터베이스 생성 화면의 엔진 버전 목록에서 17.x 를 확인해 `DbEngineVersion` 에

3. prod 스택 출력값을 GitHub Environment `prod` 의 Variables 에

   | 변수 | 출력 |
   |---|---|
   | `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` |
   | `CODEDEPLOY_APP` | `CodeDeployApplication` |
   | `CODEDEPLOY_GROUP` | `CodeDeployDeploymentGroup` |
   | `ARTIFACT_BUCKET` | `ArtifactBucket` |
   | `WEB_BUCKET` | `WebBucket` |
   | `CF_DISTRIBUTION_ID` | `DistributionId` |

4. `dev` → `main` 머지 → Actions 에서 승인 → CodeDeploy 첫 배포 + 화면 S3 업로드
5. 데모 데이터: EC2 > prod 서버 한 대 > 연결 > Session Manager → `sudo bash /opt/nansogong/deploy/demo-data/load.sh aws`
6. 확인
   - `https://<도메인>` 접속 · 로그인
   - `https://<도메인>/api/...` 응답 (`/actuator/*` 는 밖에서 403 이 정상)
   - CodeDeploy 콘솔에서 배포 성공, CloudWatch Logs `/nansogong/prod/api` 에 서버 로그
   - CloudWatch 알람 메일 구독 확인 (메일의 인증 링크를 눌러야 받기 시작)
7. 장애 리허설
   - EC2 한 대 강제 종료 → ASG 가 새 서버를 띄우고 CodeDeploy 가 자동으로 마지막 버전을 깐다
   - RDS > 재부팅 > "장애 조치로 재부팅" → Standby 로 전환되는 동안(1~2분) 서버가 다시 연결되는지

## 지우기 (🚨 남겨 두면 계속 과금)

1. prod: S3 > `WEB_BUCKET` · `ARTIFACT_BUCKET` 버킷을 각각 **비우기**
2. CloudFormation 에서 `nansogong-prod` 스택 **삭제** (`DELETE_COMPLETE` 까지 20~30분)
3. dev: `nansogong-dev` 삭제 (고정 IP 도 함께 반납)
4. 다 끝났으면 `nansogong-shared` 삭제 (ECR 이미지 · 예산 알림 · 빌드 역할 · OIDC 공급자). dev · prod 스택이 남아 있으면 Export 를 쓰는 중이라 삭제가 거절된다
5. 직접 지울 것
   - RDS 최종 스냅숏(`DeletionPolicy: Snapshot`): RDS > 스냅숏 (남기면 월 소액)
   - Secrets Manager 비밀(`nansogong/dev`, `nansogong/prod`): 작업 > 보안 암호 삭제 (7~30일 대기 후 삭제)
   - ACM 인증서 2개 (서울 · 버지니아 각각), S3 의 `cf-templates-...` 버킷 (비우기 후 삭제)
6. 며칠 뒤 결제 콘솔(Billing > Bills)에서 남은 과금 항목이 없는지 확인

## 주의

- 서버 이미지는 **arm64(Graviton)** 입니다. Actions 가 만든 이미지만 배포하고, 내 PC 에서 만든 이미지(amd64)는 올리지 않는다
- 테이블은 Flyway 가 만든다. RDS 에서 손으로 표를 만들거나 고치지 않는다 (dev · prod 구조가 달라진다)
- 비밀값을 바꾸면 다시 배포해야 반영된다 (prod: Actions 의 `deploy-prod` Re-run / dev: `update.sh`)
- IAM 역할 권한을 바꿀 때는 콘솔에서 직접 고치지 말고 템플릿을 고친 뒤 스택 **업데이트**(현재 템플릿 교체 → 파일 업로드)로 반영한다. 직접 고치면 다음 업데이트 때 템플릿 내용으로 되돌아간다
- ASG 헬스체크는 EC2 기준입니다. 첫 배포 전에는 서버 컨테이너가 없어서 ALB 헬스체크가 실패하는데, ELB 기준이면 ASG 가 EC2 를 계속 갈아 끼우기 때문 (`prod.yml` 주석)
- ALB 는 CloudFront 에서 오는 요청만 받는다 (보안 그룹 = CloudFront 관리형 접두사 목록). `api.<도메인>` 으로 직접 접속하면 연결되지 않는 것이 정상
- POS · 거래처 · 마이데이터는 MVP 에서 목업이다. prod 에서 목업(WireMock)을 어디에 띄울지는 아직 정하지 않았다 → 정한 뒤 `POS_BASE_URL` 등을 `nansogong/prod` 에 넣는다 (넣지 않으면 서버가 뜨지 않는다)
- prod 의 Prometheus · Grafana 는 아직 템플릿에 없다. 지금은 CloudWatch 지표 · 알람 · 로그로 본다
