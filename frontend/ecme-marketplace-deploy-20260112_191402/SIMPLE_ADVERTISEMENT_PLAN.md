# План реализации простой модели рекламных объявлений

## 🎯 Цель
Простая модель с:
- Размещением по времени (start_date, end_date)
- Подсчетом переходов (кликов)
- Простым биллингом (оплата по времени размещения)

---

## 📊 Архитектура

### 1. Трекинг кликов (Advertisement Clicks)

**Таблица `advertisement_clicks`:**
```sql
- id (primary key)
- advertisement_id (foreign key -> advertisements.id)
- clicked_at (timestamp) - когда был клик
- ip_address (string, nullable) - IP пользователя
- user_agent (string, nullable) - браузер пользователя
- user_id (foreign key -> users.id, nullable) - если пользователь авторизован
- session_id (string, nullable) - ID сессии
- referrer (string, nullable) - откуда пришел пользователь
- created_at, updated_at
```

**Модель `AdvertisementClick`:**
```php
class AdvertisementClick extends Model
{
    protected $fillable = [
        'advertisement_id',
        'clicked_at',
        'ip_address',
        'user_agent',
        'user_id',
        'session_id',
        'referrer',
    ];
    
    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

**Логика:**
- При каждом клике на рекламное объявление создается запись в таблице
- Обновляется счетчик `clicks` в таблице `advertisements` (для быстрого доступа)
- Можно получить статистику: общее количество кликов, клики по дням, уникальные клики

---

### 2. Биллинг (Advertisement Billing)

**Таблица `advertisement_billing`:**
```sql
- id (primary key)
- advertisement_id (foreign key -> advertisements.id)
- company_id (foreign key -> companies.id)
- billing_period_start (date) - начало периода оплаты
- billing_period_end (date) - конец периода оплаты
- days_count (integer) - количество дней размещения
- price_per_day (decimal) - цена за день
- total_amount (decimal) - общая сумма к оплате
- status (enum: 'pending', 'paid', 'failed', 'refunded')
- payment_date (timestamp, nullable) - когда оплачено
- payment_method (string, nullable) - способ оплаты
- payment_reference (string, nullable) - ID транзакции
- created_at, updated_at
```

**Модель `AdvertisementBilling`:**
```php
class AdvertisementBilling extends Model
{
    protected $fillable = [
        'advertisement_id',
        'company_id',
        'billing_period_start',
        'billing_period_end',
        'days_count',
        'price_per_day',
        'total_amount',
        'status',
        'payment_date',
        'payment_method',
        'payment_reference',
    ];
    
    protected $casts = [
        'billing_period_start' => 'date',
        'billing_period_end' => 'date',
        'price_per_day' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_date' => 'datetime',
    ];
    
    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }
    
    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
```

**Логика расчета стоимости:**
```php
// При создании рекламного объявления
$startDate = Carbon::parse($request->start_date);
$endDate = Carbon::parse($request->end_date);
$daysCount = $startDate->diffInDays($endDate) + 1; // +1 чтобы включить оба дня

// Цена за день (можно сделать настраиваемой или фиксированной)
$pricePerDay = 10.00; // $10 за день размещения

$totalAmount = $daysCount * $pricePerDay;

// Создаем запись биллинга со статусом 'pending'
AdvertisementBilling::create([
    'advertisement_id' => $advertisement->id,
    'company_id' => $advertisement->company_id,
    'billing_period_start' => $startDate,
    'billing_period_end' => $endDate,
    'days_count' => $daysCount,
    'price_per_day' => $pricePerDay,
    'total_amount' => $totalAmount,
    'status' => 'pending',
]);
```

---

## 🔄 Поток работы

### 1. Создание рекламного объявления

**Шаг 1:** Администратор/Бизнес создает объявление
```
POST /api/advertisements
{
    "type": "advertisement",
    "title": "Реклама мастера",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "company_id": 1,
    ...
}
```

**Шаг 2:** Система автоматически:
- Создает запись в `advertisements`
- Рассчитывает стоимость (количество дней × цена за день)
- Создает запись в `advertisement_billing` со статусом `pending`
- Возвращает информацию о стоимости

**Ответ:**
```json
{
    "id": 1,
    "title": "Реклама мастера",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "billing": {
        "days_count": 31,
        "price_per_day": 10.00,
        "total_amount": 310.00,
        "status": "pending"
    }
}
```

---

### 2. Оплата рекламного объявления

**Шаг 1:** Бизнес оплачивает через платежную систему
```
POST /api/advertisements/{id}/pay
{
    "payment_method": "stripe",
    "payment_reference": "ch_1234567890"
}
```

**Шаг 2:** Система:
- Обновляет статус биллинга на `paid`
- Записывает дату оплаты и референс платежа
- Активирует объявление (status = 'approved', is_active = true)

**Логика:**
```php
public function pay($id, Request $request)
{
    $advertisement = Advertisement::findOrFail($id);
    $billing = $advertisement->billing;
    
    // Проверяем, что биллинг существует и не оплачен
    if (!$billing || $billing->status === 'paid') {
        return response()->json(['error' => 'Already paid'], 400);
    }
    
    // Обновляем биллинг
    $billing->update([
        'status' => 'paid',
        'payment_date' => now(),
        'payment_method' => $request->payment_method,
        'payment_reference' => $request->payment_reference,
    ]);
    
    // Активируем объявление
    $advertisement->update([
        'status' => 'approved',
        'is_active' => true,
    ]);
    
    return response()->json([
        'message' => 'Payment successful',
        'advertisement' => $advertisement,
    ]);
}
```

---

### 3. Трекинг кликов

**На фронтенде (при клике на рекламное объявление):**
```javascript
// В компоненте ServiceCard или ссылке
const handleAdClick = async (advertisementId) => {
    // Отправляем событие клика
    await fetch('/api/advertisements/track-click', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            advertisement_id: advertisementId.replace('ad_', ''),
            referrer: document.referrer,
        }),
    });
    
    // Обычная логика перехода по ссылке
    window.location.href = advertisement.link;
};
```

**На бэкенде:**
```php
public function trackClick(Request $request)
{
    $advertisement = Advertisement::findOrFail($request->advertisement_id);
    
    // Создаем запись о клике
    AdvertisementClick::create([
        'advertisement_id' => $advertisement->id,
        'clicked_at' => now(),
        'ip_address' => $request->ip(),
        'user_agent' => $request->userAgent(),
        'user_id' => auth()->id(),
        'session_id' => session()->getId(),
        'referrer' => $request->referrer,
    ]);
    
    // Обновляем счетчик в таблице advertisements (для быстрого доступа)
    $advertisement->increment('clicks');
    
    return response()->json(['success' => true]);
}
```

---

### 4. Получение статистики

**Endpoint для статистики:**
```
GET /api/advertisements/{id}/stats
```

**Ответ:**
```json
{
    "advertisement_id": 1,
    "total_clicks": 150,
    "unique_clicks": 120,
    "clicks_by_day": [
        {"date": "2024-01-01", "clicks": 10},
        {"date": "2024-01-02", "clicks": 15},
        ...
    ],
    "billing": {
        "days_count": 31,
        "price_per_day": 10.00,
        "total_amount": 310.00,
        "status": "paid",
        "payment_date": "2024-01-01 10:00:00"
    }
}
```

**Логика:**
```php
public function getStats($id)
{
    $advertisement = Advertisement::findOrFail($id);
    
    $totalClicks = $advertisement->clicks()->count();
    $uniqueClicks = $advertisement->clicks()
        ->select('ip_address', 'user_id')
        ->distinct()
        ->count();
    
    $clicksByDay = $advertisement->clicks()
        ->selectRaw('DATE(clicked_at) as date, COUNT(*) as clicks')
        ->groupBy('date')
        ->orderBy('date')
        ->get();
    
    return response()->json([
        'advertisement_id' => $advertisement->id,
        'total_clicks' => $totalClicks,
        'unique_clicks' => $uniqueClicks,
        'clicks_by_day' => $clicksByDay,
        'billing' => $advertisement->billing,
    ]);
}
```

---

## 📝 Изменения в существующей модели Advertisement

**Добавить связь с биллингом:**
```php
// В модели Advertisement
public function billing()
{
    return $this->hasOne(AdvertisementBilling::class);
}

public function clicks()
{
    return $this->hasMany(AdvertisementClick::class);
}
```

**Добавить метод для расчета стоимости:**
```php
public function calculateCost()
{
    if (!$this->start_date || !$this->end_date) {
        return null;
    }
    
    $daysCount = Carbon::parse($this->start_date)
        ->diffInDays(Carbon::parse($this->end_date)) + 1;
    
    $pricePerDay = 10.00; // Можно вынести в конфиг или сделать настраиваемым
    
    return [
        'days_count' => $daysCount,
        'price_per_day' => $pricePerDay,
        'total_amount' => $daysCount * $pricePerDay,
    ];
}
```

---

## 🔌 API Endpoints

### Публичные endpoints:
```
POST   /api/advertisements/track-click     - Трекинг клика (публичный)
GET    /api/advertisements/{id}/stats      - Статистика (публичный, если разрешено)
```

### Административные endpoints:
```
POST   /api/advertisements                 - Создать объявление (создает биллинг)
GET    /api/advertisements                 - Список объявлений
GET    /api/advertisements/{id}            - Детали объявления
PUT    /api/advertisements/{id}            - Обновить объявление
POST   /api/advertisements/{id}/pay        - Оплатить объявление
GET    /api/advertisements/{id}/stats      - Статистика
GET    /api/advertisements/{id}/clicks     - История кликов
```

### Бизнес endpoints (для владельцев компаний):
```
GET    /api/business/advertisements        - Мои объявления
GET    /api/business/advertisements/{id}/stats  - Статистика моего объявления
POST   /api/business/advertisements/{id}/pay    - Оплатить мое объявление
```

---

## 💰 Модель ценообразования

**Вариант 1: Фиксированная цена за день**
```php
// В конфиге config/advertisements.php
return [
    'price_per_day' => 10.00, // $10 за день
];
```

**Вариант 2: Цена зависит от типа размещения**
```php
'pricing' => [
    'services' => 10.00,    // $10/день на странице услуг
    'homepage' => 50.00,    // $50/день на главной
    'sidebar' => 5.00,      // $5/день в сайдбаре
    'banner' => 20.00,      // $20/день баннер
],
```

**Вариант 3: Цена зависит от категории**
```php
// Можно сделать более сложную логику
// Например, премиум категории стоят дороже
```

---

## 🔄 Автоматизация

### Cron задачи:

**1. Автоматическая активация/деактивация:**
```php
// В app/Console/Kernel.php
$schedule->call(function () {
    // Активируем объявления, у которых началась дата
    Advertisement::where('status', 'approved')
        ->where('is_active', false)
        ->where('start_date', '<=', now())
        ->where('end_date', '>=', now())
        ->update(['is_active' => true]);
    
    // Деактивируем объявления, у которых закончилась дата
    Advertisement::where('is_active', true)
        ->where('end_date', '<', now())
        ->update(['is_active' => false]);
})->everyMinute();
```

**2. Уведомления о скором окончании:**
```php
$schedule->call(function () {
    // За 3 дня до окончания
    $advertisements = Advertisement::where('is_active', true)
        ->where('end_date', '<=', now()->addDays(3))
        ->where('end_date', '>', now()->addDays(2))
        ->get();
    
    foreach ($advertisements as $ad) {
        // Отправить уведомление владельцу компании
        Mail::to($ad->company->email)->send(new AdvertisementExpiringSoon($ad));
    }
})->daily();
```

---

## 📊 Структура данных (схема)

```
advertisements
├── id
├── company_id
├── type (advertisement/regular)
├── title
├── start_date
├── end_date
├── clicks (счетчик для быстрого доступа)
├── status
├── is_active
└── ...

advertisement_clicks
├── id
├── advertisement_id → advertisements.id
├── clicked_at
├── ip_address
├── user_id (nullable)
├── session_id
└── ...

advertisement_billing
├── id
├── advertisement_id → advertisements.id
├── company_id → companies.id
├── billing_period_start
├── billing_period_end
├── days_count
├── price_per_day
├── total_amount
├── status (pending/paid/failed/refunded)
├── payment_date
└── ...
```

---

## ✅ Преимущества этой модели

1. **Простота** - понятная логика, легко реализовать
2. **Прозрачность** - четкая стоимость (дни × цена за день)
3. **Гибкость** - можно легко изменить цену за день
4. **Масштабируемость** - можно добавить скидки, промокоды позже
5. **Аналитика** - есть данные для статистики

---

## 🚀 План реализации

1. **Создать миграции** для таблиц `advertisement_clicks` и `advertisement_billing`
2. **Создать модели** `AdvertisementClick` и `AdvertisementBilling`
3. **Добавить связи** в модель `Advertisement`
4. **Создать endpoint** для трекинга кликов
5. **Модифицировать создание объявления** - автоматически создавать биллинг
6. **Создать endpoint** для оплаты
7. **Создать endpoint** для статистики
8. **Интегрировать трекинг** на фронтенде
9. **Добавить cron задачи** для автоматизации

---

## 💡 Дополнительные возможности (на будущее)

- Скидки за длительные кампании (например, -10% за месяц)
- Промокоды
- Автоматическое продление при оплате
- Уведомления о низком количестве кликов
- Сравнение эффективности объявлений











