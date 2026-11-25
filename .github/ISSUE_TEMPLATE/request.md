---
name: "도메인 요청"
about: "다른 도메인에 service 메서드 · API 추가나 변경을 요청합니다."
title: "[REQUEST] 제공 도메인: "
labels: ["request", "status:todo"]
---

<!-- 다른 도메인의 코드는 직접 고치지 않고 이 이슈로 요청합니다. 제공하는 도메인의 domain:* 라벨을 붙여 주세요. -->

## 요청하는 쪽

- 도메인:
- 관련 이슈: #

## 필요한 것

<!-- 메서드 · API 이름, 입력 → 출력 모양을 적어 주세요. JSON 키는 camelCase입니다. -->

```
예) InventoryService.currentStock(storeId, itemId) → BigDecimal (관리 단위)
```

## 쓰는 곳 · 이유

## 완료 기준

- [ ] 제공 도메인에 메서드 · API 추가
- [ ] `docs/rules/domain.md` 의 "도메인 사이 메서드 계약" 표 갱신
- [ ] 요청한 쪽에서 연결 확인
