# 10. 브랜치 전략: 기능별(feature/…) → 팀원 이름별, 통합 브랜치 develop → dev

- 날짜: 2026-11-19
- 요청 · 작성: 경모
- 관련: [09](2026-11-19-09-aws-infra-as-code.md) (배포 워크플로)

## 요청 · 배경

README 의 브랜치 전략은 `feature/<기능>` 브랜치를 따서 `develop` 에 머지하는 방식이었다.
그런데 팀원들은 이미 **각자 이름으로** 브랜치를 만들었고 (`kyeongmo`, `jpyo` …), 원격 저장소의 통합 브랜치도 `develop` 이 아니라 **`dev`** 로 만들어져 있다.
문서 · 워크플로가 실제 저장소와 달라서, 이대로면 `dev` 에 머지해도 dev 배포가 돌지 않는다.

## 바꾼 것

| 파일 | 변경 내용 |
|---|---|
| `README.md` | 브랜치 전략을 "팀원 이름 브랜치 → PR → `dev` → PR → `main`" 으로 다시 씀 (처음 만들기 · 작업 순서 · 규칙). 세팅 담당자 할 일에 `dev` 브랜치, merge commit 만 허용하는 설정 추가. 그 밖의 `develop` → `dev` |
| `.github/workflows/backend.yml`, `frontend.yml` | 트리거 · 조건의 브랜치 `develop` → `dev` |
| `infra/iam/github-build-role-trust.json` | 빌드 역할을 쓸 수 있는 브랜치 `refs/heads/develop` → `refs/heads/dev` |
| `infra/dev/update.sh`, `infra/cloudformation/dev.yml`, `infra/README.md` | dev EC2 가 받는 브랜치 · 안내 문구 `develop` → `dev` |
| `backend/src/main/resources/application-dev.yml` | 첫 줄 주석: dev 는 `SPRING_PROFILES_ACTIVE=dev`, `dev` 브랜치 머지 때 배포 |
| `docs/changes/2026-11-19-09-aws-infra-as-code.md` | 같은 날 아직 머지 전인 기록이라 `develop` → `dev` 로 함께 고침 |

### 이름 브랜치에서 주의할 것

- 이름 브랜치는 계속 쓰는 브랜치라 **Squash 머지를 쓰지 않는다**. Squash 로 머지하면 다음 PR 에 이미 머지한 커밋이 다시 나오고 충돌한다 → GitHub 설정에서 merge commit 만 허용
- `dev` 의 최신 내용은 `git merge origin/dev` 로 받는다. push 한 커밋을 `rebase` · `push --force` 하지 않는다

## 팀원이 할 일

- [ ] 내 이름 브랜치가 없으면: `git switch dev && git pull && git switch -c <내 이름> && git push -u origin <내 이름>`
- [ ] 작업 시작 전마다 `git fetch origin && git merge origin/dev`
- [ ] PR 대상(base)은 `main` 이 아니라 **`dev`**
- [ ] (저장소 관리자) Settings > Branches: `main` · `dev` 보호 규칙 / Settings > General > Pull Requests: "Allow merge commits" 만 켜기
- [ ] (인프라 담당, 이미 역할을 만들었다면) IAM 빌드 역할 신뢰 정책의 `refs/heads/develop` 을 `refs/heads/dev` 로 수정

## 확인 방법

- 이름 브랜치 → `dev` PR 에서 `backend / test` · `frontend / check` 가 돈다
- `dev` 에 머지되면 Actions 에서 build · deploy-dev 잡이 돈다 (AWS 변수를 넣기 전에는 "건너뜀")
