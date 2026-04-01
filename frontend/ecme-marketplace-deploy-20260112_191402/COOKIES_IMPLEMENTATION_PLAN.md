# План выполнения: Оптимизация использования Cookies

## 📋 Анализ текущей ситуации

### Текущее состояние:

#### ✅ Что работает правильно:
1. **Тема (Theme)** - сохранение в cookies через серверные действия Next.js
2. **Локаль (Locale)** - сохранение в cookies через серверные действия
3. **Axios конфигурация** - `withCredentials: true` настроен правильно

#### ⚠️ Проблемные области:

1. **Refresh Token (КРИТИЧНО)**
   - ❌ Хранится в localStorage (уязвимо к XSS)
   - ❌ Не используется httpOnly cookie
   - ❌ Клиент устанавливает cookie вручную (небезопасно)

2. **Location Provider**
   - ❌ Хранится только в localStorage
   - ❌ Нет поддержки SSR
   - ❌ Не сохраняется между сессиями надежно

3. **CSRF Token**
   - ❓ Не найдено использование
   - ❓ Нужно проверить требования Laravel backend

---

## 🎯 План выполнения

### Этап 1: Анализ Backend (Приоритет: КРИТИЧНО)
**Время:** 1-2 часа

#### Задачи:
1. **Проверить AuthController.php**
   - [ ] Как устанавливаются токены при логине
   - [ ] Есть ли установка refresh token в httpOnly cookie
   - [ ] Какие заголовки и cookies устанавливаются

2. **Проверить middleware**
   - [ ] Есть ли CSRF middleware
   - [ ] Как обрабатываются cookies
   - [ ] Настройки CORS для cookies

3. **Проверить конфигурацию**
   - [ ] `config/session.php` - настройки сессий
   - [ ] `config/cors.php` - настройки CORS
   - [ ] `.env` - настройки домена и cookies

#### Результат:
- Документ с текущей реализацией backend
- Список необходимых изменений в backend

---

### Этап 2: Реализация Refresh Token в httpOnly Cookie (Приоритет: КРИТИЧНО)
**Время:** 3-4 часа

#### Backend изменения:

1. **Изменить AuthController.php**
   ```php
   // При логине устанавливать refresh token в httpOnly cookie
   public function login(Request $request) {
       // ... валидация и аутентификация
       
       $refreshToken = // ... получение refresh token
       
       // Установить в httpOnly cookie
       return response()->json([
           'access_token' => $accessToken,
           'user' => $user,
       ])->cookie('refresh_token', $refreshToken, 30 * 24 * 60, '/', null, true, true);
       //                                                      ^^^^  ^^  ^^  ^^
       //                                                      дни  path domain httpOnly secure
   }
   ```

2. **Изменить refresh endpoint**
   ```php
   public function refresh(Request $request) {
       // Получить refresh token из cookie, а не из body
       $refreshToken = $request->cookie('refresh_token');
       
       // ... валидация и обновление токена
       
       // Установить новый refresh token в cookie
       return response()->json([
           'access_token' => $newAccessToken,
       ])->cookie('refresh_token', $newRefreshToken, 30 * 24 * 60, '/', null, true, true);
   }
   ```

3. **Изменить logout endpoint**
   ```php
   public function logout(Request $request) {
       // ... логика выхода
       
       // Удалить refresh token cookie
       return response()->json(['message' => 'Logged out'])
           ->cookie('refresh_token', '', -1, '/', null, true, true);
   }
   ```

#### Frontend изменения:

1. **Обновить tokenStorage.js**
   ```javascript
   // Убрать сохранение refresh token в localStorage
   export function setRefreshToken(token, useCookie = false) {
       // НЕ сохраняем refresh token на клиенте
       // Он устанавливается сервером в httpOnly cookie
       if (useCookie) {
           console.warn('Refresh token should be set by server in httpOnly cookie')
       }
   }
   
   export function getRefreshToken() {
       // Refresh token недоступен на клиенте (httpOnly)
       // Он автоматически отправляется с запросами через withCredentials
       return null // или можно вернуть флаг, что токен есть в cookie
   }
   ```

2. **Обновить authStore.js**
   ```javascript
   setAuth: (tokens, user) => {
       const { access_token } = tokens
       
       // Сохраняем только access token
       if (access_token) {
           setAccessToken(access_token)
       }
       
       // НЕ сохраняем refresh_token - он в httpOnly cookie
       
       set({
           isAuthenticated: true,
           accessToken: access_token,
           refreshToken: null, // Не храним на клиенте
           // ...
       })
   }
   ```

3. **Обновить LaravelAxios.js**
   ```javascript
   // При refresh запросе не отправляем refresh_token в body
   const response = await axios.post(
       `${apiUrl}/auth/refresh`,
       {}, // Пустое тело - refresh token в cookie
       {
           headers: {
               'Content-Type': 'application/json',
               'Accept': 'application/json',
           },
           withCredentials: true, // Важно!
       }
   )
   ```

#### Тестирование:
- [ ] Логин устанавливает refresh token в httpOnly cookie
- [ ] Refresh token автоматически отправляется с запросами
- [ ] Refresh endpoint работает с cookie
- [ ] Logout удаляет cookie
- [ ] XSS атака не может получить refresh token

---

### Этап 3: Добавление Location в Cookies (Приоритет: ВАЖНО)
**Время:** 2-3 часа

#### Создать серверные действия:

1. **Создать `src/server/actions/location.js`**
   ```javascript
   'use server'
   import { cookies } from 'next/headers'
   import { COOKIES_KEY } from '@/constants/app.constant'
   
   const LOCATION_COOKIE_KEY = 'location'
   
   export async function getLocation() {
       const cookieStore = await cookies()
       const location = cookieStore.get(LOCATION_COOKIE_KEY)?.value
       
       if (location) {
           return JSON.parse(location)
       }
       
       return { state: null, city: null }
   }
   
   export async function setLocation(state, city) {
       const cookieStore = await cookies()
       const locationData = JSON.stringify({ state, city, updatedAt: Date.now() })
       
       cookieStore.set(LOCATION_COOKIE_KEY, locationData, {
           maxAge: 365 * 24 * 60 * 60, // 1 год
           path: '/',
           sameSite: 'lax',
       })
   }
   ```

#### Обновить LocationProvider:

1. **Обновить `LocationProvider.tsx`**
   ```typescript
   // Добавить импорт
   import { getLocation, setLocation as setLocationCookie } from '@/server/actions/location'
   
   // В useEffect инициализации:
   useEffect(() => {
       const initialize = async () => {
           // 1. Пробуем получить из cookies (SSR)
           const cookieLocation = await getLocation()
           
           // 2. Пробуем получить из localStorage (клиент)
           const stored = localStorage.getItem(STORAGE_KEY)
           
           // 3. Приоритет: cookies > localStorage > user data
           if (cookieLocation.state || cookieLocation.city) {
               setStateInternal(cookieLocation.state)
               setCityInternal(cookieLocation.city)
           } else if (stored) {
               // ... существующая логика
           }
       }
   }, [])
   
   // В useEffect сохранения:
   useEffect(() => {
       if (state || city) {
           // Сохраняем в cookies
           setLocationCookie(state, city).catch(() => {})
           
           // Сохраняем в localStorage (для быстрого доступа)
           localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, city }))
       }
   }, [state, city])
   ```

#### Тестирование:
- [ ] Локация сохраняется в cookies
- [ ] Локация доступна при SSR
- [ ] Локация синхронизируется между cookies и localStorage
- [ ] Локация восстанавливается при перезагрузке

---

### Этап 4: Проверка и добавление CSRF Token (Приоритет: ВАЖНО)
**Время:** 1-2 часа

#### Проверка Backend:

1. **Проверить middleware**
   ```bash
   # Проверить, используется ли VerifyCsrfToken middleware
   # Проверить исключения для API routes
   ```

2. **Проверить конфигурацию**
   - [ ] Есть ли настройки CSRF для API
   - [ ] Нужен ли CSRF токен для SPA

#### Если требуется CSRF:

1. **Создать endpoint для получения CSRF токена**
   ```php
   // В AuthController или отдельный контроллер
   public function getCsrfToken() {
       return response()->json([
           'csrf_token' => csrf_token(),
       ])->cookie('XSRF-TOKEN', csrf_token(), 120, '/', null, false, false);
   }
   ```

2. **Обновить LaravelAxios.js**
   ```javascript
   // Добавить получение CSRF токена при инициализации
   // Добавить заголовок X-XSRF-TOKEN к запросам
   ```

#### Тестирование:
- [ ] CSRF токен получается при необходимости
- [ ] CSRF токен отправляется с запросами
- [ ] Запросы проходят валидацию CSRF

---

### Этап 5: Оптимизация и очистка (Приоритет: ЖЕЛАТЕЛЬНО)
**Время:** 1 час

#### Задачи:

1. **Очистить неиспользуемый код**
   - [ ] Удалить сохранение refresh token в localStorage
   - [ ] Удалить функции работы с refresh token cookie на клиенте
   - [ ] Обновить комментарии

2. **Добавить документацию**
   - [ ] Документировать работу с cookies
   - [ ] Добавить комментарии к критичным местам
   - [ ] Обновить README

3. **Тестирование безопасности**
   - [ ] Проверить защиту от XSS
   - [ ] Проверить защиту от CSRF
   - [ ] Проверить настройки SameSite и Secure

---

## 📊 Оценка времени

| Этап | Время | Приоритет |
|------|-------|-----------|
| Этап 1: Анализ Backend | 1-2 часа | КРИТИЧНО |
| Этап 2: Refresh Token | 3-4 часа | КРИТИЧНО |
| Этап 3: Location в Cookies | 2-3 часа | ВАЖНО |
| Этап 4: CSRF Token | 1-2 часа | ВАЖНО |
| Этап 5: Оптимизация | 1 час | ЖЕЛАТЕЛЬНО |
| **ИТОГО** | **8-12 часов** | |

---

## 🚀 Порядок выполнения

### Неделя 1: Критичные изменения
1. **День 1-2:** Этап 1 (Анализ Backend) + Этап 2 (Refresh Token)
2. **День 3:** Тестирование и исправление багов

### Неделя 2: Важные улучшения
3. **День 1-2:** Этап 3 (Location в Cookies)
4. **День 3:** Этап 4 (CSRF Token)
5. **День 4:** Этап 5 (Оптимизация)

---

## ✅ Критерии успеха

### Этап 2 (Refresh Token):
- ✅ Refresh token хранится только в httpOnly cookie
- ✅ Refresh token недоступен через JavaScript
- ✅ Refresh endpoint работает с cookie
- ✅ XSS атака не может получить refresh token

### Этап 3 (Location):
- ✅ Локация сохраняется в cookies
- ✅ Локация доступна при SSR
- ✅ Локация синхронизируется между cookies и localStorage

### Этап 4 (CSRF):
- ✅ CSRF токен получается и отправляется (если требуется)
- ✅ Все запросы проходят валидацию

---

## 🔒 Безопасность

### После реализации:
- ✅ Refresh token защищен от XSS (httpOnly)
- ✅ Refresh token защищен от CSRF (SameSite=Lax)
- ✅ Access token имеет короткое время жизни
- ✅ Cookies используют правильные флаги безопасности

### Рекомендации:
- Использовать HTTPS в production (Secure flag)
- Настроить правильный домен для cookies
- Регулярно обновлять токены
- Мониторить подозрительную активность

---

## 📝 Чеклист перед деплоем

- [ ] Все тесты пройдены
- [ ] Refresh token работает через httpOnly cookie
- [ ] Location сохраняется в cookies
- [ ] CSRF защита настроена (если требуется)
- [ ] Проверена безопасность (XSS, CSRF)
- [ ] Документация обновлена
- [ ] Код прошел code review
- [ ] Настроены правильные флаги cookies для production

---

## 🐛 Возможные проблемы и решения

### Проблема 1: Cookies не устанавливаются
**Решение:** Проверить CORS настройки, домен, SameSite

### Проблема 2: Refresh token не отправляется
**Решение:** Убедиться, что `withCredentials: true` установлен

### Проблема 3: SSR не получает cookies
**Решение:** Использовать серверные действия Next.js для работы с cookies

### Проблема 4: CORS ошибки
**Решение:** Настроить правильные заголовки в Laravel CORS middleware

---

## 📚 Дополнительные ресурсы

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Laravel Cookies](https://laravel.com/docs/10.x/responses#cookies)
- [HTTPOnly Cookies Security](https://owasp.org/www-community/HttpOnly)
- [SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
