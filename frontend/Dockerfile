# syntax=docker/dockerfile:1
# 🖥️ 화면 이미지: React 빌드 결과(dist)를 nginx 가 서빙하고, /api 는 같은 compose 의 app(8080)으로 넘긴다
#   로컬:   docker compose --profile web up -d --build  → http://localhost:8000
#   AWS dev: GitHub Actions(frontend.yml)가 arm64 로 빌드해 ECR 에 올리고 dev EC2 가 받는다
#   prod 화면은 이 이미지를 쓰지 않는다 (S3 + CloudFront)
# 빌드 기준 폴더(context)는 frontend/

# 1단계: npm run build. --platform=$BUILDPLATFORM → arm64 이미지를 만들 때도 빌드는 빠른 내 CPU(amd64)로 한다 (결과물은 그냥 파일)
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_APP_ENV=local
ENV VITE_API_BASE=/api \
    VITE_APP_ENV=$VITE_APP_ENV
RUN npm run build

# 2단계: nginx 로 서빙만
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
