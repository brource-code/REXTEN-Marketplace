# syntax=docker/dockerfile:1.6
# BuildKit: кэш npm и Next между сборками (DOCKER_BUILDKIT=1 по умолчанию в новых Docker)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Кэш npm между сборками — не качает registry заново при неизменном lockfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

COPY . .

# NEXT_PUBLIC_* вшиваются в клиентский бандл на этапе `next build` (в т.ч. для Mapbox)
ARG NEXT_PUBLIC_MAPBOX_TOKEN=
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Кэш компиляции Next — ускоряет повторные `docker compose build` при правках кода
# На машинах с 16–32+ ГБ RAM сборка может брать >8 ГБ heap (Mapbox/Sentry и т.д.)
RUN --mount=type=cache,target=/app/.next/cache,id=rexten-next-cache \
    NODE_OPTIONS="--max-old-space-size=16384" npm run build

# Для `next start` достаточно меньшего лимита
ENV NODE_OPTIONS="--max-old-space-size=4096"

EXPOSE 3003

CMD ["npm", "start"]
