FROM node:18-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем весь проект
COPY . .

# Собираем приложение
RUN npm run build

# Production Next.js (docker / npm start) — порт 3003. Локальная разработка: npm run dev — 3004.
EXPOSE 3003

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
# Увеличиваем лимит памяти для Node.js (для высокой нагрузки)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Запускаем приложение
CMD ["npm", "start"]
