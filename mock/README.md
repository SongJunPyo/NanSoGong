# mock — 외부 연동 목업 서버 (WireMock)

`docker compose up -d` 를 하면 PostgreSQL · Redis 와 함께 **http://localhost:8089** 에 뜹니다.
API 키가 없어도, 실제 POS · 거래처가 없어도 팀원 모두가 같은 응답으로 개발 · 테스트할 수 있게 하는 것이 목적입니다.

| 경로 | 흉내 내는 대상 | 요구사항 | 실제 서비스 |
|---|---|---|---|
| `/nts/v1/status`, `/nts/v1/validate` | 국세청 사업자 상태조회 · 진위확인 | 구현-1-2 | 공공데이터포털 `api.odcloud.kr/api/nts-businessman/v1` |
| `/kma/getVilageFcst`, `/kma/getUltraSrtNcst` | 기상청 단기예보 · 초단기실황 | 구현-1-13 | 공공데이터포털 `apis.data.go.kr/1360000/VilageFcstInfoService_2.0` |
| `/kakao/v2/local/search/address.json` | 주소 → 위경도 | 구현-1-13 | 카카오 `dapi.kakao.com/v2/local/search/address.json` |
| `/holiday/getRestDeInfo` | 특일 정보(공휴일) | 구현-2-5 | 공공데이터포털 `apis.data.go.kr/B090041/openapi/service/SpcdeInfoService` |
| `/naver/v1/datalab/search` | 네이버 데이터랩 검색어 트렌드 | 구현-4-5 | `openapi.naver.com/v1/datalab/search` |
| `/pos/v1/menus`, `/pos/v1/orders`, `/pos/v1/coupons` | POS (메뉴 · 주문 · 쿠폰 등록) | 구현-1-7, 1-9, 1-14, UF-07 | MVP 는 목업 (토스플레이스 · 페이히어는 향후) |
| `/supplier/v1/products`, `/orders`, `/claims` | 가상 거래처 (품목 · 발주 · 정정 요청) | 구현-1-10, 3-9, 3-11, 3-14 | MVP 는 목업 |
| `/mydata/v1/transactions` | 마이데이터 계좌 거래내역 | 구현-1-8 | MVP 는 목업 |

> POS · 거래처 · 마이데이터의 요청/응답 모양은 **팀이 정할 계약의 초안**입니다. 그 연동을 맡은 백엔드 담당이 바꾸면 이 폴더의 JSON 도 함께 바꿔 PR 로 올립니다 (목업 서버 운영은 인프라 담당).

## 일부러 실패시키기 (예외 흐름 개발용)

| 상황 | 방법 | 확인할 요구사항 |
|---|---|---|
| 폐업 사업자 | `b_no` = `9999999999` | 구현-1-2 휴폐업 차단 |
| 휴업 사업자 | `b_no` = `7777777777` | 구현-1-2 |
| 진위확인 불일치 | `b_no` = `8888888888` | 구현-1-2 |
| 기상청 장애 | `nx=0` | 구현-1-13 마지막 값 표시 |
| 데이터랩 인증 실패 | `X-Naver-Client-Id` 헤더 빼기 | 키 누락 처리 |
| 발주 품절 | 헤더 `X-Mock-Scenario: out-of-stock` | 구현-3-9 신규 판매처 탐색 |
| 발주 일부만 접수 | 헤더 `X-Mock-Scenario: partial` | 구현-6-6 부분 성공 |
| 응답 30초 지연 | 헤더 `X-Mock-Scenario: timeout` (발주 · 쿠폰 등록) | 구현-6-6 '결과 확인 중' |
| POS 미지원 쿠폰 조건 | 헤더 `X-Mock-Scenario: unsupported` | UF-07 미지원 안내 |
| 멱등 키 누락 | `Idempotency-Key` 헤더 빼기 (발주 · 쿠폰 등록) | 구현-3-11 중복 전송 방지 |

## 사용법

- 등록된 스텁 목록: http://localhost:8089/__admin/mappings
- 받은 요청 기록 (내 서버가 무엇을 보냈는지 확인): http://localhost:8089/__admin/requests
- 스텁을 고친 뒤 반영: `docker compose restart mock`
- 진짜 API 로 바꾸기: `.env` 에서 해당 `*_BASE_URL` 과 키를 넣는다 (`.env.example` 참고)

날씨 API의 기본 목업은 어떤 주소에도 서울시청 격자를 반환하며 응답에 `mock: true`가 표시됩니다. 실제 매장 위치·날씨 검증에는 사용하지 않습니다. 단기예보는 요청한 발표일·시각과 현재 이후 예보 시각으로 응답합니다. 실제 연동 설정과 오류 계약은 [백엔드 날씨 계약](../docs/rules/backend.md#매장-날씨-조회)을 따릅니다.
