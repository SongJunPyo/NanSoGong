# 01. 07_cicd 형식으로 저장소 템플릿 생성

- 날짜: 2026-11-19
- 관련: 참고 저장소 https://github.com/Kimkm03/07_cicd , 기술 스택 이미지

## 요청 · 배경

6명이 같은 개발 환경에서 작업하기 위해, 한 사람이 세팅한 환경을 팀원에게 공유하는 방법이 필요했다.
처음 생각은 "개발 환경을 이미지로 만들어 Docker Hub 로 공유" 였으나, 아래 이유로 **환경을 코드(설정 파일)로 만들어 Git 으로 공유**하는 방식을 택했다.

- Mac(arm64) · Windows(amd64) 아키텍처가 섞여 있어 한 사람이 만든 이미지가 다른 PC 에서 안 돌거나 느리다
- 이미지는 안에 무엇이 들었는지 기록이 남지 않아 다시 만들 수 없고, 바뀔 때마다 6명이 다시 받아야 한다
- API 키 같은 비밀값이 이미지에 남아 공개될 위험이 있다

## 바꾼 것

| 파일 | 변경 내용 |
|---|---|
| `build.gradle`, `settings.gradle`, `gradlew` | Java 21 toolchain, Spring Boot 4.1.1, Spring AI 2.0.1(Anthropic), ShedLock, Redis, PostgreSQL, Testcontainers |
| `docker-compose.yml` | 로컬용 PostgreSQL · Redis (+ 선택: Prometheus · Grafana) |
| `.env.example` | 환경변수 견본. 실제 `.env` 는 깃에 올리지 않음 |
| `Dockerfile` | 2단계 빌드(JDK 로 jar → JRE 로 실행) |
| `.github/workflows/backend.yml`, `frontend.yml` | 07_cicd 와 같은 흐름 + PR 테스트 |
| `frontend/` | React 19 · Vite 8 · Tailwind v4 · PWA · TanStack Query · Zustand |
| `.editorconfig`, `.nvmrc`, `.gitattributes` | 들여쓰기 · Node 버전 · 줄바꿈 통일 |
| `README.md` | 세팅 순서, 매일 하는 일, 자주 나는 문제 |

## 팀원이 할 일

- [ ] Git, Docker Desktop, JDK 21, Node 22 설치
- [ ] `.env.example` 을 복사해 `.env` 만들기
- [ ] (세팅 담당자만) `frontend` 에서 `npm install` · `npx shadcn@latest init` 후 lock 파일 커밋

## 확인 방법

`docker compose up -d` → 서버 실행 → 화면 실행 → http://localhost:5173 의 연결 확인판이 모두 `연결됨`
