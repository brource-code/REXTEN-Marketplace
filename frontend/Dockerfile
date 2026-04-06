# syntax=docker/dockerfile:1.6
# BuildKit: кэш npm и Next между сборками (DOCKER_BUILDKIT=1 по умолчанию в новых Docker)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Кэш npm между сборками — не качает registry заново при неизменном lockfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

COPY . .

ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Кэш компиляции Next — ускоряет повторные `docker compose build` при правках кода
RUN --mount=type=cache,target=/app/.next/cache,id=rexten-next-cache \
    npm run build

EXPOSE 3003

CMD ["npm", "start"]
