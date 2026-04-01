/**
 * Типы бизнес-событий
 * Синхронизировано с backend: app/Enums/BusinessEventType.php
 */

export const BUSINESS_EVENT_TYPES = {
    BUSINESS_REGISTERED: 'business_registered',
    LARGE_ORDER: 'large_order',
    CAMPAIGN_STARTED: 'campaign_started',
    COMPLAINT_RECEIVED: 'complaint_received',
    MILESTONE_REACHED: 'milestone_reached',
    PAYMENT_RECEIVED: 'payment_received',
    BUSINESS_VERIFIED: 'business_verified',
    REVIEW_FLAGGED: 'review_flagged',
} as const

export type BusinessEventType = typeof BUSINESS_EVENT_TYPES[keyof typeof BUSINESS_EVENT_TYPES]

/**
 * Метаданные для отображения типов событий
 */
export const BUSINESS_EVENT_META = {
    [BUSINESS_EVENT_TYPES.BUSINESS_REGISTERED]: {
        label: 'Регистрация бизнеса',
        icon: 'building',
        color: 'blue',
        bgColor: 'bg-blue-500',
    },
    [BUSINESS_EVENT_TYPES.LARGE_ORDER]: {
        label: 'Крупный заказ',
        icon: 'cart',
        color: 'emerald',
        bgColor: 'bg-emerald-500',
    },
    [BUSINESS_EVENT_TYPES.CAMPAIGN_STARTED]: {
        label: 'Запуск кампании',
        icon: 'megaphone',
        color: 'purple',
        bgColor: 'bg-purple-500',
    },
    [BUSINESS_EVENT_TYPES.COMPLAINT_RECEIVED]: {
        label: 'Получена жалоба',
        icon: 'flag',
        color: 'red',
        bgColor: 'bg-red-500',
    },
    [BUSINESS_EVENT_TYPES.MILESTONE_REACHED]: {
        label: 'Достижение вехи',
        icon: 'trophy',
        color: 'yellow',
        bgColor: 'bg-yellow-500',
    },
    [BUSINESS_EVENT_TYPES.PAYMENT_RECEIVED]: {
        label: 'Получен платёж',
        icon: 'dollar',
        color: 'green',
        bgColor: 'bg-green-500',
    },
    [BUSINESS_EVENT_TYPES.BUSINESS_VERIFIED]: {
        label: 'Бизнес верифицирован',
        icon: 'check',
        color: 'teal',
        bgColor: 'bg-teal-500',
    },
    [BUSINESS_EVENT_TYPES.REVIEW_FLAGGED]: {
        label: 'Отзыв отмечен',
        icon: 'warning',
        color: 'orange',
        bgColor: 'bg-orange-500',
    },
} as const
