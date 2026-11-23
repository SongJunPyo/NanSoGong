# 12. prod 스택 3개(network · data · app)를 스택 하나(prod.yml)로

- 날짜: 2026-11-23
- 요청 · 작성: 경모
- 관련: [11](2026-11-23-11-aws-console-setup.md) (콘솔 구축)

## 요청 · 배경

prod 를 만들 때 스택 3개를 순서대로 만들고(각각 완료를 기다리고), 지울 때도 거꾸로 하나씩 지워야 했다.
콘솔로 구축하는 입장에서는 번거롭고, 나눌 꼭 필요한 이유도 없어서 하나로 합친다.

## 나눌지 판단한 기준

| 경계 | 결정 | 이유 |
|---|---|---|
| network · data · app | **합침** | 셋 다 prod 전용이고 함께 만들고 함께 지운다. CloudFormation 이 스택 안 의존 순서를 알아서 정한다 (리소스 69개, 한도 500개) |
| shared ↔ dev · prod | 나눔 유지 | ECR 이미지 · GitHub OIDC 공급자(계정에 하나) · 빌드 역할을 dev 와 prod 가 함께 쓴다. 합치면 prod 를 지울 때 dev 가 쓰는 이미지 · 권한도 사라진다 |
| dev ↔ prod | 나눔 유지 | 사는 기간이 다르다 (dev 는 계속 켜 두고, 하루 $8.8 인 prod 는 리허설 직전에 만들고 바로 지운다). 같은 스택이면 prod 만 지울 수 없다 |
| ACM 인증서 | 스택 밖 (콘솔) | CloudFront 인증서는 버지니아(us-east-1)에 있어야 하는데, 스택은 한 리전(서울)에만 리소스를 만든다 |

합쳐서 생기는 단점: 중간에 실패하면 기본값으로는 **스택 전체가 롤백**된다 (RDS 30분을 다시 기다림).
→ 스택 옵션의 "스택 실패 옵션: 성공적으로 프로비저닝된 리소스 보존" 으로 피한다 (infra/README.md 에 안내).

## 바꾼 것

| 파일 | 변경 내용 |
|---|---|
| `infra/cloudformation/prod.yml` | **새 파일**. network · data · app 의 리소스를 그대로 합침 (내용 변경 없음). 스택 사이 Export/ImportValue → 같은 스택 안 `!Ref` · `!GetAtt`. ASG 에 `DependsOn`(private 서브넷의 NAT 경로) 추가: 서버가 NAT 보다 먼저 뜨면 User data 의 설치가 실패하기 때문. 입력 칸 묶음 7개 |
| `infra/cloudformation/network.yml` · `data.yml` · `app.yml` | **삭제** |
| `infra/cloudformation/shared.yml` | 주석 · 출력 설명의 `app` → `prod` |
| `infra/README.md` | prod 만들기 · 지우기를 스택 하나 기준으로 |
| `infra/codedeploy/scripts/start.sh`, `application-aws.yml`, `infra/secrets/README.md`, `README.md` | "data · app 스택" 언급 → "prod 스택" |

## 팀원이 할 일

- [ ] 없음 (아직 prod 를 만들지 않았다면)
- [ ] (이미 network · data · app 스택을 만들었다면) S3 버킷 두 개를 비우고 app → data → network 순서로 지운 뒤 `nansogong-prod` 로 다시 만든다. GitHub Environment `prod` 변수 6개도 새 출력값으로

## 확인 방법

- 콘솔에서 `prod.yml` 업로드 시 입력 칸이 7개 묶음으로 보인다
- `nansogong-prod` 스택 출력에 `DeployRoleArn` · `CodeDeployApplication` · `CodeDeployDeploymentGroup` · `ArtifactBucket` · `WebBucket` · `DistributionId` 가 나온다
