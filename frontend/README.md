# REXTEN - The Ultimate Next.js & TypeScript Web Template

REXTEN is a modern and responsive admin dashboard template built with Next.js and TypeScript. Designed to provide a highly customizable and easy-to-use platform for building admin interfaces, it includes a variety of reusable components, pre-designed pages, and dynamic features. 

This template is perfect for developing dashboards, web applications, CRM systems, e-commerce backends, and more. Whether you're building a small-scale admin panel or a large-scale enterprise application, REXTEN is designed to be flexible and scalable.

Key Features:
- **Next.js Framework**: Built with the powerful Next.js framework, offering server-side rendering (SSR) out of the box.
- **Responsive Layout**: Optimized for all screen sizes and devices.
- **Dark/Light Mode**: Easily switch between light and dark themes.
- **Configurable Themes**: Personalize colors, layouts, and more to fit your needs.
- **Built with TypeScript**: Ensures robust type-checking and fast development.
- **Multi-Locale Support**: Easily add and manage multiple languages.
- **RTL Support**: Full Right-to-Left support for languages like Arabic or Hebrew.
- **Tailwind Component-Based Architecture**: Reusable components to streamline your development process.

---
### Demo
Check out the [Live Demo](https://ecme-react.themenate.net/) to explore the template in action.

### Guide
Please visit our [Online documentation](https://ecme-react.themenate.net/guide/documentation/introduction) for detailed guides, setup instructions, and customization options.

---

## Локальная разработка на Mac

### Требования
- Node.js 18+ (рекомендуется использовать nvm)
- npm или yarn
- Git

### Установка

1. **Клонируйте проект или скопируйте папку `ecme-admin` на ваш Mac**

2. **Установите зависимости:**
   ```bash
   cd ecme-admin
   npm install
   ```

3. **Создайте файл `.env.local` в корне проекта:**
   ```bash
   cp .env.example .env.local
   ```
   
   Или создайте файл `.env.local` со следующим содержимым:
   ```
   # Laravel API URL (для работы с backend API)
   NEXT_PUBLIC_LARAVEL_API_URL=http://localhost:8000/api
   
   # Auth
   AUTH_SECRET=ваш-секретный-ключ-для-next-auth
   AUTH_URL=http://localhost:3003
   NEXT_PUBLIC_BASE_PATH=
   ```
   
   Для генерации `AUTH_SECRET` можно использовать:
   ```bash
   openssl rand -base64 32
   ```

4. **Для локальной разработки (без basePath):**
   
   Создайте файл `next.config.local.mjs` или временно измените `next.config.mjs`:
   - Уберите или закомментируйте `basePath: '/project3'`
   - Или установите `basePath: ''` для локальной разработки

5. **Запустите dev сервер:**
   ```bash
   npm run dev
   ```
   
   Приложение будет доступно по адресу: `http://localhost:3003`

6. **Для production сборки:**
   ```bash
   npm run build
   npm start
   ```

### Настройка для локальной разработки

Если вы хотите работать без `basePath` локально, но с `basePath` на сервере:

1. Создайте `.env.local` с:
   ```
   NEXT_PUBLIC_BASE_PATH=
   ```

2. Временно измените `next.config.mjs`:
   ```javascript
   basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
   ```

### Решение проблем

**Проблема с памятью при сборке:**
- Убедитесь, что у вас достаточно RAM (рекомендуется 8GB+)
- Если нужно, увеличьте лимит в `package.json`:
  ```json
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  ```

**Проблемы с sharp:**
- Установите sharp локально: `npm install sharp`
- Или используйте `images: { unoptimized: true }` в `next.config.mjs`

**Проблемы с зависимостями:**
- Удалите `node_modules` и `package-lock.json`
- Выполните `npm install` заново
