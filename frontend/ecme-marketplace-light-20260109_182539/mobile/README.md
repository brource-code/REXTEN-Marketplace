# Mobile App MVP

Простое мобильное приложение для клиентской части маркетплейса.

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

```bash
cd mobile
npm install
npx expo start
```

Затем отсканируйте QR-код в Expo Go на iPhone.

## Конфигурация API

Создайте файл `.env` в папке `mobile/`:

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
