# Исправление проблемы с Next.js Storage Proxy (500 ошибка) - Версия 2

## Проблема
Next.js API route `/api/storage/[...path]` возвращал ошибку 500 с сообщением:
```
Failed to parse URL from /storage/advertisements/UM33QmZIdFKsCs4tmnqr9mvbQZvjTgRMTj1bZyEf.jpg
```

## Причина
1. `fetch()` получал относительный путь вместо абсолютного URL
2. `getLaravelApiUrl()` не всегда возвращал абсолютный URL
3. Не было fallback механизма при ошибках

## Решение

### 1. Обновлена функция `getLaravelApiUrl()`
- ✅ Теперь принимает `request` для определения host
- ✅ Правильно определяет dev/prod окружение по host
- ✅ Всегда возвращает абсолютный URL (начинается с http:// или https://)

### 2. Добавлен fallback механизм
- ✅ Если внутренний Docker URL (`http://backend:8000`) не работает, пробует внешний (`https://api.rexten.live`)
- ✅ Улучшена обработка ошибок с детальным логированием

### 3. Улучшена валидация URL
- ✅ Проверка, что URL абсолютный перед использованием в `fetch()`
- ✅ Автоматическое добавление протокола, если отсутствует

## Логика работы

1. **Определение окружения:**
   - Docker: `process.env.DOCKER_ENV === 'true'` или `NEXT_PUBLIC_DOCKER_ENV === 'true'`
   - Dev: host содержит `dev.rexten.live`
   - Prod: host содержит `rexten.live` (но не `dev.`)

2. **Выбор URL:**
   - В Docker: сначала `http://backend:8000`, затем `https://api.rexten.live` (fallback)
   - Вне Docker: `https://api.rexten.live` для dev/prod, `http://localhost:8000` для локальной разработки

3. **Обработка ошибок:**
   - Если первый URL не работает, автоматически пробует следующий
   - Детальное логирование для отладки

## Проверка

После перезапуска frontend контейнера проверьте:
1. Изображения должны загружаться через `/api/storage/...`
2. В логах должны быть сообщения `[Storage Proxy] Fetching file:` с правильными URL
3. Если внутренний URL не работает, должен использоваться внешний как fallback
