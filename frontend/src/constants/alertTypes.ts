// Типы алертов для суперадминки
// Соответствуют backend/app/Enums/AlertType.php

export const ALERT_TYPES = {
    INACTIVE_BUSINESS: 'inactive_business',
    PENDING_MODERATION: 'pending_moderation',
    CONVERSION_DROP: 'conversion_drop',
    PAYMENT_ISSUE: 'payment_issue',
    SYSTEM_ERROR: 'system_error',
} as const

export type AlertType = typeof ALERT_TYPES[keyof typeof ALERT_TYPES]

// Severity уровни
export const ALERT_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
} as const

export type AlertSeverity = typeof ALERT_SEVERITIES[keyof typeof ALERT_SEVERITIES]

// Маппинг типов алертов на человекочитаемые названия
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
    [ALERT_TYPES.INACTIVE_BUSINESS]: 'Неактивный бизнес',
    [ALERT_TYPES.PENDING_MODERATION]: 'Ожидает модерации',
    [ALERT_TYPES.CONVERSION_DROP]: 'Падение конверсии',
    [ALERT_TYPES.PAYMENT_ISSUE]: 'Проблема с оплатой',
    [ALERT_TYPES.SYSTEM_ERROR]: 'Системная ошибка',
}

// Маппинг severity на цвета
export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
    [ALERT_SEVERITIES.LOW]: 'blue',
    [ALERT_SEVERITIES.MEDIUM]: 'yellow',
    [ALERT_SEVERITIES.HIGH]: 'orange',
    [ALERT_SEVERITIES.CRITICAL]: 'red',
}

// Маппинг severity на человекочитаемые названия
export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
    [ALERT_SEVERITIES.LOW]: 'Низкая',
    [ALERT_SEVERITIES.MEDIUM]: 'Средняя',
    [ALERT_SEVERITIES.HIGH]: 'Высокая',
    [ALERT_SEVERITIES.CRITICAL]: 'Критическая',
}
