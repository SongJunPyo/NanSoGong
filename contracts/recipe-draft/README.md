# 레시피 초안 내부 API 계약 예시 (#35)

Python AI 워커 ↔ Spring 내부 API 가 주고받는 JSON 예시입니다. Java(JUnit) · Python(pytest)이 **같은 파일**로 모양을 검증합니다.
칸 이름 · 모양을 바꿀 때는 이 파일을 먼저 고치고, 양쪽 테스트가 모두 통과해야 합니다.

| 파일 | API | Java 타입 |
|---|---|---|
| `context.response.json` | `GET /internal/ai-jobs/{jobId}/recipe-context` 응답 | `RecipeContextResponse` |
| `validate.request.json` | `POST /internal/ai-jobs/{jobId}/recipe-drafts/validate` 요청 | `RecipeDraftValidateRequest` |
| `validate.response.json` | 위 API 응답 | `RecipeDraftValidateResponse` |

- 키는 camelCase, 금액 · 수량은 숫자(Decimal)입니다.
- 값이 없을 수 있는 칸도 키는 항상 있고 값이 `null` 입니다.
- `missingCosts` 는 단가가 확인되지 않은 **품목 번호(itemId) 목록**입니다. 이름은 같은 `itemId` 의 `lines` 줄에서 찾습니다.
- `reason` 은 코드값입니다: `ITEM_NOT_FOUND` · `ITEM_AMBIGUOUS` · `ITEM_INACTIVE` · `DUPLICATE_ITEM` · `UNKNOWN_UNIT` · `UNIT_MISMATCH` · `INVALID_QTY`
- 요청의 `description` 은 검증에 쓰지 않아 Spring 이 무시합니다.
