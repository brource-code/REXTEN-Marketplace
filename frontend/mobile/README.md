# Mobile App MVP

Простое мобильное приложение для клиентской части маркетплейса.

**Как запустить по шагам (Node, Wi‑Fi, интернет, ошибки):** [ИНСТРУКЦИЯ_ПРОСТО.md](./ИНСТРУКЦИЯ_ПРОСТО.md)

## Что сделано

✅ **Убрано всё лишнее:**
- NativeWind полностью удалён
- Tailwind CSS удалён
- Все `className` удалены
- Используется только `StyleSheet` из React Native

✅ **Рабочий MVP:**
- Экран каталога услуг (`ServicesHomeScreen`)
- Экран фильтров (`FiltersScreen`)
- Экран деталей услуги (`ServiceDetailsScreen`)
- Базовые компоненты (ServiceCard, RatingBadge, TagBadgesRow, etc.)

## Запуск

Нужен **Node 20+**. Каталог проекта: **`frontend/mobile`** (от корня репозитория Rexten).

```bash
cd frontend/mobile
npm install
CI=false npm start
```

С телефона из интернета (без настройки DNS): `npm run start:trycloudflare` (нужен `cloudflared`). Подробнее: [QUICK_START.md](./QUICK_START.md).

Затем отсканируйте QR-код в Expo Go на iPhone.

## Конфигурация API

Создайте файл `.env` в папке `frontend/mobile/`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.72:8000/api
```

Или используйте дефолтные значения для локальной разработки.

## Структура

```
mobile/
├── src/
│   ├── api/          # API функции
│   ├── components/   # Переиспользуемые компоненты
│   ├── navigation/   # Навигация
│   ├── screens/     # Экраны приложения
│   └── types/        # TypeScript типы
├── App.tsx           # Точка входа
└── package.json
```

## Что дальше

- [ ] Добавить стили через StyleSheet для всех экранов
- [ ] Реализовать экран бронирования
- [ ] Добавить обработку ошибок API
- [ ] Оптимизировать производительность
