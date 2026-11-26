<!--
제목: [TYPE]: 요약 (커밋 타입과 같음: FEAT · FIX · REFACTOR · PERF · DOCS · TEST · STYLE · CHORE)
예: [FEAT]: 판매 재고 차감 API 추가 / [FIX]: 회원가입 이메일 중복 예외 처리 수정
-->

## 1. 개요

<!-- PR의 목적과 핵심 변경을 한두 문장으로 적어 주세요. -->

## 2. 변경 사항

<!-- API · 업무 로직 · DB(마이그레이션) · 화면 · AI 등 주요 변경을 적어 주세요. -->

-

## 3. 테스트

<!-- 실제로 실행한 것만 체크해 주세요. mock으로 확인한 것과 실제 연동으로 확인한 것은 나눠서 적어 주세요. -->

- [ ] 화면 또는 Swagger로 동작 확인
- [ ] 백엔드 흐름 테스트 추가 · 실행 (`cd backend && ./gradlew test`)
- [ ] 프론트 확인 (`cd frontend && npm run lint && npm run build`)
- [ ] 해당 없음 (문서만 변경 등)

추가 테스트 내역:

## 4. 관련 이슈

- Closes #

## 5. 영향 범위

- 영역: <!-- backend / frontend / ai / db / infra -->
- 도메인: <!-- 예: inventory, purchase -->
- 주요 변경 파일:
  - `경로/파일`
- 공용 파일 변경: 없음 <!-- common/, api/client.js, components/ui/, docker-compose*.yml, build.gradle, package.json, .github/ 를 고쳤으면 적어 주세요 -->
- 규칙 문서 갱신: 없음 <!-- docs/rules/… 를 고쳤으면 적어 주세요 -->

## 6. 팀원이 할 일 (pull 받은 뒤)

<!--
pull만으로 끝나지 않고 직접 해야 하는 일이 있으면 적고, PR에 `env-change` 라벨을 붙인 뒤 팀 채팅에도 공유해 주세요.
예: docker compose down -v / npm ci / .env 에 새 키 추가 / 옛 파일 삭제
-->

- 없음

## 7. 리뷰 요청

<!-- 리뷰어가 특히 봐 줬으면 하는 부분이나 고민한 지점을 적어 주세요. -->

## 8. 주의 사항

<!-- 마이그레이션 · 설정 · 환경변수 · 배포 시 주의할 점이 있으면 적어 주세요. 비밀값은 적지 않습니다. -->
