# Решение проблем с падением сервера Next.js

## Обнаруженные проблемы

### 1. **Множественные процессы Next.js** ⚠️ КРИТИЧНО
**Проблема:** Запущено два процесса Next.js одновременно:
- `next-server (v15.5.4)` - PID 44579
- `node next dev -p 3003` - PID 44386

**Последствия:**
- Конфликты при записи в кеш
- Блокировки файлов
- Непредсказуемые падения сервера
- Утечки памяти

**Решение:**
```bash
# Остановить все процессы Next.js
pkill -f "next dev"
pkill -f "next-server"

# Проверить, что все остановлено
ps aux | grep -E "next|node.*3003" | grep -v grep

# Перезапустить только один процесс
npm run dev
```

### 2. **Большой размер кеша (739MB)** ⚠️
**Проблема:** Кеш `.next` занимает 739MB, что указывает на:
- Накопление старых сборок
- Проблемы с очисткой кеша
- Возможные утечки памяти

**Решение:**
```bash
# Полная очистка кеша
rm -rf .next
rm -rf .next/cache
rm -rf node_modules/.cache

# Перезапуск
npm run dev
```

### 3. **Зависание auth() в layout.jsx** ⚠️
**Проблема:** В `src/app/layout.jsx` есть таймаут для `auth()`, что указывает на проблемы:
```javascript
// Текущий код с таймаутом
const authPromise = auth().catch(() => null)
const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000))
const authResult = await Promise.race([authPromise, timeoutPromise])
```

**Причины:**
- `auth()` может зависать из-за проблем с NextAuth
- Проблемы с конфигурацией провайдеров (Github, Google)
- Блокирующие операции в `validateCredential`

**Решение:** Улучшить обработку ошибок и добавить логирование

### 4. **React 19.0.0 - нестабильная версия** ⚠️
**Проблема:** Используется React 19.0.0, которая:
- Может иметь проблемы совместимости с Next.js 15.5.4
- Имеет известные баги с серверными компонентами
- Может вызывать проблемы с hydration

**Рекомендация:** Рассмотреть откат на React 18.x для стабильности

### 5. **Проблемы с памятью в dev режиме**
**Проблема:** 
- `onDemandEntries` настроен, но может быть недостаточно
- Большой размер кеша указывает на проблемы с управлением памятью

## Пошаговое решение

### Шаг 1: Остановить все процессы
```bash
# Убить все процессы Next.js
pkill -f "next"
pkill -f "node.*3003"

# Убедиться, что ничего не запущено
ps aux | grep -E "next|node.*3003" | grep -v grep
```

### Шаг 2: Очистить кеш
```bash
cd /Users/turbin/Desktop/ecme-admin

# Удалить все кеши
rm -rf .next
rm -rf .next/cache
rm -rf node_modules/.cache

# Очистить системные кеши (опционально)
npm cache clean --force
```

### Шаг 3: Проверить конфигурацию
Убедитесь, что в `next.config.mjs`:
- `output: 'standalone'` используется только для production
- `onDemandEntries` настроен правильно
- Нет конфликтующих настроек

### Шаг 4: Улучшить обработку auth()
Исправить `src/app/layout.jsx` для лучшей обработки ошибок:

```javascript
// Улучшенная версия
try {
    const authPromise = auth().catch((error) => {
        console.error('Auth error:', error)
        return null
    })
    const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => {
            console.warn('Auth timeout after 2s')
            resolve(null)
        }, 2000)
    )
    const authResult = await Promise.race([authPromise, timeoutPromise])
    session = authResult
} catch (error) {
    console.error('Critical auth error:', error)
    session = null
}
```

### Шаг 5: Перезапустить с мониторингом
```bash
# Запустить с увеличенной памятью
NODE_OPTIONS='--max-old-space-size=4096' npm run dev

# Или просто
npm run dev
```

### Шаг 6: Мониторинг
Следите за:
- Логами в консоли
- Использованием памяти (Activity Monitor на Mac)
- Количеством процессов Next.js (должен быть только один)

## Дополнительные рекомендации

### 1. Проверка переменных окружения
Убедитесь, что все переменные окружения для NextAuth настроены:
```bash
# Проверьте наличие:
GITHUB_AUTH_CLIENT_ID
GITHUB_AUTH_CLIENT_SECRET
GOOGLE_AUTH_CLIENT_ID
GOOGLE_AUTH_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
```

### 2. Проверка версий Node.js
Рекомендуется Node.js 18.x или 20.x:
```bash
node --version
```

### 3. Обновление зависимостей
Если проблемы продолжаются:
```bash
# Обновить зависимости
npm update

# Или переустановить
rm -rf node_modules package-lock.json
npm install
```

### 4. Использование PM2 для управления процессами
Для production рекомендуется использовать PM2:
```bash
npm install -g pm2
pm2 start npm --name "nextjs" -- run dev
pm2 monit
```

## Автоматический скрипт для исправления

Создайте файл `fix-nextjs.sh`:

```bash
#!/bin/bash
echo "Остановка всех процессов Next.js..."
pkill -f "next dev"
pkill -f "next-server"
sleep 2

echo "Очистка кеша..."
rm -rf .next
rm -rf .next/cache
rm -rf node_modules/.cache

echo "Проверка процессов..."
ps aux | grep -E "next|node.*3003" | grep -v grep

echo "Готово! Запустите: npm run dev"
```

Использование:
```bash
chmod +x fix-nextjs.sh
./fix-nextjs.sh
```

## Если проблемы продолжаются

1. **Проверьте логи:**
   ```bash
   # Логи Next.js
   tail -f .next/trace
   
   # Системные логи (Mac)
   log show --predicate 'process == "node"' --last 1h
   ```

2. **Проверьте использование памяти:**
   ```bash
   # Mac
   top -pid $(pgrep -f "next dev")
   ```

3. **Откатитесь на стабильные версии:**
   - React 18.3.1
   - Next.js 14.x (если 15.x проблематичен)

4. **Создайте минимальный тестовый проект** для проверки, не связана ли проблема с конфигурацией

## Мониторинг в реальном времени

Для постоянного мониторинга создайте скрипт `monitor-nextjs.sh`:

```bash
#!/bin/bash
while true; do
    clear
    echo "=== Мониторинг Next.js ==="
    echo "Процессы:"
    ps aux | grep -E "next|node.*3003" | grep -v grep
    echo ""
    echo "Размер кеша:"
    du -sh .next 2>/dev/null || echo "Нет кеша"
    echo ""
    echo "Память процесса:"
    ps aux | grep -E "next-server" | grep -v grep | awk '{print $6/1024 " MB"}'
    sleep 5
done
```

