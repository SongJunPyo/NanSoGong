# syntax=docker/dockerfile:1
# 🐳 서버(백엔드) 이미지
#   로컬: docker compose up -d 가 이 파일로 서버 컨테이너를 만든다 (코드가 바뀌었으면 다시 빌드)
#   배포: GitHub Actions(backend.yml)가 같은 파일로 arm64 로 만들어 ECR 에 올린다
# 빌드 기준 폴더(context)는 backend/

# 1단계: jar 만들기 (JDK + Gradle)
# --platform=$BUILDPLATFORM: arm64(Graviton) 이미지를 만들 때도 컴파일은 빌드하는 PC/CI 의 CPU 로 한다 (jar 는 CPU 와 무관 → 에뮬레이션 없이 빠르다)
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
# --mount=type=cache: Gradle 이 받은 라이브러리를 빌드 사이에 보관한다 → 두 번째 빌드부터 다시 받지 않는다
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null 2>&1 || true
COPY src src
# 테스트는 이미지 만들기 전에 PC/CI 에서 먼저 돌린다
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon

# 2단계: 실행만 (JRE 는 JDK 보다 훨씬 작다). 1단계에서 만든 jar 만 가져온다
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
# 매출 집계 · 스케줄(@Scheduled cron) · 로그 시간이 한국 기준이 되게 (EC2 시계와 상관없이)
ENV JAVA_TOOL_OPTIONS="-Duser.timezone=Asia/Seoul"
EXPOSE 8080
# 서버가 진짜 요청을 받을 수 있는 상태인지 (docker compose ps 에 healthy 로 보인다)
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health > /dev/null || exit 1
ENTRYPOINT ["java","-jar","app.jar"]

# 🚨 AWS 서버는 Graviton(arm64)이다. 배포 이미지는 Actions 가 linux/arm64 로 만든 것만 쓴다 (내 PC 에서 만든 amd64 이미지는 exec format error)
