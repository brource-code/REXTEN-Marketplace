# План разработки микросервиса локаций

## 📋 Оглавление
1. [Обзор и цели](#обзор-и-цели)
2. [Архитектура](#архитектура)
3. [Структура проекта](#структура-проекта)
4. [API эндпоинты](#api-эндпоинты)
5. [Frontend интеграция](#frontend-интеграция)
6. [План реализации](#план-реализации)
7. [Миграция существующего кода](#миграция-существующего-кода)

---

## 🎯 Обзор и цели

### Проблемы текущей реализации
1. **Двойное состояние**: `heroState`/`heroCity` и `stateFilter`/`cityFilter` конфликтуют
2. **Множество источников**: Константы, API, localStorage, профиль пользователя
3. **9+ useEffect**: Сложная синхронизация состояний
4. **Неясные приоритеты**: Непонятно, что важнее при конфликте
5. **Дублирование кода**: Логика локаций разбросана по 15+ файлам

### Цели микросервиса
- ✅ **Единый источник истины** для всех локаций
- ✅ **Переиспользуемость** через React Context/Provider
- ✅ **Отсутствие конфликтов** между компонентами
- ✅ **Простота использования** через хуки и компоненты
- ✅ **Кэширование** для производительности
- ✅ **Типобезопасность** через TypeScript

---

## 🏗️ Архитектура

### Концепция: Location Service как React Context + API

```
┌─────────────────────────────────────────────────────────────┐
│                    Location Service                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LocationProvider (React Context)                    │  │
│  │  - Единое состояние локации                         │  │
│  │  - Синхронизация с API                              │  │
│  │  - Кэширование данных                               │  │
│  │  - Персистентность (localStorage/cookies)           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Location API Client                                  │  │
│  │  - GET /api/locations/states                         │  │
│  │  - GET /api/locations/cities?state=CA                │  │
│  │  - GET /api/locations/search?q=Los Angeles           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │ Services │        │ Profile  │        │ Filters  │
  │  Page    │        │  Page    │        │  Panel   │
  └──────────┘        └──────────┘        └──────────┘
```

### Принципы проектирования

1. **Single Source of Truth (SSOT)**
   - Одно состояние локации в `LocationProvider`
   - Все компоненты используют одно и то же состояние

2. **Separation of Concerns**
   - UI компоненты не знают о логике синхронизации
   - API клиент изолирован от UI
   - Кэширование прозрачно для компонентов

3. **Reactive Updates**
   - Изменение локации автоматически обновляет все компоненты
   - Нет необходимости в ручной синхронизации

4. **Performance First**
   - Кэширование на уровне API клиента
   - Мемоизация в React компонентах
   - Ленивая загрузка данных

---

## 📁 Структура проекта

### Backend (Laravel)

```
backend/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       └── LocationController.php      # Новый контроллер
│   ├── Models/
│   │   ├── State.php                      # Модель штата (если нужна БД)
│   │   └── City.php                       # Модель города (если нужна БД)
│   └── Services/
│       └── LocationService.php             # Бизнес-логика локаций
├── database/
│   └── migrations/
│       ├── create_states_table.php         # Опционально: таблица штатов
│       └── create_cities_table.php         # Опционально: таблица городов
└── routes/
    └── api.php                             # Добавить маршруты локаций
```

### Frontend (Next.js)

```
src/
├── services/
│   └── location/
│       ├── LocationService.ts              # API клиент
│       ├── LocationCache.ts                # Кэш локаций
│       └── types.ts                        # TypeScript типы
├── contexts/
│   └── LocationContext.tsx                 # React Context
├── hooks/
│   ├── useLocation.ts                     # Основной хук
│   ├── useLocationState.ts                # Хук для состояния
│   └── useLocationFilters.ts              # Хук для фильтров
├── components/
│   └── location/
│       ├── LocationProvider.tsx            # Provider компонент
│       ├── StateSelect.tsx                 # Компонент выбора штата
│       ├── CitySelect.tsx                  # Компонент выбора города
│       └── LocationDisplay.tsx             # Компонент отображения
└── constants/
    └── us-locations.constant.ts           # Статические данные (fallback)
```

---

## 🔌 API эндпоинты

### 1. GET /api/locations/states

**Описание**: Получить список всех штатов США

**Параметры**:
- `active_only` (boolean, optional): Только штаты с активными компаниями/услугами
- `format` (string, optional): Формат ответа (`full` | `minimal`)

**Ответ**:
```json
{
  "success": true,
  "data": [
    {
      "id": "CA",
      "code": "CA",
      "name": "California",
      "fullName": "State of California",
      "citiesCount": 150,
      "servicesCount": 1250
    }
  ],
  "meta": {
    "total": 51,
    "cached": true,
    "cacheExpiresAt": "2025-12-03T10:00:00Z"
  }
}
```

### 2. GET /api/locations/cities

**Описание**: Получить список городов по штату

**Параметры**:
- `state` (string, required): ID штата (например, "CA")
- `search` (string, optional): Поиск по названию города
- `limit` (integer, optional): Лимит результатов (default: 100)
- `active_only` (boolean, optional): Только города с активными услугами

**Ответ**:
```json
{
  "success": true,
  "data": [
    {
      "id": "los-angeles",
      "name": "Los Angeles",
      "stateId": "CA",
      "stateName": "California",
      "servicesCount": 450
    }
  ],
  "meta": {
    "state": "CA",
    "total": 150,
    "cached": true
  }
}
```

### 3. GET /api/locations/search

**Описание**: Поиск локаций (штаты и города)

**Параметры**:
- `q` (string, required): Поисковый запрос
- `type` (string, optional): Тип (`state` | `city` | `all`)
- `limit` (integer, optional): Лимит результатов

**Ответ**:
```json
{
  "success": true,
  "data": {
    "states": [
      {
        "id": "CA",
        "name": "California",
        "type": "state"
      }
    ],
    "cities": [
      {
        "id": "los-angeles",
        "name": "Los Angeles",
        "stateId": "CA",
        "type": "city"
      }
    ]
  }
}
```

### 4. GET /api/locations/validate

**Описание**: Валидация локации (штат + город)

**Параметры**:
- `state` (string, required): ID штата
- `city` (string, optional): Название города

**Ответ**:
```json
{
  "success": true,
  "valid": true,
  "data": {
    "state": {
      "id": "CA",
      "name": "California"
    },
    "city": {
      "id": "los-angeles",
      "name": "Los Angeles"
    }
  }
}
```

---

## 💻 Frontend интеграция

### 1. LocationProvider (React Context)

```typescript
// src/contexts/LocationContext.tsx
interface LocationState {
  state: string | null;
  city: string | null;
  availableStates: State[];
  availableCities: City[];
  isLoading: boolean;
  error: Error | null;
}

interface LocationContextValue {
  // Состояние
  state: string | null;
  city: string | null;
  availableStates: State[];
  availableCities: City[];
  
  // Действия
  setState: (stateId: string | null) => void;
  setCity: (cityName: string | null) => void;
  setLocation: (stateId: string | null, cityName: string | null) => void;
  reset: () => void;
  
  // Утилиты
  getStateName: (stateId: string) => string;
  getCityName: (cityName: string) => string;
  isValidLocation: (stateId: string, cityName?: string) => boolean;
  
  // Метаданные
  isLoading: boolean;
  error: Error | null;
}
```

### 2. useLocation Hook

```typescript
// src/hooks/useLocation.ts
export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}
```

### 3. useLocationState Hook (для фильтров)

```typescript
// src/hooks/useLocationState.ts
export function useLocationState() {
  const { state, city, setState, setCity, setLocation, reset } = useLocation();
  
  return {
    state,
    city,
    setState,
    setCity,
    setLocation,
    reset,
  };
}
```

### 4. Компоненты

#### StateSelect
```typescript
// src/components/location/StateSelect.tsx
interface StateSelectProps {
  value?: string | null;
  onChange?: (stateId: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function StateSelect({ value, onChange, ...props }: StateSelectProps) {
  const { availableStates, setState, isLoading } = useLocation();
  
  // Использует react-select или другой компонент
  return (
    <Select
      options={availableStates}
      value={value}
      onChange={(option) => {
        const newState = option?.value || null;
        setState(newState);
        onChange?.(newState);
      }}
      isLoading={isLoading}
      {...props}
    />
  );
}
```

#### CitySelect
```typescript
// src/components/location/CitySelect.tsx
export function CitySelect({ value, onChange, ...props }: CitySelectProps) {
  const { state, availableCities, setCity, isLoading } = useLocation();
  
  // Показываем только если выбран штат
  if (!state) return null;
  
  return (
    <Select
      options={availableCities}
      value={value}
      onChange={(option) => {
        const newCity = option?.value || null;
        setCity(newCity);
        onChange?.(newCity);
      }}
      isLoading={isLoading}
      {...props}
    />
  );
}
```

---

## 📝 План реализации

### Этап 1: Backend API (1-2 дня)

#### Задачи:
1. ✅ Создать `LocationController.php`
2. ✅ Добавить маршруты в `api.php`
3. ✅ Реализовать методы:
   - `getStates()` - список штатов
   - `getCities($stateId)` - список городов
   - `search($query)` - поиск локаций
   - `validate($stateId, $cityName)` - валидация
4. ✅ Добавить кэширование (Redis/Memcached)
5. ✅ Добавить fallback на статические константы

#### Критерии готовности:
- Все эндпоинты работают
- Кэширование настроено
- Тесты написаны (опционально)

### Этап 2: Frontend API Client (1 день)

#### Задачи:
1. ✅ Создать `LocationService.ts`
2. ✅ Реализовать методы API клиента
3. ✅ Добавить кэширование на клиенте
4. ✅ Добавить обработку ошибок
5. ✅ Добавить TypeScript типы

#### Критерии готовности:
- API клиент работает
- Кэширование работает
- Типы определены

### Этап 3: React Context & Hooks (1-2 дня)

#### Задачи:
1. ✅ Создать `LocationContext.tsx`
2. ✅ Создать `LocationProvider.tsx`
3. ✅ Реализовать логику синхронизации:
   - С API
   - С localStorage/cookies
   - С профилем пользователя
4. ✅ Создать хуки:
   - `useLocation()`
   - `useLocationState()`
   - `useLocationFilters()`
5. ✅ Добавить персистентность

#### Критерии готовности:
- Context работает
- Хуки работают
- Персистентность работает
- Нет конфликтов состояний

### Этап 4: UI Компоненты (1 день)

#### Задачи:
1. ✅ Создать `StateSelect.tsx`
2. ✅ Создать `CitySelect.tsx`
3. ✅ Создать `LocationDisplay.tsx`
4. ✅ Добавить стилизацию
5. ✅ Добавить accessibility

#### Критерии готовности:
- Компоненты работают
- Стили применены
- Accessibility проверен

### Этап 5: Миграция существующего кода (2-3 дня)

#### Задачи:
1. ✅ Заменить использование констант на `useLocation()`
2. ✅ Заменить `heroState`/`heroCity` на `useLocationState()`
3. ✅ Заменить `stateFilter`/`cityFilter` на `useLocationFilters()`
4. ✅ Удалить дублирующие `useEffect`
5. ✅ Обновить страницу `/services`
6. ✅ Обновить страницу `/profile`
7. ✅ Обновить формы регистрации
8. ✅ Обновить карточки услуг

#### Критерии готовности:
- Все компоненты используют новый сервис
- Нет дублирования кода
- Все тесты проходят (если есть)

### Этап 6: Тестирование и оптимизация (1 день)

#### Задачи:
1. ✅ Протестировать все сценарии использования
2. ✅ Проверить производительность
3. ✅ Оптимизировать кэширование
4. ✅ Добавить мониторинг (опционально)
5. ✅ Документация

#### Критерии готовности:
- Все работает корректно
- Производительность приемлема
- Документация написана

---

## 🔄 Миграция существующего кода

### Шаг 1: Обновить Layout

```typescript
// src/app/layout.jsx
import { LocationProvider } from '@/components/location/LocationProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LocationProvider>
          {children}
        </LocationProvider>
      </body>
    </html>
  );
}
```

### Шаг 2: Обновить страницу Services

```typescript
// src/app/(public)/services/page.jsx
// БЫЛО:
const [heroState, setHeroState] = useState('');
const [heroCity, setHeroCity] = useState('');
const [stateFilter, setStateFilter] = useState('');
const [cityFilter, setCityFilter] = useState('');

// СТАЛО:
const { state, city, setState, setCity } = useLocation();
// state и city используются везде вместо heroState/heroCity и stateFilter/cityFilter
```

### Шаг 3: Обновить компоненты

```typescript
// БЫЛО:
<Select
  options={US_STATES.map(s => ({ value: s.id, label: s.name }))}
  value={heroState}
  onChange={(opt) => setHeroState(opt?.value || '')}
/>

// СТАЛО:
<StateSelect
  value={state}
  onChange={setState}
/>
```

### Шаг 4: Удалить старый код

1. Удалить дублирующие `useState`
2. Удалить синхронизирующие `useEffect`
3. Удалить использование констант напрямую (оставить как fallback)
4. Удалить localStorage логику (перенести в Provider)

---

## 📊 Сравнение: До и После

### До (Текущая реализация)

```typescript
// Множество состояний
const [heroState, setHeroState] = useState('');
const [heroCity, setHeroCity] = useState('');
const [stateFilter, setStateFilter] = useState('');
const [cityFilter, setCityFilter] = useState('');

// 9+ useEffect для синхронизации
useEffect(() => { /* синхронизация heroState -> stateFilter */ }, [heroState]);
useEffect(() => { /* обновление городов */ }, [stateFilter]);
useEffect(() => { /* сохранение в localStorage */ }, [heroState]);
// ... и так далее

// Конфликты при использовании
const activeState = stateFilter || heroState; // Что важнее?
```

### После (С микросервисом)

```typescript
// Одно состояние
const { state, city, setState, setCity } = useLocation();

// Нет необходимости в синхронизации - все автоматически
// Нет конфликтов - единый источник истины

// Простое использование
<StateSelect value={state} onChange={setState} />
<CitySelect value={city} onChange={setCity} />
```

---

## 🎯 Преимущества

1. **Упрощение кода**: Удаление 9+ useEffect и дублирующих состояний
2. **Единый источник истины**: Нет конфликтов между компонентами
3. **Переиспользуемость**: Один Provider для всего приложения
4. **Производительность**: Кэширование на уровне API и клиента
5. **Типобезопасность**: TypeScript типы для всех локаций
6. **Тестируемость**: Легко тестировать изолированные компоненты
7. **Масштабируемость**: Легко добавить новые функции (геолокация, автозаполнение и т.д.)

---

## 📚 Дополнительные возможности (будущее)

1. **Геолокация**: Автоматическое определение локации пользователя
2. **Автозаполнение**: Умный поиск городов при вводе
3. **Валидация**: Проверка корректности локации перед отправкой
4. **История**: Сохранение последних выбранных локаций
5. **Аналитика**: Отслеживание популярных локаций
6. **Мультиязычность**: Переводы названий штатов и городов

---

## ✅ Чеклист готовности

- [ ] Backend API реализован и протестирован
- [ ] Frontend API клиент реализован
- [ ] React Context и Provider работают
- [ ] Хуки созданы и протестированы
- [ ] UI компоненты созданы
- [ ] Миграция существующего кода завершена
- [ ] Документация написана
- [ ] Производительность проверена
- [ ] Все тесты проходят

---

## 📞 Вопросы для обсуждения

1. Нужна ли база данных для локаций или достаточно статических данных?
2. Какой формат кэширования предпочтителен (Redis, Memcached, in-memory)?
3. Нужна ли поддержка других стран кроме США?
4. Нужна ли геолокация для автоматического определения локации?
5. Какой приоритет при конфликте: профиль пользователя или выбранная локация?

---

**Дата создания**: 2025-12-03  
**Версия**: 1.0  
**Статус**: План готов к реализации

