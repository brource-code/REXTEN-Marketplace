# 🎯 Архитектура системы отзывов и рейтинга

## 📋 Обзор

Система позволяет клиентам оставлять отзывы и ставить рейтинг после завершения заказа (статус `completed`). Запросы на отзыв появляются у клиента в профиле во вкладке "Мои отзывы", где есть два состояния:
- **Ожидающие отзывы** (pending) - завершенные заказы без отзывов
- **Готовые отзывы** (completed) - оставленные отзывы

---

## 🗄️ База данных

### Таблица `reviews` (уже существует)
```sql
- id
- user_id (FK → users)
- company_id (FK → companies) 
- service_id (FK → services)
- booking_id (FK → bookings) - связь с заказом
- order_id (FK → orders) - связь с заказом (опционально, нужно добавить)
- rating (1-5)
- comment (текст отзыва)
- response (ответ бизнеса)
- response_at (дата ответа)
- is_visible (публичность)
- created_at, updated_at
```

**Нужно добавить:**
- `order_id` - связь с заказом (если еще нет)

---

## 🔄 Поток работы

### Этап 1: Завершение заказа
1. Заказ переходит в статус `completed`
2. Заказ автоматически попадает в список "Ожидающие отзывы" в профиле клиента

### Этап 2: Просмотр в профиле
1. Клиент заходит в профиль → вкладка "Мои отзывы"
2. Видит два раздела:
   - **Ожидающие отзывы** - завершенные заказы без отзывов
     - Карточка заказа с информацией
     - Кнопка "Оставить отзыв"
   - **Готовые отзывы** - оставленные отзывы
     - Карточка отзыва с рейтингом и комментарием
     - Возможность редактировать (опционально)

### Этап 3: Оставление отзыва
1. Клиент нажимает "Оставить отзыв" на заказе
2. Открывается модалка с формой:
   - Рейтинг (1-5 звезд)
   - Текст отзыва (обязательно, минимум 10 символов)
   - Информация о заказе (для контекста)
3. После отправки:
   - Создается запись в `reviews`
   - Заказ перемещается из "Ожидающие" в "Готовые отзывы"
   - Обновляется средний рейтинг компании/услуги

---

## 🛠️ Backend (Laravel)

### 1. Миграция (если нужно добавить order_id)
```php
Schema::table('reviews', function (Blueprint $table) {
    $table->foreignId('order_id')->nullable()->after('booking_id')
        ->constrained()->onDelete('set null');
});
```

### 2. Обновление модели `Review`
```php
// Добавить в fillable
'order_id'

// Добавить связь
public function order()
{
    return $this->belongsTo(Order::class);
}
```

### 3. API Endpoints

#### `GET /api/client/reviews/pending` (заказы, ожидающие отзывов)
**Ответ:**
```json
[
  {
    "id": 1,
    "orderId": 10,
    "bookingId": 5,
    "serviceName": "Стрижка и укладка",
    "businessName": "Glow Lab Studio",
    "businessSlug": "glow-lab",
    "date": "2025-11-28",
    "time": "14:00",
    "price": 1500,
    "completedAt": "2025-11-28T14:00:00Z"
  }
]
```

**Логика:**
- Заказы со статусом `completed`
- У текущего пользователя
- Без отзывов (LEFT JOIN с reviews WHERE review.id IS NULL)

#### `GET /api/client/reviews` (готовые отзывы)
**Уже существует**, но нужно проверить формат ответа

#### `POST /api/client/reviews` (создание отзыва)
**Запрос:**
```json
{
  "orderId": 10,
  "bookingId": 5,
  "rating": 5,
  "comment": "Отличный сервис!"
}
```

**Ответ:**
```json
{
  "id": 1,
  "rating": 5,
  "comment": "Отличный сервис!",
  "createdAt": "2025-11-28T15:00:00Z"
}
```

**Валидация:**
- `orderId` или `bookingId` обязателен
- `rating` - от 1 до 5
- `comment` - минимум 10 символов, максимум 1000

---

## 🎨 Frontend (Next.js)

### 1. Обновление компонента `ReviewsTab`
**Путь:** `src/app/(public)/profile/page.jsx`

**Структура:**
```jsx
const ReviewsTab = () => {
  // Загрузка ожидающих отзывов
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['client-pending-reviews'],
    queryFn: getPendingReviews,
  })
  
  // Загрузка готовых отзывов
  const { data: completedReviews = [] } = useQuery({
    queryKey: ['client-reviews'],
    queryFn: getClientReviews,
  })
  
  return (
    <div className="space-y-6">
      {/* Ожидающие отзывы */}
      {pendingReviews.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Ожидающие отзывы ({pendingReviews.length})
          </h3>
          <div className="space-y-3">
            {pendingReviews.map((order) => (
              <PendingReviewCard 
                key={order.id} 
                order={order}
                onReview={() => setReviewModal({ isOpen: true, order })}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Готовые отзывы */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Мои отзывы ({completedReviews.length})
        </h3>
        {completedReviews.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {completedReviews.map((review) => (
              <CompletedReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2. Компонент `PendingReviewCard`
**Путь:** `src/components/reviews/PendingReviewCard.jsx`

**Функционал:**
- Показывает информацию о заказе
- Кнопка "Оставить отзыв"
- Открывает модалку с формой

### 3. Компонент `ReviewModal` (модалка для отзыва)
**Путь:** `src/components/reviews/ReviewModal.jsx`

**Функционал:**
- Форма с рейтингом (звезды)
- Текстовое поле для комментария
- Информация о заказе
- Валидация
- Отправка на API

### 4. API функции
**Путь:** `src/lib/api/client.ts`

**Добавить:**
```typescript
export interface PendingReview {
  id: number
  orderId: number
  bookingId: number
  serviceName: string
  businessName: string
  businessSlug: string
  date: string
  time: string
  price: number
  completedAt: string
}

export async function getPendingReviews(): Promise<PendingReview[]> {
  const response = await LaravelAxios.get('/client/reviews/pending')
  return response.data.data || response.data
}

export interface CreateReviewData {
  orderId?: number
  bookingId?: number
  rating: number
  comment: string
}

export async function createReview(data: CreateReviewData): Promise<ClientReview> {
  const response = await LaravelAxios.post('/client/reviews', data)
  return response.data.data || response.data
}
```

---

## 📊 Структура данных

### PendingReview (API Response)
```json
{
  "id": 1,
  "orderId": 10,
  "bookingId": 5,
  "serviceName": "Стрижка и укладка",
  "businessName": "Glow Lab Studio",
  "businessSlug": "glow-lab",
  "date": "2025-11-28",
  "time": "14:00",
  "price": 1500,
  "completedAt": "2025-11-28T14:00:00Z"
}
```

### CreateReview (API Request)
```json
{
  "orderId": 10,
  "bookingId": 5,
  "rating": 5,
  "comment": "Отличный сервис! Мастер очень внимательный."
}
```

### ClientReview (API Response)
```json
{
  "id": 1,
  "orderId": 10,
  "bookingId": 5,
  "businessName": "Glow Lab Studio",
  "businessSlug": "glow-lab",
  "serviceName": "Стрижка и укладка",
  "rating": 5,
  "comment": "Отличный сервис! Мастер очень внимательный.",
  "createdAt": "2025-11-28T15:00:00Z",
  "businessAvatar": "/img/avatars/thumb-1.jpg"
}
```

---

## 🔐 Безопасность

1. **Проверки:**
   - Заказ принадлежит текущему пользователю
   - Заказ имеет статус `completed`
   - На заказ еще нет отзыва
   - Пользователь авторизован

2. **Валидация:**
   - Рейтинг: 1-5 (обязательно)
   - Комментарий: минимум 10 символов, максимум 1000 (обязательно)
   - `orderId` или `bookingId` обязателен

---

## 📝 План реализации

### Backend:
1. ✅ Проверить наличие `order_id` в таблице `reviews`
2. ✅ Создать миграцию (если нужно)
3. ✅ Обновить модель `Review`
4. ✅ Создать endpoint `GET /api/client/reviews/pending`
5. ✅ Обновить endpoint `POST /api/client/reviews`
6. ✅ Добавить валидацию и проверки

### Frontend:
1. ✅ Обновить `ReviewsTab` с двумя состояниями
2. ✅ Создать компонент `PendingReviewCard`
3. ✅ Создать компонент `ReviewModal`
4. ✅ Добавить API функции в `lib/api/client.ts`
5. ✅ Обновить типы
6. ✅ Интегрировать в профиль

---

## 🎯 UX Flow

1. **Клиент завершает заказ** → статус меняется на `completed`
2. **Клиент заходит в профиль** → вкладка "Мои отзывы"
3. **Видит раздел "Ожидающие отзывы"** с завершенными заказами
4. **Нажимает "Оставить отзыв"** → открывается модалка
5. **Заполняет форму** (рейтинг + комментарий)
6. **Отправляет отзыв** → заказ перемещается в "Готовые отзывы"
7. **Рейтинг обновляется** на странице компании/услуги

---

## 🔄 Обновление рейтингов

После создания отзыва:
1. Пересчитать средний рейтинг компании
2. Пересчитать средний рейтинг услуги
3. Обновить счетчик отзывов
4. Кешировать результаты для производительности

**Можно использовать:**
- Eloquent события (`created`)
- Jobs для асинхронного обновления
- Прямое обновление в контроллере

---

## ✅ Чеклист реализации

- [ ] Проверить структуру таблицы `reviews`
- [ ] Добавить `order_id` в `reviews` (если нужно)
- [ ] Обновить модель `Review`
- [ ] Создать endpoint `GET /api/client/reviews/pending`
- [ ] Обновить endpoint `POST /api/client/reviews`
- [ ] Обновить `ReviewsTab` компонент
- [ ] Создать `PendingReviewCard` компонент
- [ ] Создать `ReviewModal` компонент
- [ ] Добавить API функции
- [ ] Обновление рейтингов
- [ ] Тестирование

---

## 🚀 Следующие шаги

1. Проверить структуру БД и добавить `order_id` если нужно
2. Создать backend endpoints
3. Обновить компоненты на фронтенде
4. Протестировать весь flow
