# Инструкция по установке и запуску проекта REXTEN Admin

## Требования

- **Node.js** версии 18 или выше
- **npm** или **yarn**
- **Git** (опционально)

### Проверка версии Node.js

```bash
node --version
# Должно быть v18.x.x или выше
```

Если Node.js не установлен, установите его через [nvm](https://github.com/nvm-sh/nvm) (рекомендуется):

```bash
# Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузите терминал или выполните:
source ~/.bashrc

# Установка Node.js 18
nvm install 18
nvm use 18
```

---

## Установка проекта

### 1. Распакуйте архив

```bash
# Если архив называется ecme-admin.tar.gz
tar -xzf ecme-admin.tar.gz
cd ecme-admin
```

### 2. Установите зависимости

```bash
npm install
```

Это может занять несколько минут, так как устанавливается много пакетов.

### 3. Настройте переменные окружения

Создайте файл `.env.local` в корне проекта:

```bash
touch .env.local
```

Откройте файл `.env.local` и добавьте следующее содержимое:

```env
# Секретный ключ для next-auth (сгенерируйте свой уникальный ключ)
AUTH_SECRET=ваш-секретный-ключ-здесь

# URL для локальной разработки
AUTH_URL=http://localhost:3003

# BasePath - оставьте пустым для локальной разработки
NEXT_PUBLIC_BASE_PATH=
```

#### Генерация AUTH_SECRET

Для генерации безопасного секретного ключа выполните:

```bash
openssl rand -base64 32
```

Скопируйте полученный ключ и вставьте его в `.env.local` вместо `ваш-секретный-ключ-здесь`.

**Пример `.env.local`:**
```env
AUTH_SECRET=E4wj3UX7idejNeFqCDXDRW25m34TDjFVnXD9OQk/OEY=
AUTH_URL=http://localhost:3003
NEXT_PUBLIC_BASE_PATH=
```

---

## Запуск проекта

### Режим разработки (Development)

```bash
npm run dev
```

Приложение будет доступно по адресу: **http://localhost:3003**

Откройте браузер и перейдите по этому адресу.

### Production сборка

Если вы хотите собрать production версию:

```bash
# Сборка проекта
npm run build

# Запуск production сервера
npm start
```

---

## Решение проблем

### Проблема: "Error: Cannot find module"

**Решение:**
```bash
# Удалите node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановите зависимости
npm install
```

### Проблема: "Out of memory" при сборке

**Решение:**
Увеличьте лимит памяти в `package.json`:

```json
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

Или установите переменную окружения:
```bash
export NODE_OPTIONS='--max-old-space-size=4096'
npm run build
```

### Проблема: Порт 3003 уже занят

**Решение:**
Измените порт в `package.json`:

```json
"dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev -p 3000"
```

Или убейте процесс, использующий порт:
```bash
# На Mac/Linux
lsof -ti:3003 | xargs kill -9
```

### Проблема: Sharp module не найден

**Решение:**
```bash
npm install sharp
```

Или в `next.config.mjs` уже установлено `images: { unoptimized: true }`, что должно решить проблему.

---

## Структура проекта

```
ecme-admin/
├── src/                    # Исходный код приложения
│   ├── app/               # Next.js App Router страницы
│   ├── components/        # React компоненты
│   ├── configs/          # Конфигурационные файлы
│   ├── i18n/             # Интернационализация
│   └── ...
├── messages/             # Файлы переводов
├── public/               # Статические файлы
├── .env.local           # Переменные окружения (создайте сами)
├── next.config.mjs      # Конфигурация Next.js
├── package.json         # Зависимости проекта
└── README.md           # Документация
```

---

## Полезные команды

```bash
# Запуск в режиме разработки
npm run dev

# Сборка production версии
npm run build

# Запуск production версии
npm start

# Проверка кода линтером
npm run lint

# Форматирование кода
npm run prettier:fix
```

---

## Дополнительная информация

- **Документация Next.js**: https://nextjs.org/docs
- **Документация React**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Поддержка

Если у вас возникли проблемы, проверьте:
1. Версию Node.js (должна быть 18+)
2. Правильность файла `.env.local`
3. Что все зависимости установлены (`npm install`)
4. Логи ошибок в терминале

Удачи в разработке! 🚀

