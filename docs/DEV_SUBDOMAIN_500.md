# dev.rexten.live возвращает 500

## Ошибки в консоли браузера (не от сайта)

- `No Listener: tabs:outgoing.message.ready`
- `Could not establish connection. Receiving end does not exist`

Это типично для **расширений Chrome** (переводчик, пароли, VPN). Открой сайт в **режиме инкогнито без расширений** или другой браузер — эти сообщения должны пропасть. На **500** они не влияют.

## Что проверить на сервере dev

1. **Логи Next.js** (контейнер/PM2):
   ```bash
   docker logs <frontend-container> --tail 100
   ```
   Ищите stack trace при запросе `GET /`.

2. **Логи Nginx / прокси** перед Next:
   ```bash
   tail -50 /var/log/nginx/error.log
   ```

3. **Переменные dev** (часто отличаются от prod):
   - `AUTH_SECRET` — задан и не пустой
   - `AUTH_URL=https://dev.rexten.live`
   - `NEXT_PUBLIC_LARAVEL_API_URL` — актуальный API для dev

4. **Сборка**: после правок выполнить `npm run build` (или пересобрать образ) — битый `.next` даёт 500.

5. **Валидность JSON переводов**:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8'))"
   ```

6. **Доступность upstream**: Nginx должен проксировать на живой порт Next (например 3003).

## Изменения в коде

В `middleware` добавлены: `NextResponse.redirect`, обработка `x-forwarded-proto` с несколькими значениями, общий `try/catch` с запасным редиректом на `/services`.
