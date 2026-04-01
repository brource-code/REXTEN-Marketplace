# Отчет об использовании Cookies в проекте

## 📊 Обзор

Данный отчет анализирует использование cookies в проекте и определяет места, где они должны использоваться, но отсутствуют.

---

## ✅ Где Cookies ИСПОЛЬЗУЮТСЯ

### 1. **Тема (Theme)**
**Файлы:**
- `src/server/actions/theme.js` - серверные действия для работы с cookies
- `src/components/template/Theme/ThemeProvider.jsx` - сохранение темы в cookies

**Статус:** ✅ Используется правильно
- Сохранение в cookies через серверные действия Next.js
- Дублирование в localStorage для быстрого доступа
- Синхронизация между cookies и localStorage

### 2. **Локаль (Locale)**
**Файлы:**
- `src/server/actions/locale.js` - серверные действия для работы с cookies

**Статус:** ✅ Используется правильно
- Сохранение локали в cookies через серверные действия

### 3. **Токены авторизации (частично)**
**Файлы:**
- `src/utils/auth/tokenStorage.js` - утилиты для работы с токенами

**Статус:** ⚠️ Частично используется
- Access token: хранится в **localStorage** (по умолчанию), но есть опция для cookies
- Refresh token: по умолчанию должен храниться в cookies (`useCookie = true`), но фактически используется localStorage
- Функции `setCookie()` и `getCookie()` реализованы, но не используются по умолчанию

**Проблема:** 
- `setAccessToken()` вызывается без параметра `useCookie`, поэтому токены сохраняются только в localStorage
- `setRefreshToken()` имеет `useCookie = true` по умолчанию, но в `authStore.js` вызывается без явного указания

### 4. **Axios конфигурация**
**Файлы:**
- `src/services/axios/LaravelAxios.js` - `withCredentials: true` установлен

**Статус:** ✅ Правильно настроен
- `withCredentials: true` позволяет отправлять cookies с запросами

---

## ❌ Где Cookies НЕ ИСПОЛЬЗУЮТСЯ, но ДОЛЖНЫ

### 1. **Refresh Token (критично для безопасности)**
**Текущая ситуация:**
- Refresh token хранится в localStorage (небезопасно)
- Должен храниться в **httpOnly cookie** для защиты от XSS атак

**Файлы, требующие изменений:**
- `src/utils/auth/tokenStorage.js` - функция `setRefreshToken()` должна использовать cookies по умолчанию
- `src/store/authStore.js` - при вызове `setRefreshToken()` нужно явно указать `useCookie = true`

**Рекомендация:**
```javascript
// В authStore.js, строка 33:
setRefreshToken(refresh_token, true) // Явно указываем использование cookies
```

**⚠️ КРИТИЧНО:** Refresh token должен устанавливаться сервером в httpOnly cookie, а не клиентом!

### 2. **Location Provider (локация пользователя)**
**Файлы:**
- `src/components/location/LocationProvider.tsx`

**Текущая ситуация:**
- Локация (штат/город) хранится только в localStorage
- Не сохраняется в cookies

**Проблема:**
- При SSR Next.js не может получить локацию из localStorage
- Локация не сохраняется между сессиями надежно

**Рекомендация:**
- Добавить сохранение локации в cookies для SSR поддержки
- Использовать серверные действия для работы с cookies локации

### 3. **CSRF Token (если используется Laravel)**
**Текущая ситуация:**
- Не найдено использование CSRF токенов
- Laravel по умолчанию использует CSRF защиту

**Проблема:**
- Если Laravel требует CSRF токен для POST/PUT/DELETE запросов, он должен быть в cookies
- Токен должен отправляться с каждым запросом

**Рекомендация:**
- Проверить, требует ли Laravel backend CSRF токены
- Если да - добавить получение и отправку CSRF токена

### 4. **Сессионные данные**
**Текущая ситуация:**
- Не найдено использование сессионных cookies
- Все данные хранятся в localStorage или Zustand store

**Проблема:**
- Сессионные данные должны храниться в cookies для работы с SSR
- Некоторые данные пользователя могут быть доступны только на сервере

**Рекомендация:**
- Рассмотреть использование cookies для временных данных сессии
- Использовать httpOnly cookies для чувствительных данных

### 5. **Настройки пользователя (предпочтения)**
**Текущая ситуация:**
- Настройки пользователя хранятся в localStorage или Zustand store

**Рекомендация:**
- Не критично, но можно сохранять некоторые настройки в cookies для SSR
- Например: язык интерфейса, размер шрифта и т.д.

---

## 🔒 Безопасность

### Текущие проблемы:

1. **Refresh Token в localStorage:**
   - ⚠️ Уязвим к XSS атакам
   - ✅ Решение: хранить в httpOnly cookie (устанавливается сервером)

2. **Access Token в localStorage:**
   - ⚠️ Уязвим к XSS атакам
   - ⚠️ Но для SPA это приемлемо, если используется короткое время жизни токена
   - ✅ Альтернатива: хранить в httpOnly cookie (но тогда нужен другой механизм передачи)

3. **Отсутствие httpOnly флага:**
   - ⚠️ Cookies устанавливаются клиентом без httpOnly флага
   - ✅ Решение: httpOnly cookies должны устанавливаться только сервером

### Рекомендации по безопасности:

1. **Refresh Token:**
   - Должен устанавливаться сервером в httpOnly cookie
   - Клиент не должен иметь к нему доступ через JavaScript

2. **Access Token:**
   - Можно оставить в localStorage, если время жизни короткое (15-30 минут)
   - Или использовать httpOnly cookie с механизмом передачи через заголовки

3. **CSRF Protection:**
   - Если используется Laravel, добавить CSRF токен в cookies
   - Отправлять токен с каждым запросом

---

## 📝 Рекомендации по исправлению

### Приоритет 1 (Критично):
1. **Refresh Token в httpOnly cookie:**
   - Изменить backend, чтобы он устанавливал refresh token в httpOnly cookie
   - Убрать сохранение refresh token в localStorage на клиенте
   - Обновить логику refresh token в `LaravelAxios.js`

### Приоритет 2 (Важно):
2. **Location в cookies:**
   - Добавить серверные действия для сохранения локации в cookies
   - Обновить `LocationProvider.tsx` для использования cookies

3. **CSRF Token:**
   - Проверить требования Laravel backend
   - Добавить получение и отправку CSRF токена

### Приоритет 3 (Желательно):
4. **Сессионные данные:**
   - Рассмотреть использование cookies для временных данных
   - Использовать httpOnly cookies для чувствительных данных

---

## 📂 Файлы, требующие изменений

1. **Backend (Laravel):**
   - Установка refresh token в httpOnly cookie при логине
   - Установка CSRF токена в cookie (если требуется)

2. **Frontend:**
   - `src/utils/auth/tokenStorage.js` - обновить логику работы с refresh token
   - `src/store/authStore.js` - убрать сохранение refresh token в localStorage
   - `src/services/axios/LaravelAxios.js` - обновить логику refresh token
   - `src/components/location/LocationProvider.tsx` - добавить сохранение в cookies
   - `src/server/actions/location.js` - создать серверные действия для локации (новый файл)

---

## ✅ Заключение

**Используется правильно:**
- Тема (Theme)
- Локаль (Locale)
- Axios конфигурация (withCredentials)

**Требует исправления:**
- Refresh Token (критично) - должен быть в httpOnly cookie
- Location Provider - желательно добавить cookies для SSR
- CSRF Token - проверить требования backend

**Общая оценка:** 6/10
- Базовая функциональность работает
- Но есть критические проблемы безопасности с refresh token
