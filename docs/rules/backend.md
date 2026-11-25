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

## 테스트

- 기능마다 **흐름 테스트를 최소 1개** 만든다 (07_cicd `TransferFlowTest` 처럼). Testcontainers를 쓰므로 Docker가 필요하다.
- AI 호출은 mock으로 바꾼다.
- 실행: `cd backend && ./gradlew test`. 커밋 전 최소 확인: `./gradlew compileJava`
