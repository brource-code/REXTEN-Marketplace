# План настройки Cookies для Production

## 📋 Обзор

Этот документ содержит пошаговый план настройки системы cookies для production окружения. Базовая функциональность уже реализована для локальной разработки.

## ✅ Что уже реализовано (локальная разработка)

1. ✅ Компонент `CookieConsentModal` - модалка принятия cookies
2. ✅ Сервис `cookieService.ts` - работа с cookies согласия
3. ✅ Провайдер `CookieConsentProvider` - управление состоянием
4. ✅ Интеграция в главный layout
5. ✅ Типы TypeScript для работы с cookies

## 🚀 План для Production

### Этап 1: Настройка безопасности (Критично)

#### 1.1 Обновление `.env` файла

Добавить/обновить следующие переменные окружения:

```env
# Session cookies
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=.yourdomain.com

# Общие cookies
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com
```

**Важно:**
- `SESSION_SECURE_COOKIE=true` - только для HTTPS
- `COOKIE_SECURE=true` - только для HTTPS
- `SESSION_DOMAIN` и `COOKIE_DOMAIN` - установить правильный домен

#### 1.2 Обновление конфигурации Laravel

**Файл:** `backend/config/session.php`

```php
'secure' => env('SESSION_SECURE_COOKIE', true), // Изменить default на true
'same_site' => 'lax', // Или 'none' для кросс-доменных запросов
```

**Файл:** `backend/config/cookie.php`

```php
'secure' => env('COOKIE_SECURE', true), // Изменить default на true
'same_site' => 'lax', // Или 'none' для кросс-доменных запросов
```

### Этап 2: Миграция сессий на Database (Рекомендуется)

#### 2.1 Создать таблицу sessions

```bash
php artisan session:table
php artisan migrate
```

#### 2.2 Обновить `.env`

```env
SESSION_DRIVER=database
```

#### 2.3 Настроить очистку старых сессий

**Создать команду:** `backend/app/Console/Commands/CleanOldSessions.php`

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanOldSessions extends Command
{
    protected $signature = 'sessions:clean';
    protected $description = 'Clean expired sessions';

    public function handle()
    {
        $lifetime = config('session.lifetime');
        $expired = now()->subMinutes($lifetime);
        
        DB::table('sessions')
            ->where('last_activity', '<', $expired->timestamp)
            ->delete();
            
        $this->info('Expired sessions cleaned');
    }
}
```

**Добавить в `app/Console/Kernel.php`:**

```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('sessions:clean')->hourly();
}
```

### Этап 3: Улучшение cookieService для Production

#### 3.1 Добавить поддержку HttpOnly cookies через API

**Создать endpoint:** `backend/app/Http/Controllers/CookieConsentController.php`

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

class CookieConsentController extends Controller
{
    public function setConsent(Request $request)
    {
        $consent = $request->validate([
            'necessary' => 'boolean',
            'analytics' => 'boolean',
            'marketing' => 'boolean',
        ]);

        $consent['timestamp'] = now()->timestamp;
        $consent['necessary'] = true; // Всегда true

        $cookie = Cookie::make(
            'cookie_consent',
            json_encode($consent),
            365 * 24 * 60, // 1 год в минутах
            '/',
            config('cookie.domain'),
            config('cookie.secure'),
            true, // httpOnly
            false,
            config('cookie.same_site')
        );

        return response()->json(['success' => true])
            ->cookie($cookie);
    }

    public function getConsent(Request $request)
    {
        $consent = $request->cookie('cookie_consent');
        
        if ($consent) {
            return response()->json([
                'consent' => json_decode($consent, true)
            ]);
        }

        return response()->json(['consent' => null]);
    }
}
```

**Добавить routes:** `backend/routes/api.php`

```php
Route::post('/cookie-consent', [CookieConsentController::class, 'setConsent']);
Route::get('/cookie-consent', [CookieConsentController::class, 'getConsent']);
```

#### 3.2 Обновить `cookieService.ts` для использования API

Добавить методы для работы через API:

```typescript
export async function setCookieConsentViaAPI(consent: Partial<CookieConsent>): Promise<void> {
    try {
        const response = await fetch('/api/cookie-consent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Важно для cookies
            body: JSON.stringify(consent),
        });

        if (!response.ok) {
            throw new Error('Failed to set cookie consent');
        }

        // Также сохраняем в localStorage для быстрого доступа
        const fullConsent: CookieConsent = {
            necessary: true,
            analytics: consent.analytics ?? false,
            marketing: consent.marketing ?? false,
            timestamp: Date.now(),
        };
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullConsent));
    } catch (error) {
        console.error('Error setting cookie consent via API:', error);
        // Fallback на localStorage
        setCookieConsent(consent);
    }
}
```

### Этап 4: Интеграция аналитики и рекламы

#### 4.1 Создать хелпер для условной загрузки скриптов

**Файл:** `src/utils/services/analyticsLoader.ts`

```typescript
import { hasConsentForType } from './cookieService';

export function loadAnalytics() {
    if (!hasConsentForType('analytics')) {
        return;
    }

    // Загрузка Google Analytics, Yandex Metrika и т.д.
    // Пример:
    // gtag('config', 'GA_MEASUREMENT_ID');
}

export function loadMarketing() {
    if (!hasConsentForType('marketing')) {
        return;
    }

    // Загрузка рекламных скриптов
    // Пример: Facebook Pixel, Google Ads и т.д.
}
```

#### 4.2 Использовать в компонентах

```typescript
import { useCookieConsent } from '@/components/cookies/CookieConsentProvider';

function MyComponent() {
    const hasAnalytics = useCookieConsent('analytics');
    
    useEffect(() => {
        if (hasAnalytics) {
            // Загрузить аналитику
        }
    }, [hasAnalytics]);
}
```

### Этап 5: Мониторинг и логирование

#### 5.1 Добавить логирование согласий

**В `CookieConsentController.php`:**

```php
use Illuminate\Support\Facades\Log;

public function setConsent(Request $request)
{
    // ... существующий код ...
    
    Log::info('Cookie consent updated', [
        'user_id' => auth()->id(),
        'ip' => $request->ip(),
        'consent' => $consent,
    ]);
    
    // ... остальной код ...
}
```

#### 5.2 Добавить метрики

Создать события для отслеживания:
- Количество принятий/отказов
- Популярность различных комбинаций настроек
- Процент пользователей, принимающих все cookies

### Этап 6: Тестирование

#### 6.1 Проверочный список

- [ ] Модалка появляется при первом визите
- [ ] Согласие сохраняется в cookie
- [ ] Cookie имеет правильные атрибуты (secure, httpOnly, sameSite)
- [ ] Согласие не показывается повторно после принятия
- [ ] Аналитика загружается только при согласии
- [ ] Маркетинговые скрипты загружаются только при согласии
- [ ] Работает на всех браузерах (Chrome, Firefox, Safari, Edge)
- [ ] Работает на мобильных устройствах
- [ ] Правильно работает с HTTPS

#### 6.2 Тестирование на staging

1. Развернуть на staging окружении
2. Проверить все функции
3. Проверить производительность
4. Проверить безопасность (OWASP рекомендации)

### Этап 7: Документация и политика конфиденциальности

#### 7.1 Создать страницу политики конфиденциальности

**Файл:** `src/app/(public)/privacy-policy/page.jsx`

Должна содержать:
- Какие cookies используются
- Для чего они используются
- Как долго хранятся
- Как отозвать согласие

#### 7.2 Обновить Terms of Service

Добавить информацию о cookies в пользовательское соглашение.

## 🔒 Безопасность

### Рекомендации

1. **HttpOnly cookies** - использовать для критичных данных
2. **Secure flag** - всегда в production (HTTPS)
3. **SameSite** - использовать 'lax' или 'strict' по умолчанию
4. **Domain** - устанавливать только при необходимости
5. **Expiry** - разумные сроки (не слишком долго)

### Проверка безопасности

- [ ] Проверить через OWASP ZAP
- [ ] Проверить через Burp Suite
- [ ] Проверить на уязвимости XSS
- [ ] Проверить на уязвимости CSRF

## 📊 Мониторинг

### Метрики для отслеживания

1. Процент пользователей, принимающих cookies
2. Процент пользователей, отказывающихся от аналитики
3. Процент пользователей, отказывающихся от маркетинга
4. Количество повторных показов модалки (ошибки)

### Инструменты

- Google Analytics (если разрешено)
- Собственные логи
- Sentry для ошибок

## 🚨 Чеклист перед деплоем

- [ ] Все переменные окружения установлены
- [ ] `SESSION_SECURE_COOKIE=true` в production
- [ ] `COOKIE_SECURE=true` в production
- [ ] Правильный `SESSION_DOMAIN` и `COOKIE_DOMAIN`
- [ ] `SESSION_DRIVER=database` или `redis`
- [ ] Настроена очистка старых сессий
- [ ] Протестировано на staging
- [ ] Политика конфиденциальности создана
- [ ] Документация обновлена
- [ ] Команда проинформирована

## 📝 Примечания

- Для локальной разработки текущая реализация достаточна
- Все production настройки должны быть применены перед деплоем
- Регулярно проверяйте логи на наличие проблем
- Обновляйте политику конфиденциальности при изменении cookies

## 🔗 Полезные ссылки

- [GDPR Compliance](https://gdpr.eu/)
- [CCPA Compliance](https://oag.ca.gov/privacy/ccpa)
- [OWASP Cookie Security](https://owasp.org/www-community/HttpOnly)
- [MDN Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

