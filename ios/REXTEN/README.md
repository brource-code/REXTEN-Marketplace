# REXTEN — нативный клиент (SwiftUI)

Минимальный **iOS 17+** клиент маркетплейса REXTEN: каталог, карточка объявления, избранное, бронирования, профиль. API: `https://api.rexten.live/api` (переопределение переменной окружения **`REXTEN_API_BASE`** в схеме Xcode).

## Сборка

1. Установите [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`
2. В каталоге `ios/REXTEN/` выполните: `xcodegen generate`
3. Откройте сгенерированный `REXTEN.xcodeproj` в Xcode на macOS, выберите симулятор или устройство, **Run**.

Токены хранятся в **Keychain**; светлая и тёмная тема задаются в приложении (`ThemeManager` / `AppTheme` в `Sources/Core`).

## Экраны входа и регистрации

Вёрстка в духе веба `(auth-pages)/sign-in` и `sign-up`: блок **REXTEN / MARKETPLACE**, заголовок и подзаголовок, поля с подписями, разделитель «or continue with», кнопка **Google** с PNG-иконкой (`Assets.xcassets/GoogleLogo`), основная кнопка — синяя (`PrimaryButton`). Тексты пока на английском, как в `messages/en.json` для `auth.signIn` / `auth.signUp`.

## Структура

- `Sources/App` — точка входа, `ContentView` (гость / клиент по JWT)
- `Sources/Core` — `APIConfig`, `APIClient` (Bearer + refresh при 401), `KeychainStore`, `AuthManager`, `ThemeManager` / `AppTheme`
- `Sources/Models` — DTO под ответы Laravel
- `Sources/Components` — кнопки, поля формы, `AuthBrandingHeader`, `GoogleSignInButton`
- `Sources/Features` — экраны по областям
- `Sources/Navigation` — `GuestTabView`, `ClientTabView`

## Примечания

- Регистрация с подтверждением email: после `POST /auth/register` открывается ввод кода → `POST /auth/email/verify-code`.
- Обновление профиля: `PUT /client/profile` (как в веб-клиенте и общем API).

### Авторизация и бэкенд

- Логин: `POST /auth/login` с JSON `{ "email", "password", "locale"? }`. Ответ содержит `access_token`, **`refresh_token`** (в теле JSON; cookie для веба сохраняется отдельно).
- Обновление токена: `POST /auth/refresh` с телом `{ "refresh_token": "..." }` (как в веб-клиенте) или с cookie `refresh_token`.
- Google: старт `GET /api/auth/google/redirect?ios=1` — после успешного входа редирект на **`com.rexten.client://auth/callback?access_token=…&refresh_token=…`** (схема задаётся на сервере `GOOGLE_IOS_CALLBACK_SCHEME` в `.env`, по умолчанию `com.rexten.client`). Новый аккаунт Google → `…://auth/google/pending?pending=…` (выбор роли на стороне приложения позже).
- Переменные Xcode: **`REXTEN_API_BASE`**, опционально **`REXTEN_GOOGLE_CALLBACK_SCHEME`** (должна совпадать с схемой в Info.plist и с бэкендом).
