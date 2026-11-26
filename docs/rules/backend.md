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
| `POST /api/auth/login` | `{ loginId, password }` → JWT Access 토큰 |
| `GET /api/me` | JWT 주인의 회원정보 |
| `GET /api/stores` | JWT 주인의 매장 목록 `Page<StoreResponse>` |
| `GET /api/stores/{storeId}` | 내 매장 상세. 다른 계정은 `403` |
| `PUT /api/stores/{storeId}` | `{ name, category, address, openTime, closeTime, closedDays }` → 저장한 매장. 다른 계정은 `403` |

- 휴대전화는 기존 `app.verification.mode=MOCK`·개발용 코드만 지원한다. 실제 SMS 발송·통신사 본인확인은 구현하지 않는다. `REAL` 모드는 `503`이며 Mock으로 대체하지 않는다.
- 인증 요청은 3분, 확인 증명은 10분이다. `expiresAt`은 epoch milliseconds다. 증명은 이름·번호에 묶이고 1회만 소비한다. Redis에는 개인정보 대신 HMAC 지문, 증명 원문 대신 해시 키를 저장한다. 코드 오류는 요청별 5회로 제한한다.
- 가입에는 사업자 1~100개가 필요하다. 비밀번호는 영문·숫자·특수문자 포함 8~64자, 공백 제외, UTF-8 72바이트 이하다. BCrypt로 해시한다.
- 가입 서버가 국세청 `/validate`에 전체 목록을 한 번에 보내고 모든 결과의 개수·번호·요청 정보·영업 상태를 확인한다. 화면의 확인 결과는 신뢰하지 않는다. 외부 확인 중 DB 트랜잭션을 유지하지 않는다.
- 확인 후 `AuthSignupPersistenceService` 트랜잭션에서 회원과 `StoreService`의 검증된 매장을 함께 저장한다. 회원 ID는 서버가 생성한다. 동시 가입은 정렬된 PostgreSQL 트랜잭션 잠금과 DB 유일 제약으로 중복을 막는다. 저장 실패 시 전체를 취소하고 휴대전화 증명은 원래 만료 시각 안에서 복원한다.
- 가입의 입력 오류는 `400`, 중복은 `409`다. 인증·매장 Controller 범위의 `AuthExceptionHandler`가 `{ code, message }`를 반환한다. 공용 예외 구현이 생기면 그 계약으로 합친다.
- 매장 기본정보의 시간은 둘 다 비우거나 서로 다른 `HH:mm`으로 입력한다. 마감이 더 이르면 다음 날이다. 휴무는 `mon`~`sun` 중 중복 없이 입력한다. 저장하면 `onboardingStatus.storeBasics=true`다.
- 새로고침 후 재로그인하면 DB 정보를 다시 조회한다. Refresh·자동 로그인·서버 로그아웃 무효화는 이 계약에 포함하지 않는다.

## 테스트

- 기능마다 **흐름 테스트를 최소 1개** 만든다 (07_cicd `TransferFlowTest` 처럼). Testcontainers를 쓰므로 Docker가 필요하다.
- AI 호출은 mock으로 바꾼다.
- 실행: `cd backend && ./gradlew test`. 커밋 전 최소 확인: `./gradlew compileJava`
