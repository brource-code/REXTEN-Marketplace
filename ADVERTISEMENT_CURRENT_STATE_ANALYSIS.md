# Анализ текущего состояния рекламы (Advertisements)

## ✅ Что уже реализовано

### 1. Базовая структура данных

**Модель `Advertisement`:**
- ✅ Типы объявлений: `'advertisement'` (реклама) и `'regular'` (обычное)
- ✅ Основные поля: `title`, `description`, `image`, `link`, `placement`
- ✅ Даты показа: `start_date`, `end_date` (обязательны для рекламных)
- ✅ Счетчики: `impressions`, `clicks` (есть поля, но не полностью используются)
- ✅ Статусы: `status` ('pending', 'approved', 'rejected'), `is_active`
- ✅ Приоритет: `priority` (1-10) для сортировки
- ✅ Геолокация: `city`, `state`
- ✅ Цены: `price_from`, `price_to`, `currency`
- ✅ Категория: `category_slug`
- ✅ JSON поля: `services`, `team`, `portfolio`, `schedule`

**Таблица `advertisement_displays`:**
- ✅ Хранит историю показов по сессиям
- ✅ Поля: `advertisement_id`, `session_id`, `user_id`, `placement`, `displayed_at`, `state`, `city`

### 2. Создание и управление объявлениями

**Backend API:**
- ✅ `POST /business/settings/advertisements` - создание объявления
- ✅ `PUT /business/settings/advertisements/{id}` - обновление
- ✅ `GET /business/settings/advertisements` - список объявлений бизнеса
- ✅ `GET /business/settings/advertisements/{id}` - детали объявления
- ✅ `DELETE /business/settings/advertisements/{id}` - удаление

**Admin API:**
- ✅ `GET /admin/advertisements` - список всех объявлений (с фильтрами)
- ✅ `POST /admin/advertisements` - создание объявления админом
- ✅ `GET /admin/advertisements/{id}` - детали объявления
- ✅ `PUT /admin/advertisements/{id}` - обновление
- ✅ `POST /admin/advertisements/{id}/approve` - одобрение
- ✅ `POST /admin/advertisements/{id}/reject` - отклонение

**Frontend:**
- ✅ Страница создания/редактирования объявлений (`/business/settings/advertisements/create`)
- ✅ Страница управления объявлениями (`/business/settings/advertisements`)
- ✅ Админ-панель для модерации (`/superadmin/advertisements`)

### 3. Отображение рекламных объявлений

**Backend:**
- ✅ `GET /advertisements/featured` - получение featured объявлений
- ✅ Ротация объявлений по сессиям (метод `getRotatedAdvertisements`)
- ✅ Фильтрация по датам (`start_date <= now <= end_date`)
- ✅ Фильтрация по статусу (`status = 'approved'`, `is_active = true`)
- ✅ Фильтрация по геолокации (state, city)
- ✅ Сортировка по приоритету и дате создания

**Frontend:**
- ✅ Отображение featured объявлений на странице `/services`
- ✅ Блок "Рекомендуемые" с бейджем "Реклама"
- ✅ Адаптивная верстка (горизонтальный скролл на мобильных, сетка на десктопе)
- ✅ Компонент `ServiceCard` с вариантом `variant="featured"`

### 4. Трекинг показов (impressions)

**Backend:**
- ✅ Автоматический подсчет показов в методе `getRotatedAdvertisements`
- ✅ Запись в таблицу `advertisement_displays` при каждом показе
- ✅ Обновление счетчика `impressions` в таблице `advertisements`
- ✅ Учет сессий для ротации (не показывать одно объявление дважды в сессии)

**Frontend:**
- ❌ **НЕТ** - трекинг показов происходит только на бэкенде при запросе featured объявлений

### 5. Трекинг кликов (clicks)

**Backend:**
- ✅ `POST /advertisements/{id}/click` - endpoint для трекинга кликов
- ✅ Обновление счетчика `clicks` в таблице `advertisements`

**Frontend:**
- ✅ Трекинг кликов в компоненте `ServiceCard` для рекламных объявлений
- ✅ Асинхронный запрос при клике (не блокирует переход)

### 6. Статистика

**Backend:**
- ✅ Вычисление CTR (Click-Through Rate) в методах `index` и `show`
- ✅ Формула: `CTR = (clicks / impressions) * 100`

**Frontend:**
- ✅ Отображение статистики в админ-панели (impressions, clicks, CTR)
- ✅ Отображение статистики в бизнес-панели

---

## ❌ Что НЕ реализовано (базовый вариант)

### 1. Трекинг показов на фронтенде

**Проблема:**
- Показы считаются только при запросе featured объявлений на бэкенде
- Если пользователь не кликает, но видит объявление, показ может не засчитаться
- Нет гарантии, что объявление действительно было показано пользователю

**Что нужно:**
- ✅ Добавить трекинг показов на фронтенде при рендере `ServiceCard` с `variant="featured"`
- ✅ Endpoint: `POST /advertisements/{id}/impression` (или использовать существующий механизм)

**Решение (простое):**
```javascript
// В ServiceCard.jsx
useEffect(() => {
    if (isAdvertisement && service.id) {
        const adId = parseInt(String(service.id).replace('ad_', ''))
        if (adId && !isNaN(adId)) {
            // Трекинг показа (только один раз при монтировании)
            fetch(`${apiUrl}/advertisements/${adId}/impression`, {
                method: 'POST',
                credentials: 'include',
            }).catch(err => console.error('Failed to track impression:', err))
        }
    }
}, [isAdvertisement, service.id])
```

**Backend endpoint:**
```php
// В AdvertisementsController.php
public function trackImpression($id)
{
    try {
        $advertisement = Advertisement::findOrFail($id);
        $advertisement->increment('impressions');
        
        // Опционально: запись в advertisement_displays
        AdvertisementDisplay::create([
            'advertisement_id' => $advertisement->id,
            'session_id' => session()->getId(),
            'user_id' => auth()->id(),
            'placement' => request()->get('placement', 'services'),
            'displayed_at' => now(),
        ]);
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false], 500);
    }
}
```

### 2. Детальная статистика

**Проблема:**
- Нет статистики по дням (показы/клики по дням)
- Нет уникальных показов/кликов
- Нет статистики по геолокации (из каких штатов/городов клики)

**Что нужно:**
- ✅ Endpoint: `GET /advertisements/{id}/stats` - детальная статистика
- ✅ Статистика по дням (график)
- ✅ Уникальные показы/клики (по IP или user_id)
- ✅ Статистика по геолокации

**Решение (простое):**
```php
// В AdvertisementsController.php
public function getStats($id)
{
    $advertisement = Advertisement::findOrFail($id);
    
    // Статистика по дням
    $displaysByDay = AdvertisementDisplay::where('advertisement_id', $id)
        ->selectRaw('DATE(displayed_at) as date, COUNT(*) as count')
        ->groupBy('date')
        ->orderBy('date', 'desc')
        ->get();
    
    // Уникальные показы (по IP или user_id)
    $uniqueImpressions = AdvertisementDisplay::where('advertisement_id', $id)
        ->distinct('user_id', 'session_id')
        ->count();
    
    return response()->json([
        'advertisement_id' => $id,
        'total_impressions' => $advertisement->impressions,
        'total_clicks' => $advertisement->clicks,
        'unique_impressions' => $uniqueImpressions,
        'ctr' => $advertisement->impressions > 0 
            ? round(($advertisement->clicks / $advertisement->impressions) * 100, 2) 
            : 0,
        'impressions_by_day' => $displaysByDay,
        // Можно добавить клики по дням, если будет таблица advertisement_clicks
    ]);
}
```

### 3. Автоматическое управление жизненным циклом

**Проблема:**
- Нет автоматической активации/деактивации по датам
- Нет уведомлений о скором окончании кампании
- Нет автоматической остановки при достижении лимитов

**Что нужно:**
- ✅ Cron задача для проверки дат (`start_date`, `end_date`)
- ✅ Автоматическая активация при наступлении `start_date`
- ✅ Автоматическая деактивация при наступлении `end_date`

**Решение (простое):**
```php
// В app/Console/Kernel.php или отдельная команда
// Запускать каждые 5-10 минут
php artisan schedule:run

// Команда: app/Console/Commands/UpdateAdvertisementStatus.php
public function handle()
{
    // Активируем объявления, у которых наступила start_date
    Advertisement::where('status', 'approved')
        ->where('is_active', false)
        ->where('start_date', '<=', now())
        ->where('end_date', '>=', now())
        ->update(['is_active' => true]);
    
    // Деактивируем объявления, у которых прошла end_date
    Advertisement::where('is_active', true)
        ->where('end_date', '<', now())
        ->update(['is_active' => false]);
}
```

### 4. Биллинг (базовый вариант)

**Проблема:**
- Нет связи с оплатой
- Нет расчета стоимости кампании
- Нет управления бюджетом

**Что нужно (минимально):**
- ✅ Поле `price_per_day` в таблице `advertisements` (или отдельная таблица `advertisement_billing`)
- ✅ Расчет стоимости: `(end_date - start_date) * price_per_day`
- ✅ Статус оплаты: `payment_status` ('pending', 'paid', 'failed')

**Решение (простое):**
```php
// Миграция: добавить поля в advertisements
$table->decimal('price_per_day', 10, 2)->nullable();
$table->enum('payment_status', ['pending', 'paid', 'failed'])->default('pending');
$table->timestamp('paid_at')->nullable();

// Метод расчета стоимости
public function calculateCost()
{
    if (!$this->start_date || !$this->end_date || !$this->price_per_day) {
        return 0;
    }
    
    $days = $this->start_date->diffInDays($this->end_date) + 1;
    return $days * $this->price_per_day;
}
```

---

## 📋 План доделки (базовый вариант, без усложнений)

### Приоритет 1: Критично для работы

1. **Трекинг показов на фронтенде** (1-2 часа)
   - Добавить `useEffect` в `ServiceCard.jsx`
   - Создать endpoint `POST /advertisements/{id}/impression`
   - Протестировать подсчет показов

2. **Автоматическое управление жизненным циклом** (2-3 часа)
   - Создать Artisan команду `UpdateAdvertisementStatus`
   - Добавить в `schedule` (каждые 10 минут)
   - Протестировать активацию/деактивацию

### Приоритет 2: Важно для аналитики

3. **Детальная статистика** (3-4 часа)
   - Endpoint `GET /advertisements/{id}/stats`
   - Статистика по дням
   - Уникальные показы
   - Интеграция в админ-панель

### Приоритет 3: Опционально (можно позже)

4. **Базовый биллинг** (4-5 часов)
   - Добавить поля `price_per_day`, `payment_status`
   - Метод расчета стоимости
   - Отображение стоимости в админ-панели

---

## 🎯 Итоговая оценка

**Что работает:**
- ✅ Создание и управление объявлениями
- ✅ Модерация (одобрение/отклонение)
- ✅ Отображение featured объявлений
- ✅ Ротация по сессиям
- ✅ Трекинг кликов
- ✅ Базовая статистика (impressions, clicks, CTR)

**Что нужно доделать:**
- ❌ Трекинг показов на фронтенде (критично)
- ❌ Автоматическое управление жизненным циклом (важно)
- ❌ Детальная статистика (желательно)
- ❌ Базовый биллинг (опционально)

**Время на доделку:** 6-10 часов работы

**Сложность:** Низкая (все решения простые, без усложнений)
