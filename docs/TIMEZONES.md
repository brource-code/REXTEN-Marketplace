# Таймзоны и время в Rexten

## Бэкенд (Laravel)

- В **`backend/config/app.php`**: `timezone` = `APP_TIMEZONE` из `.env`, по умолчанию **`America/Los_Angeles`**.
- Время в БД: Laravel обычно хранит `timestamp` в **UTC** (PostgreSQL `timestamp with time zone` / UTC).
- Отчёты и `Carbon::now()` на бэке зависят от `APP_TIMEZONE`, если явно не указан UTC.

## Компания (бизнес)

- У компании в профиле есть поле **`timezone`** (например `America/Los_Angeles`) — используется в **расписании, бронях, витрине бизнеса** (`businessStore`, формы расписания).

## Фронт (next-intl)

- В **`LocaleProvider`**: для `NextIntlClientProvider` задано **`timeZone="UTC"`** — это влияет на встроенные форматтеры next-intl, не на dayjs напрямую.

## Суперадминка

- Все даты/время в UI суперадмина приводятся к **одной зоне** и **US-формату**:
  - дата: **MM/DD/YYYY**;
  - время: **12-часовой**, **AM/PM** + аббревиатура зоны (**PST** / **PDT** и т.д.).
- Часовой пояс: **`SUPERADMIN_DISPLAY_TIMEZONE`** в `frontend/src/constants/superadmin-datetime.constant.js`, по умолчанию **`America/Los_Angeles`**.
- Переопределение без правки кода:

```env
NEXT_PUBLIC_SUPERADMIN_TIMEZONE=America/New_York
```

- Хелперы: `formatSuperadminDateTime`, `formatSuperadminDateOnly`, `formatSuperadminTimeOnly`, `formatSuperadminChartDayLabel` в `@/utils/dateTime`.

Итог: **клиент/бизнес** видят время в зоне бизнеса или локали; **суперадмин** — единообразно в US-зоне платформы.
