# 레시피 초안 내부 API 계약 예시 (#35)

Python AI 워커 ↔ Spring 내부 API 가 주고받는 JSON 예시입니다. Java(`RecipeDraftContractTest`) · Python(`ai/tests/test_contracts.py`)이 **같은 파일**로 모양을 검증합니다.
칸 이름 · 모양을 바꿀 때는 이 파일을 먼저 고치고, 양쪽 테스트가 모두 통과해야 합니다.

| 파일 | API | Java 타입 |
|---|---|---|
| `context.response.json` | `GET /internal/ai-jobs/{jobId}/recipe-context` 응답 | `RecipeContextResponse` |
| `validate.request.json` | `POST /internal/ai-jobs/{jobId}/recipe-drafts/validate` 요청 (Python 이 실제로 보내는 모양) | `RecipeDraftValidateRequest` |
| `validate.valid.response.json` | 위 API 응답 — 통과 (새 재료 · 단가 없음 포함) | `RecipeDraftValidateResponse` |
| `validate.invalid.response.json` | 위 API 응답 — 실패 | `RecipeDraftValidateResponse` |

- 키는 camelCase 입니다. 값이 없을 수 있는 칸도 키는 항상 있고 값이 `null` 입니다.
- 금액 · 수량: Spring 은 숫자로 내보내고, Python 은 Decimal 을 **문자열**(`"200"`)로 보냅니다. 양쪽 모두 둘 다 받습니다.
- 초안 사용량 칸은 `quantity` 입니다 (Java 레시피 저장과 같은 이름). 검증 결과의 환산 사용량은 `normalizedQty` 입니다.
- 결과 `lines` 는 요청과 같은 순서 · 같은 개수입니다.
- `missingCosts` 는 단가가 확인되지 않은 **등록 품목 번호(itemId) 목록**입니다. 새 재료는 번호가 없어 넣지 않습니다.
- `reason` 코드: `ITEM_NOT_FOUND` · `ITEM_AMBIGUOUS` · `ITEM_INACTIVE` · `DUPLICATE_ITEM` · `UNKNOWN_UNIT` · `UNIT_MISMATCH` · `INVALID_QTY` · `NEW_ITEM`
  - `NEW_ITEM` 만 `ok: true` 와 함께 옵니다 (매장에 없는 새 재료. `valid` 를 막지 않고 `totalCost` 는 `null`).
  - `itemId` 를 줬는데 없으면 `ITEM_NOT_FOUND`, 이름이 사용 중지 품목과 같으면 `ITEM_INACTIVE` 입니다 (새 재료로 보지 않음).
- 요청의 `description` 은 검증에 쓰지 않아 Spring 이 무시합니다.
