# Настройка авторизации

## Текущая реализация

Авторизация реализована на фронтенде с использованием mock API. Все данные хранятся в localStorage.

## Тестовые пользователи

Для тестирования доступны следующие пользователи:

### Клиент
- **Email:** `client@ecme.com`
- **Пароль:** `demo12345`
- **Роль:** `CLIENT`
- **Доступ:** `/client/*`

### Владелец бизнеса
- **Email:** `business@ecme.com`
- **Пароль:** `demo12345`
- **Роль:** `BUSINESS_OWNER`
- **Доступ:** `/business/*`

### Суперадмин
- **Email:** `admin@ecme.com`
- **Пароль:** `demo12345`
- **Роль:** `SUPERADMIN`
- **Доступ:** `/superadmin/*`

## Структура авторизации

### Stores (Zustand)

1. **authStore** (`src/store/authStore.js`)
   - Управляет состоянием авторизации
   - Хранит токены и базовую информацию о пользователе
   - Автоматически сохраняется в localStorage

2. **userStore** (`src/store/userStore.js`)
   - Хранит полную информацию о пользователе
   - Профиль, настройки, предпочтения

3. **businessStore** (`src/store/businessStore.js`)
   - Хранит информацию о текущем бизнесе (для multi-tenant)

### Сервисы

1. **MockAuthService** (`src/services/MockAuthService.js`)
   - Mock реализация API авторизации
   - Работает без бэкенда
   - Данные хранятся в памяти (при перезагрузке сбрасываются)

2. **LaravelAuthService** (`src/services/LaravelAuthService.js`)
   - Обертка для работы с Laravel API
   - Автоматически переключается на MockAuthService, если нет реального API
   - Использует переменную окружения `NEXT_PUBLIC_USE_MOCK_AUTH`

### Хуки (React Query)

**useAuth.ts** (`src/hooks/api/useAuth.ts`)
- `useLogin()` - вход в систему
- `useRegister()` - регистрация
- `useLogout()` - выход
- `useCurrentUser()` - получение текущего пользователя
- `useForgotPassword()` - восстановление пароля
- `useResetPassword()` - сброс пароля

### Компоненты защиты

1. **ProtectedRoute** (`src/components/auth/ProtectedRoute.jsx`)
   - Компонент для защиты маршрутов
   - Проверяет авторизацию и роль пользователя
   - Автоматически редиректит на `/sign-in` при отсутствии авторизации
   - Редиректит на `/access-denied` при отсутствии нужной роли

2. **AuthInitializer** (`src/components/auth/AuthInitializer.jsx`)
   - Инициализирует авторизацию при загрузке приложения
   - Восстанавливает состояние из localStorage

### Layouts

Все защищенные разделы используют `ProtectedRoute`:

- `/client/*` - только для роли `CLIENT`
- `/business/*` - для ролей `BUSINESS_OWNER` и `SUPERADMIN`
- `/superadmin/*` - только для роли `SUPERADMIN`

## Использование

### Вход в систему

```tsx
import { useLogin } from '@/hooks/api/useAuth'

const MyComponent = () => {
    const loginMutation = useLogin()
    
    const handleLogin = () => {
        loginMutation.mutate({
            email: 'client@ecme.com',
            password: 'demo12345'
        })
    }
    
    return <button onClick={handleLogin}>Войти</button>
}
```

### Проверка авторизации

```tsx
import { useAuthStore } from '@/store'

const MyComponent = () => {
    const { isAuthenticated, userRole } = useAuthStore()
    
    if (!isAuthenticated) {
        return <div>Не авторизован</div>
    }
    
    return <div>Роль: {userRole}</div>
}
```

### Защита маршрута

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { CLIENT } from '@/constants/roles.constant'

const MyPage = () => {
    return (
        <ProtectedRoute allowedRoles={[CLIENT]}>
            <div>Защищенный контент</div>
        </ProtectedRoute>
    )
}
```

## Переключение на реальный API

Для переключения на реальный Laravel API:

1. Установите переменную окружения в `.env.local`:
```env
NEXT_PUBLIC_LARAVEL_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

2. Убедитесь, что Laravel API работает и доступен по указанному URL

3. Автоматически будет использоваться реальный API вместо mock версии

## Токены

Токены хранятся в localStorage:
- `auth_token` - access token
- `refresh_token` - refresh token

При перезагрузке страницы состояние авторизации восстанавливается из localStorage через `authStore.persist`.

## Роли

Определены в `src/constants/roles.constant.js`:
- `CLIENT` - клиент платформы
- `BUSINESS_OWNER` - владелец бизнеса
- `SUPERADMIN` - администратор платформы

## Редиректы

После успешного входа пользователь автоматически перенаправляется:
- `CLIENT` → `/client/profile`
- `BUSINESS_OWNER` → `/business/dashboard`
- `SUPERADMIN` → `/superadmin/dashboard`

Настройки редиректов находятся в `src/configs/app.config.js`.

