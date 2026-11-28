# 백엔드 규칙

Spring Boot(`backend/`) 코드 규칙입니다. 구조의 기준은 수업 저장소 [WONIT-A/07_cicd](https://github.com/WONIT-A/07_cicd)의 `src/main/java/com/example/wonit/` 입니다. 클래스 모양이 애매하면 07_cicd의 같은 계층 파일(`AccountController`, `AccountService`, `Account`, `AccountResponse`, `AccountNotFoundException`, `BankTools` 등)을 참고합니다.

- 표 · 칸 · Flyway · 매장 분리는 [DB 규칙](db.md)을 봅니다.
- 도메인끼리 부르는 메서드는 [도메인 규칙](domain.md#도메인-사이-메서드-계약)을 봅니다.
- Python AI 서비스와의 경계는 [아키텍처](architecture.md#spring과-python의-경계)를 봅니다.

## 패키지 구조 (계층별)

```
backend/src/main/java/com/nansogong/
├── common/       설정 · 보안 · 공통 처리 (SecurityConfig, ExternalApiConfig, AppProperties, GlobalExceptionHandler …)
├── controller/   URL을 받아 service 호출
├── service/      업무 규칙 · 계산 · @Transactional
├── repository/   JPA Repository
├── model/        @Entity
├── dto/          요청 · 응답 record
├── exception/    BusinessException + 업무 예외
└── ai/           (비어 있음) AI 흐름은 Python 서비스에서 만든다
backend/src/main/resources/
└── db/migration/ Flyway SQL
```

- **기능별 패키지(`com.nansogong.inventory` 등)를 새로 만들지 않는다.** 도메인은 클래스 이름 접두사로 나눈다.
- 위 패키지 말고 새 패키지가 필요해 보이면, 07_cicd에 같은 역할의 패키지가 있는지 먼저 확인한다. 없으면 만들기 전에 사용자에게 묻는다.

## 계층별 규칙

| 계층 | 규칙 |
|---|---|
| Controller | 로직 없이 service 호출 · DTO 변환만 한다. 토큰 주인은 `@AuthenticationPrincipal Jwt jwt` → `jwt.getSubject()` 로 얻는다 |
| REST | URL은 명사, 동작은 HTTP 메서드로 표현한다. 생성 `201`, 삭제 `204`, 목록은 `Page<>` |
| DTO | `record` + `static from(Entity)`. **Entity를 그대로 응답하지 않는다** |
| 검증 | 요청 DTO에 `@NotNull` · `@Positive` 등을 달고 Controller에서 `@Valid` 를 붙인다 |
| Entity | `@Data` 금지, `@Getter` 를 쓴다. 값은 setter 대신 업무 메서드(`approve()`, `cancel()`)로 바꾼다 |
| 돈 · 수량 | `BigDecimal`. 비교는 `compareTo` 로 한다 (`equals` 금지). 자릿수는 [DB 규칙](db.md#이름--타입) |
| 예외 | `BusinessException(HttpStatus, code, message)` 을 상속한 업무 예외만 추가한다. **`GlobalExceptionHandler` 는 고치지 않는다** |
| 로그 | `@Slf4j`, `log.info("… {}", 값)`. 문자열 `+` 연결 금지. 개인정보 · 토큰을 로그에 남기지 않는다 |
| 매장 분리 | service 맨 앞에서 `StoreService.checkOwner(memberId, storeId)` 를 부른다 ([DB 규칙](db.md#매장-분리)) |
| 다른 도메인 | 다른 도메인의 repository · Entity를 직접 쓰지 않고 그 도메인의 **service 메서드**를 부른다 |
| 스케줄 | `@Scheduled` 에는 반드시 `@SchedulerLock` 을 붙인다 (서버가 여러 대여도 한 번만 실행). 시간대는 Asia/Seoul |
| 외부 API | `common/ExternalApiConfig` 의 `xxxRestClient` 를 쓴다. 새 클라이언트를 따로 만들지 않는다 |

예외 예시:

```java
public class InventoryItemNotFoundException extends BusinessException {
    public InventoryItemNotFoundException(Long id) {
        super(HttpStatus.NOT_FOUND, "INVENTORY_ITEM_NOT_FOUND", "품목을 찾을 수 없습니다: " + id);
    }
}
```

## Python 서비스용 내부 API

- Python(FastAPI · LangGraph)이 부르는 내부 API는 프론트용 공개 API(`/api/**`)와 나눈다. 서비스 인증과 매장 범위 검증을 적용한다.
- 내부 API도 계산 · 검증 · 저장은 도메인 service가 한다. Controller에 업무 로직을 넣지 않는다.
- 경로 · 인증 방식은 아직 정하지 않았다 ([아키텍처 미정 사항](architecture.md#미정-사항)). 계약이 정해지면 이 절에 적는다.
- 내부 계약의 JSON은 camelCase다. 금액 · 수량은 `BigDecimal`, 시간은 offset이 붙은 ISO 8601로 주고받는다.

## 외부 연동 · 설정

- 외부 API는 기본이 목업(`mock/`)이다. 응답 모양을 바꾸면 `mock/mappings/*.json` 도 같은 PR에서 고친다.
- `app.*` 설정을 추가하면 `application.yml` 과 `common/AppProperties.java` 를 함께 고친다. AWS 값이면 `application-aws.yml` 도 고친다.
- 새 환경변수를 추가할 때 함께 바꿀 곳은 [AGENTS.md 환경 규칙](../../AGENTS.md#4-환경--보안--github)을 본다.

### 매장 날씨 조회

- `GET /api/stores/{storeId}/weather`는 로그인한 회원의 매장 주소를 기준으로 시간별 예보를 반환한다. `WeatherService`가 캐시·외부 호출 전에 `StoreService.checkOwner`를 확인하고 `getMine`으로 저장된 주소를 읽는다. 주소·좌표·회원 번호는 요청 본문에서 받지 않는다.
- 카카오 주소 검색(`/v2/local/search/address.json`)의 `x`(경도)·`y`(위도)를 기상청 5km 격자로 변환하고, 기존 `kmaRestClient`로 `/getVilageFcst`를 호출한다. 매장 표·회원가입·프론트는 변경하지 않는다. 좌표는 DB에 추가하지 않는다.
- 응답은 `{ storeId, source: "KMA", mock, forecast }`다. `forecast`는 `{ kind: "FORECAST", issuedAt, forecastAt, fetchedAt, nx, ny, temperatureC, sky, precipitationType, precipitationProbability, precipitationAmount }`다. `issuedAt`·`forecastAt`은 한국 시간 오프셋이 있는 ISO 8601, `fetchedAt`은 수집 시각이다. `temperatureC`는 **관측 현재 기온이 아니라 `forecastAt`의 예보 기온**이다.
- `sky`는 `CLEAR`·`PARTLY_CLOUDY`·`CLOUDY`, `precipitationType`은 `NONE`·`RAIN`·`RAIN_AND_SNOW`·`SNOW`·`SHOWERS`다. 강수 확률은 0~100이다. `precipitationAmount`는 `강수없음`·`1mm 미만`·구간 값 등 공급자 표현을 유지하며 누락은 `null`이다. 누락·실패를 0도·맑음·강수 0으로 채우지 않는다.
- 02·05·08·11·14·17·20·23시 중 제공 지연 20분을 고려한 최신 발표분을 선택한다. 한국 시간 자정 전후의 날짜 전환을 처리한다. 명확한 `03`(자료 없음)이면 직전 발표분을 한 번 조회한다. 결과 코드를 확인하고 최대 10,000행까지 페이지를 모두 조회한다. 발표 시각·격자·중복 값이 모순되면 거절한다.
- 현재 시간대부터 가장 가까운 시간별 예보를 선택한다. 최대 3시간 뒤까지만 허용한다. 주소 검색 결과가 여러 개이면 첫 번째 위치를 임의로 사용하지 않는다. 서버별 주소 캐시는 24시간·최대 256개, 격자·발표분별 예보 캐시는 10분·최대 128개다. 주소가 바뀌면 새 주소로 조회하고, 캐시 사용 때도 매장 권한을 확인한다. 실패 결과는 저장하지 않는다.
- 실제 호출은 `KAKAO_BASE_URL`·`KAKAO_REST_API_KEY`·`KMA_BASE_URL`·`KMA_SERVICE_KEY`를 함께 설정한다. 기상청 키는 원본(Decoding)을 URI 변수로 한 번 인코딩한다. 기존 국세청 키는 유지한다. 목업 호출에는 실제 키를 전달하지 않는다. 한쪽만 목업이면 설정 오류로 거절한다. 설정 목록은 [Secrets 안내](../../infra/secrets/README.md#키-목록), 목업 데이터는 [목업 안내](../../mock/README.md)를 따른다.
- 오류는 `{ code, message }`다. 주소 미설정은 `409 STORE_ADDRESS_REQUIRED`, 미검색·다중 후보는 `422 STORE_ADDRESS_NOT_FOUND`·`STORE_ADDRESS_AMBIGUOUS`, 다른 매장은 `403 FORBIDDEN`이다. 설정 누락·외부 장애·자료 없음은 `503`, 모순·누락된 응답은 `502`다. 공급자 오류 원문·인증키·주소를 로그·응답·예외 cause에 넣지 않는다. 공용 `BusinessException` 구현 전에는 기존 인증 API처럼 `ResponseStatusException` 기반 `WeatherLookupException`과 날씨 전용 오류 변환을 사용한다.

### 홈 공휴일 조회

- `GET /api/stores/{storeId}/home/holidays?year=2026&month=12`는 전국 공통 공휴일을 반환한다. `year`(네 자리)·`month`(1~12)는 필수다. `HomeHolidayService`가 캐시·외부 호출 전에 `StoreService.checkOwner`를 확인한다. 매장 주소는 필요 없으며 공휴일을 매장의 휴무일로 단정하지 않는다.
- 응답은 `{ storeId, source: "KASI", mock, year, month, fetchedAt, holidays }`다. `holidays`는 `Page<{ date, name }>`이며 `date`는 한국 달력의 `YYYY-MM-DD`, `fetchedAt`은 원천 조회 시각이다. 기본 페이지 크기는 50, 정렬은 `date` 오름차순이다. `date`·`name` 정렬만 허용한다.
- `HomeHolidayClient`는 기존 `holidayRestClient`로 `/getRestDeInfo`를 호출한다. `solYear`·두 자리 `solMonth`·`pageNo`·`numOfRows=100`·`_type=json`을 전달한다. 단건 객체·복수 배열을 정규화하고 `isHoliday=Y`만 반환한다. 같은 날짜의 다른 공휴일명은 보존한다.
- 공급자 결과 코드·페이지·건수·날짜·중복 식별자를 검증하며 최대 10페이지·1,000행까지 읽는다. 전체 페이지가 성공한 뒤에만 반환한다. 명확한 성공 응답의 `totalCount=0`은 빈 페이지, 실패·불완전 응답은 오류다. 실패를 공휴일 0건으로 바꾸지 않는다.
- 서버별 캐시는 연월별로 공유하며 6시간·최대 24개월이다. 0건도 정상 응답이면 캐시하고 실패·부분 결과는 캐시하지 않는다. 캐시를 사용해도 매장 권한을 먼저 확인한다. DB 표·매장 설정·프론트는 변경하지 않는다.
- 실제 호출은 기존 `HOLIDAY_BASE_URL=https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService`와 `DATA_GO_KR_SERVICE_KEY` 원본(Decoding) 키를 사용한다. 키는 URI 변수로 한 번 인코딩한다. 이 키는 국세청과 공유하는 기존 설정이므로 임의로 교체하지 않는다. 키 없는 기본 목업에는 실제 키 대신 `mock-key`만 보낸다. 목업의 0건은 실제 달력 검증에 사용하지 않는다 ([목업 안내](../../mock/README.md)).
- 오류는 `{ code, message }`다. 입력 오류는 `400 INVALID_REQUEST`, 다른 회원의 매장은 `403 FORBIDDEN`, 인증 설정 누락은 `503 HOLIDAY_NOT_CONFIGURED`, 외부 HTTP·통신·결과 코드 실패는 `503 HOLIDAY_UNAVAILABLE`, 잘못된 원천 응답은 `502 HOLIDAY_INVALID_RESPONSE`다. 공용 예외 구현 전에는 공휴일 Controller 범위의 오류 처리만 사용하며 원천 본문·URL·키·예외 cause는 응답이나 로그에 넣지 않는다.

### 국세청 사업자 상태조회

- API 계약은 `POST /api/auth/business-status`, 요청은 `{ "bizRegNo": "숫자 10자리" }`다. 가입 전 조회이므로 로그인 없이 호출한다. 인증키는 요청에서 받지 않는다.
- `AuthBusinessStatusService`가 기존 `ntsRestClient`와 `app.external.data-go-kr-service-key`를 사용해 국세청 `/status`를 호출한다. API 키·사업자번호·외부 오류 원문은 로그에 남기지 않는다.
- 응답은 `{ "bizRegNo": "숫자 10자리", "status": "ACTIVE" }`다. `status`는 `ACTIVE`(계속사업자), `SUSPENDED`(휴업), `CLOSED`(폐업), `NOT_FOUND`(명확한 미등록 응답)다.
- 잘못된 입력은 `400 INVALID_BUSINESS_NUMBER`, 외부 통신·HTTP 오류는 `503 NTS_UNAVAILABLE`, 누락·불일치·알 수 없는 응답은 `502 NTS_INVALID_RESPONSE`다. 오류 본문은 `{ "code": "...", "message": "사용자 안내" }`다.
- 공용 `BusinessException`·`GlobalExceptionHandler` 구현 전에는 기존 인증 코드와 같은 `ResponseStatusException`을 사용하고 이 Controller 안에서만 오류를 변환한다. 공용 처리가 생기면 그 계약으로 합친다.
- 이 API는 대표자명·개업일자 진위확인, 가입 허가, 매장 저장·상태 변경을 수행하지 않는다. 회원가입 화면은 아래 진위확인 API를 사용한다.
- 실제 주소·키는 기존 환경변수 `NTS_BASE_URL`, `DATA_GO_KR_SERVICE_KEY`로 전달한다. 실제 국세청과 목업을 어느 쪽으로 호출했는지 구분해서 검증한다. 기존 목업은 별도 미등록 시나리오가 없어 `0000000000`도 계속사업자로 응답한다.

### 국세청 사업자 진위확인

- `POST /api/auth/business-verifications`는 가입 전 단건 진위확인 API다. 요청은 `{ "bizRegNo": "숫자 10자리", "ownerName": "대표자명", "openingDate": "YYYYMMDD" }`다. 이름은 50자 이내이며 개업일자는 실제 달력 날짜인지 검증한다.
- `AuthBusinessVerificationService`가 기존 `ntsRestClient`·인증키로 `/validate`를 호출한다. 외부 요청은 `businesses: [{ b_no, start_dt, p_nm }]`이며 인증키·개인정보·외부 응답 원문을 로그에 남기지 않는다.
- 응답은 `{ "bizRegNo": "숫자 10자리", "status": "ACTIVE" }`다. `valid=01`이고 요청 정보가 일치하며 영업 상태가 `01`일 때만 `ACTIVE`다. 휴업은 `SUSPENDED`, 폐업은 `CLOSED`, 진위확인 불가는 `MISMATCH`다.
- 성공 응답의 `request_param`이 보낸 세 값과 일치하는지, 중첩 `status.b_no`가 같은 번호인지 확인한다. 누락·모순·알 수 없는 값은 `502 NTS_INVALID_RESPONSE`다. `valid=02` 응답은 중첩 영업 상태가 없어도 처리하며 상태조회로 대체해 성공 처리하지 않는다.
- 입력 오류는 `400 INVALID_BUSINESS_INFORMATION`, 통신·외부 HTTP 오류는 `503 NTS_UNAVAILABLE`다. 원본 국세청 오류 대신 `{ code, message }`를 반환한다. 오류 변환은 상태조회와 같은 방식으로 이 Controller에만 적용한다.
- 이 API는 회원·매장을 저장하거나 가입 권한·서버 검증 토큰을 발급하지 않는다. 실제 가입 처리의 검증·DB 중복 검사와 별개의 조회 API다.
- 목업 진위확인 번호는 `0000000000`·`8888888888`(확인 불가), `7777777777`(휴업), `9999999999`(폐업), 그 외(정보 일치·영업 중)다. 실제 국세청의 번호 판정과 구분한다.

### 회원가입 · 로그인 · 매장 저장

| 요청 | 입력 · 결과 |
|---|---|
| `GET /api/auth/login-id/exists?loginId=...` | `{ exists }` |
| `POST /api/auth/phone-verifications` | `{ name, phone }` → `{ challengeId, expiresAt }` |
| `POST /api/auth/phone-verifications/{challengeId}/confirmations` | `{ name, phone, code }` → `{ verificationToken, expiresAt, name, phone }` |
| `POST /api/auth/signup` | `{ loginId, password, name, phone, phoneVerificationToken, stores: [{ bizRegNo, ownerName, openingDate, bizName }] }` → `201 { memberId, loginId, businessCount }` |
| `POST /api/auth/login` | `{ loginId, password, rememberMe? }` → Access 토큰 + HttpOnly Refresh 쿠키 |
| `GET /api/auth/csrf` | Refresh 쿠키 → `{ csrfToken }` (메모리에만 보관) |
| `POST /api/auth/refresh` | Refresh 쿠키·CSRF 헤더 → Access + 회전한 Refresh 쿠키 |
| `POST /api/auth/logout` | Refresh 쿠키·CSRF 헤더 → 현재 세션 종료·쿠키 삭제, `204` |
| `GET /api/auth/capabilities` | `{ verificationMode, smsReady, phoneChangeAvailable, withdrawalAvailable, withdrawalReason }` |
| `GET /api/me` | JWT 주인의 회원정보 |
| `PATCH /api/me` | `{ name, currentPassword?, password?, passwordConfirm? }` → 저장한 `MemberResponse` |
| `POST /api/me/phone-verifications` | `{ currentPassword, phone }` → `{ challengeId, expiresAt }` |
| `POST /api/me/phone-verifications/{challengeId}/confirmations` | `{ phone, code }` → `{ verificationToken, expiresAt }` |
| `PATCH /api/me/phone` | `{ phone, verificationToken }` → 저장한 `MemberResponse` |
| `GET /api/stores` | JWT 주인의 매장 목록 `Page<StoreResponse>` |
| `GET /api/stores/{storeId}` | 내 매장 상세. 다른 계정은 `403` |
| `PUT /api/stores/{storeId}` | `{ name, category, address, openTime, closeTime, closedDays }` → 저장한 매장. 다른 계정은 `403` |

- 매장 목록의 기본 정렬은 `id`다. `sort`는 `id`, `name`, `bizName`, `bizRegNo`, `ownerName`, `businessOpenedOn`, `verifyStatus`, `verifiedAt`, `category`, `address`, `createdAt`, `updatedAt`만 허용한다. 알 수 없는 칸·중첩 경로·JSON 칸은 `400 INVALID_REQUEST`다. 정렬·페이지 지정 후에도 JWT 주인의 매장만 조회한다.
- 휴대전화는 [SMS 수신 인증](#sms-수신-인증-sens)을 따른다. `MOCK`의 고정 코드는 개발용이며 `aws`·`prod` 프로필에서는 거절한다. `REAL`은 SENS 설정이 준비되어야 하며 실패 시 Mock으로 대체하지 않는다.
- 인증 요청은 3분, 확인 증명은 10분이다. `expiresAt`은 epoch milliseconds다. 증명은 이름·번호에 묶이고 1회만 소비한다. Redis에는 개인정보 대신 HMAC 지문, 증명 원문 대신 해시 키를 저장한다. 코드 오류는 요청별 5회로 제한한다.
- 가입에는 사업자 1~100개가 필요하다. 비밀번호는 영문·숫자·특수문자 포함 8~64자, 공백 제외, UTF-8 72바이트 이하다. BCrypt로 해시한다.
- 가입 서버가 국세청 `/validate`에 전체 목록을 한 번에 보내고 모든 결과의 개수·번호·요청 정보·영업 상태를 확인한다. 화면의 확인 결과는 신뢰하지 않는다. 외부 확인 중 DB 트랜잭션을 유지하지 않는다.
- 확인 후 `AuthSignupPersistenceService` 트랜잭션에서 회원과 `StoreService`의 검증된 매장을 함께 저장한다. 회원 ID는 서버가 생성한다. 동시 가입은 정렬된 PostgreSQL 트랜잭션 잠금과 DB 유일 제약으로 중복을 막는다. 저장 실패 시 전체를 취소하고 휴대전화 증명은 원래 만료 시각 안에서 복원한다.
- 가입의 입력 오류는 `400`, 중복은 `409`다. 인증·매장 Controller 범위의 `AuthExceptionHandler`가 `{ code, message }`를 반환한다. 공용 예외 구현이 생기면 그 계약으로 합친다.
- 매장 기본정보의 시간은 둘 다 비우거나 서로 다른 `HH:mm`으로 입력한다. 마감이 더 이르면 다음 날이다. 휴무는 `mon`~`sun` 중 중복 없이 입력한다. 저장하면 `onboardingStatus.storeBasics=true`다.
- 새로고침 시 [로그인 유지 계약](#로그인-유지--서버-로그아웃)으로 세션을 복원하고 DB 회원·매장을 다시 조회한다.

### 회원정보 조회 · 수정

- `GET /api/me`와 `PATCH /api/me`는 인증된 JWT의 회원 번호만 사용한다. 수정 입력에서 아이디·전화번호·회원 번호·계정 상태·비밀번호 해시는 쓰기 대상이 아니며 추가 필드는 무시한다.
- 이름은 공백을 제거한 뒤 1~50자로 검증한다. 이름 변경은 사업자 대표자 정보나 전화번호 인증 시각을 변경하지 않는다. 아이디는 변경할 수 없다. 전화번호 변경은 [전용 계약](#전화번호-변경)의 현재 비밀번호 확인·새 번호 SMS 인증을 거친다.
- 비밀번호를 바꿀 때만 `currentPassword`·`password`·`passwordConfirm`을 모두 보낸다. 현재 비밀번호를 BCrypt로 확인하고 새 비밀번호의 기존 가입 규칙·UTF-8 72바이트 제한·확인 일치를 검증한다. 비밀번호 원문과 해시는 응답에 넣지 않는다.
- 이름과 비밀번호는 한 트랜잭션으로 저장한다. 비밀번호 재설정과 같은 회원 행 잠금을 사용하며, 잠금을 얻은 뒤에도 현재 계정 상태와 JWT의 자격 버전을 다시 확인한다. 잘못된 현재 비밀번호나 저장 실패 시 이름도 바뀌지 않는다.
- 이름만 수정하면 기존 JWT는 유지된다. 비밀번호를 바꾸면 기존 자격 버전 검증으로 해당 회원의 모든 이전 Access와 Refresh를 거절한다. 다른 계정에는 영향을 주지 않는다.
- 성공은 `200 MemberResponse`, 입력·현재 비밀번호 오류는 `400`, 만료된 자격은 `401`, 저장소 오류는 기존 인증 오류 계약의 `503`이다. DB 저장 성공 후에만 화면에서 성공을 안내한다.

### 비밀번호 재설정 (개발용)

| 요청 | 입력 · 결과 |
|---|---|
| `POST /api/auth/password-resets` | `{ loginId, phone }` → `{ challengeId, expiresAt }` |
| `POST /api/auth/password-resets/{challengeId}/confirmations` | `{ loginId, phone, code }` → `{ resetToken, expiresAt }` |
| `POST /api/auth/password-resets/completions` | `{ resetToken, password, passwordConfirm }` → `204` |

- 실제 SMS 연동 전에는 고정 데모 계정 `demo-office` / `01000009001`, `demo-campus` / `01000009002`, `demo-home` / `01000009003`만 허용한다. DB의 현재 전화번호도 이 가짜 번호와 같아야 한다. 일반 가입 API는 이 데모 ID의 하이픈을 허용하지 않는다.
- 개발용 재설정은 `MOCK` 모드에서만 허용한다. `aws`·`prod` 프로필에서는 `503`으로 거절한다. `REAL`의 일반 계정 흐름은 아래 계약을 따르며 개발용 성공으로 대체하지 않는다.
- 요청은 계정별 10분에 3회, 원격 주소별 10분에 20회다. 프록시 전달 헤더를 신뢰해 제한을 우회하게 하지 않는다. 초과는 `429 RATE_LIMITED`다.
- 계정이 없거나 번호가 다르거나 대상이 아니어도 같은 요청 응답을 반환하며 인증 증명을 발급하지 않는다. Redis에는 개인정보 대신 목적별 HMAC 지문과 내부 ID·자격 버전을 저장한다.
- 요청은 3분·오류 시도 5회, 재설정 권한은 5분·1회다. 가입용 휴대전화 증명과 서로 사용할 수 없다. 인증·재설정 권한 원문과 비밀번호를 로그에 남기지 않는다.
- 새 비밀번호는 가입과 같은 정책·확인 입력을 검증하고 BCrypt로 저장한다. DB 행 잠금과 Redis 증명 소비로 같은 계정에 대한 동시 변경을 한 번만 허용한다. DB 변경 실패 시 비밀번호는 롤백하고 재인증을 요구한다.
- JWT의 `credentialVersion`은 내부 회원 ID·현재 비밀번호 해시의 HMAC이다. 비밀번호를 바꾸면 이전 버전의 JWT는 거절한다. 이전 형식 JWT도 재로그인이 필요하다. 서명·만료 검증도 함께 유지한다. 회원 표에 새 칸은 추가하지 않는다.

### SMS 수신 인증 (SENS)

- `REAL`은 Naver Cloud SENS [SMS v2](https://api.ncloud-docs.com/docs/en/sens-sms-send)를 사용한다. 서비스 ID·NCP Access/Secret Key·등록 발신번호가 모두 필요하다. 공식 [서명 규격](https://api.ncloud-docs.com/docs/en/common-ncpapi)에 따라 메서드·경로·동일 timestamp·Access Key를 HMAC-SHA256/Base64로 서명한다. 외부 클라이언트는 `ExternalApiConfig.sensRestClient`다.
- 설정 변수는 `SENS_SERVICE_ID`, `SENS_ACCESS_KEY`, `SENS_SECRET_KEY`, `SENS_FROM`, `VERIFICATION_MODE=real`이다. 키는 환경변수/Secrets로만 전달한다. SENS 설정의 문자열 표현은 비밀을 가린다. 공급자 오류 원문·인증번호·전화번호·키는 로그나 오류 응답에 넣지 않는다.
- HTTP `202`와 본문의 `statusCode=202`, `statusName=success`, 유효한 `requestId`를 모두 확인한다. 이는 발송 요청 접수다. 코드 확인 전에는 인증 성공이나 권한을 발급하지 않는다. 발송 실패·시간 초과·모순된 응답은 `503`이며 개발용 코드로 대체하지 않는다. 실제 수신 여부는 환경별 실발송으로 별도 검증한다.
- 서버 `SecureRandom`이 6자리 코드를 생성한다. Redis에는 코드의 HMAC과 목적·대상 지문만 저장한다. 코드는 문자 본문으로만 전달한다. 요청 응답·화면에는 코드를 넣지 않는다.
- 기존 인증의 3분 만료·실패 5회 제한과 재설정의 10분당 계정 3회·IP 20회 제한을 사용한다. 실제 SMS는 수신 번호도 10분당 3회로 제한한다. 요청 IP는 서버가 본 주소이며 임의의 전달 헤더로 우회하지 않는다.
- 재발송 예약 시 이전 challenge를 폐기한다. 발송 중인 요청이 있으면 `409`다. 실패 시 이전 코드를 복구하지 않는다. 발송 접수 후에만 확인할 수 있고, 코드 확인·소비는 Redis 원자 연산이다.
- 증명은 `SIGNUP`·`PASSWORD_RESET`·`PHONE_CHANGE` 목적과 대상에 묶인다. 가입 증명 10분, 재설정·번호 변경 증명 5분이며 1회 소비한다. 토큰 원문 대신 HMAC 키를 저장한다. 저장 실패 시 가입은 기존 만료 안에서 복원하지만 비밀번호·전화번호 변경은 재인증한다.

### 일반 계정 비밀번호 재설정

- 위 재설정 API를 `REAL` 모드에서 일반 ACTIVE 계정까지 제공한다. 현재 가입 전화번호와 아이디가 모두 일치하는 경우에만 실제 SMS를 요청한다. 잘못된 정보에도 같은 형태의 challenge 응답을 반환하며 증명은 발급하지 않는다.
- SMS와 재설정 권한은 회원 ID·현재 자격 버전·가입 전화번호·재설정 목적에 묶인다. 다른 계정·가입·번호 변경 증명은 쓸 수 없다. 증명 확인 후 DB 행 잠금 안에서 계정 상태·자격 버전·가입 전화번호를 재확인하고 증명을 소비한다.
- 저장 성공 시 해당 계정의 이전 비밀번호 자격에 속한 Access·Refresh는 거절한다. 여러 증명의 동시 저장도 하나만 허용한다. DB 실패 시 비밀번호를 롤백하고 재인증을 요구한다. 실제 SMS가 준비되지 않으면 `503`이다. MOCK의 데모 제한은 그대로 유지한다.

### 전화번호 변경

- JWT의 회원 ID만 사용한다. `POST /api/me/phone-verifications`에서 현재 비밀번호로 재인증하고 새 번호로 SMS를 요청한다. 외부 발송 동안 DB 트랜잭션을 유지하지 않는다.
- 확인한 증명은 회원 ID·자격 버전·기존 전화번호·새 전화번호·PHONE_CHANGE 목적에 묶인다. 코드를 확인한 것만으로 DB를 변경하지 않는다. `PATCH /api/me/phone`에서 행 잠금 후 증명을 검증·소비하고 `phone`·`phone_verified_at`만 저장한다.
- 다른 회원·번호·목적의 증명이나 비밀번호·번호 변경 전의 증명은 거절한다. 실패 시 DB를 롤백한다. MOCK으로 전화번호 변경을 허용하지 않는다. SMS 수신 확인이며 명의·실명 확인은 수행하지 않는다.

### 로그인 유지 · 서버 로그아웃

- Access 30분·Refresh 14일의 기존 설정을 사용한다. Access는 메모리의 Bearer 토큰, Refresh는 호스트 전용 `nansogong-refresh` HttpOnly 쿠키다. Path는 `/api/auth`다. `rememberMe=true`만 남은 세션 기간을 Max-Age로 설정하며 미선택은 브라우저가 관리하는 세션 쿠키다.
- Redis에 세션 ID·회원 ID·자격 버전·Refresh HMAC·회전 이력·절대 만료 시각을 둔다. Refresh 원문은 저장하지 않는다. 회전해도 최초 14일 만료를 연장하지 않는다. Access는 Redis 세션 상태와 기존 `credentialVersion`을 모두 검증한다. 이전의 sid 없는 JWT는 재로그인이 필요하다.
- Refresh는 원자적으로 회전한다. 이미 사용한 진짜 토큰의 재사용은 그 세션만 종료한다. 임의의 잘못된 토큰으로 다른 세션을 종료할 수 없다. 종료·만료·재사용된 세션은 아직 JWT 만료 전이어도 Access와 Refresh를 거절한다. 비밀번호 변경·LOCKED·WITHDRAWN 상태도 갱신 시 DB에서 재검사한다.
- `GET /api/auth/csrf`가 현재 Refresh에 묶인 HMAC 토큰을 반환한다. 갱신·로그아웃에는 같은 쿠키와 `X-CSRF-Token`·`X-Nansogong-Auth: 1`을 요구한다. 로그인도 `X-Nansogong-Auth: 1`을 요구해 단순 폼 요청을 거절한다. Origin이 있으면 서버가 확인한 요청의 scheme·host·port가 같은 출처이거나 CORS의 정확한 허용 목록에 있어야 한다. 임의의 `Forwarded`·`X-Forwarded-*`로 허용 출처를 결정하지 않는다. 쿠키 인증 전용 필터에서 확인하며 Bearer 전용 업무 API에는 쿠키로 접근 권한을 주지 않는다.
- Swagger의 로그인·갱신·로그아웃에는 필수 헤더 입력을 표시한다. `X-Nansogong-Auth`의 기본값은 `1`이다. 갱신·로그아웃의 `X-CSRF-Token`에는 같은 브라우저 쿠키로 `/api/auth/csrf`에서 방금 조회한 값을 입력한다. 인증 Controller에는 전역 Bearer 요구를 붙이지 않는다. 로그인 응답의 Access를 Authorize에 입력하면 업무 API를 확인할 수 있다.
- 쿠키·Access·CSRF 응답은 `Cache-Control: no-store`다. CORS는 기존 정확한 Origin·credentials 설정을 유지한다. 현재 로컬·dev HTTP는 Secure=false가 기본이며 HTTPS 환경은 true로 명시한다. SameSite 기본 Lax, 서로 다른 사이트가 필요한 환경만 None+Secure=true로 명시한다. 관련 변수는 [환경변수 목록](../../infra/secrets/README.md#키-목록)을 따른다.
- 로그아웃은 현재 쿠키의 세션을 종료하고 동일 속성의 만료 쿠키를 반환한다. 해당 세션의 모든 Access도 차단한다. 다른 기기 세션을 일괄 종료하지 않는다. 저장소 오류는 인증을 허용하지 않으며 로그아웃 성공으로 표시하지 않는다.
- JWT 검증에는 회원 자격 DB 조회와 Redis 세션 조회가 각각 필요하다. Redis 연결 장애 시 Bearer 보호 API는 `401`, 쿠키 조회·갱신·로그아웃은 저장소 접근 지점에서 `503`으로 실패한다. 세션이 삭제·만료된 경우의 `401`과 구분한다. 토큰 없는 공개 API는 Redis 장애만으로 일괄 `401` 처리하지 않는다.

### 회원탈퇴

- 탈퇴·데이터 보존 정책은 미정이다. `withdrawalAvailable=false`이며 탈퇴 실행 API·데이터 삭제를 제공하지 않는다. 화면은 준비 중 사유를 표시한다.
- 결정할 항목은 회원 개인정보·매장·연관 데이터의 보존/삭제 범위와 기간, 재가입·사업자번호 재사용 허용 여부, 진행 중 업무 처리다. 다른 도메인 데이터를 임의로 변경하지 않는다. 현재 계정 상태가 WITHDRAWN이면 기존 로그인·Access·Refresh를 거절한다. 상태 검증 테스트가 탈퇴 기능 구현을 뜻하지 않는다.

## 테스트

- 기능마다 **흐름 테스트를 최소 1개** 만든다 (07_cicd `TransferFlowTest` 처럼). Testcontainers를 쓰므로 Docker가 필요하다.
- AI 호출은 mock으로 바꾼다.
- 실행: `cd backend && ./gradlew test`. 커밋 전 최소 확인: `./gradlew compileJava`
