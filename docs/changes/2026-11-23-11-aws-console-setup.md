# 11. AWS 구축을 CLI 없이 콘솔에서: GitHub 역할을 스택으로, 비밀값은 콘솔 JSON 틀로

- 날짜: 2026-11-23
- 요청 · 작성: 경모
- 관련: [09](2026-11-19-09-aws-infra-as-code.md) (인프라 코드화)

## 요청 · 배경

AWS 구축 안내가 `aws cloudformation deploy` 명령과 `secrets-put.sh`(AWS CLI · jq 필요)를 전제로 하고 있었다.
팀원 PC 에 CLI 를 설치하지 않고 **웹 콘솔만으로** 구축할 수 있게 해 달라는 요청.
콘솔로 하면 가장 번거롭고 틀리기 쉬운 곳이 `iam/*.json` 의 꺾쇠 값(계정 ID · 인스턴스 ID · 버킷 이름 등)을 손으로 바꿔 역할 3개를 만드는 부분이었다.

## 바꾼 것

| 파일 | 변경 내용 |
|---|---|
| `infra/cloudformation/shared.yml` | GitHub OIDC 공급자(`CreateGitHubOidcProvider=false` 면 기존 것 사용) · 빌드 역할 `nansogong-build` 를 만든다. 입력 `GitHubRepository` 추가, 출력 `BuildRoleArn`, Export `nansogong-GitHubOidcProviderArn` · `nansogong-GitHubRepository`. 콘솔 입력 칸 묶음 추가 |
| `infra/cloudformation/dev.yml` | dev 배포 역할 `nansogong-deploy-dev` 를 만든다 (이 스택의 EC2 에만 SSM 명령). 출력 `DeployRoleArn`. `AllowedCidr` 형식 검사 추가 (`/32` 빠뜨리면 바로 거절) |
| `infra/cloudformation/app.yml` | prod 배포 역할 `nansogong-deploy-<env>` 를 만든다 (이 스택의 버킷 · CodeDeploy · CloudFront 에만). 출력 `DeployRoleArn` |
| `infra/cloudformation/network.yml` · `data.yml` | 머리 주석의 CLI 명령 → 콘솔 순서. 접두사 목록 · PostgreSQL 버전 확인 방법을 콘솔 기준으로 |
| `infra/iam/*.json` (6개) | **삭제**. 같은 권한을 위 스택들이 만든다 (권한 내용은 그대로) |
| `infra/secrets-put.sh` | **삭제** → `infra/secrets/README.md` (콘솔 절차 · 키 목록) + `dev.example.json` · `prod.example.json` (붙여넣을 틀) |
| `infra/README.md` | 전체를 콘솔 기준으로 다시 씀 (스택 만들기 공통 순서, 역할 표, 삭제 순서) |
| `README.md`, `application-aws.yml`, `codedeploy/scripts/start.sh`, `data.yml` | `secrets-put.sh` · `infra/iam` 언급을 새 위치로 |

### 주의

- 역할 이름을 정해 두었기 때문에 shared · dev · app 스택 검토 화면에서 **"사용자 지정 이름으로 IAM 리소스를 생성할 수 있음을 승인합니다"** 를 체크해야 한다
- dev · app 스택이 shared 스택의 Export 를 쓴다 → shared 를 가장 먼저 만들고 가장 나중에 지운다
- 역할 권한은 콘솔에서 직접 고치지 않는다. 템플릿을 고치고 스택을 업데이트한다

## 팀원이 할 일

- [ ] 없음 (아직 AWS 에 아무것도 만들지 않았다면)
- [ ] (인프라 담당, 이미 JSON 으로 역할 · OIDC 공급자를 만들었다면) 같은 이름의 역할 `nansogong-build` · `nansogong-deploy-dev` · `nansogong-deploy-prod` 를 IAM 에서 삭제한 뒤 스택을 업데이트하거나 만든다. OIDC 공급자는 남겨 두고 shared 스택에 `CreateGitHubOidcProvider=false`
- [ ] (이미 `nansogong-shared` 스택이 있다면) 스택 업데이트 > 현재 템플릿 교체 > 새 `shared.yml` 업로드. 그 뒤 GitHub `AWS_BUILD_ROLE_ARN` 을 출력 `BuildRoleArn` 으로

## 확인 방법

- shared 스택 출력에 `BuildRoleArn`, dev · app 스택 출력에 `DeployRoleArn` 이 나온다
- `dev` 머지 후 Actions 의 build 잡(ECR 푸시)과 deploy-dev 잡(SSM)이 권한 오류 없이 끝난다
- `main` 머지 후 deploy-prod 잡(CodeDeploy · S3 · CloudFront)이 권한 오류 없이 끝난다
