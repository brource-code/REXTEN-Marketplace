// Временные периоды для фильтров
// Используются в компонентах TimeRangeFilter и других

export const TIME_RANGES = {
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    LAST_7_DAYS: '7d',
    LAST_14_DAYS: '14d',
    LAST_30_DAYS: '30d',
    LAST_90_DAYS: '90d',
    THIS_MONTH: 'thisMonth',
    LAST_MONTH: 'lastMonth',
    THIS_YEAR: 'thisYear',
    LAST_YEAR: 'lastYear',
    CUSTOM: 'custom',
} as const

export type TimeRange = typeof TIME_RANGES[keyof typeof TIME_RANGES]

// Опции для селекта временных периодов
export const TIME_RANGE_OPTIONS = [
    { value: TIME_RANGES.TODAY, label: 'Сегодня' },
    { value: TIME_RANGES.YESTERDAY, label: 'Вчера' },
    { value: TIME_RANGES.LAST_7_DAYS, label: 'Последние 7 дней' },
    { value: TIME_RANGES.LAST_14_DAYS, label: 'Последние 14 дней' },
    { value: TIME_RANGES.LAST_30_DAYS, label: 'Последние 30 дней' },
    { value: TIME_RANGES.LAST_90_DAYS, label: 'Последние 90 дней' },
    { value: TIME_RANGES.THIS_MONTH, label: 'Этот месяц' },
    { value: TIME_RANGES.LAST_MONTH, label: 'Прошлый месяц' },
    { value: TIME_RANGES.THIS_YEAR, label: 'Этот год' },
    { value: TIME_RANGES.LAST_YEAR, label: 'Прошлый год' },
    { value: TIME_RANGES.CUSTOM, label: 'Произвольный период' },
]

// Дефолтный период
export const DEFAULT_TIME_RANGE = TIME_RANGES.LAST_30_DAYS

// Функция для получения человекочитаемого названия периода
export function getTimeRangeLabel(range: TimeRange): string {
    const option = TIME_RANGE_OPTIONS.find(opt => opt.value === range)
    return option?.label || range
}

// Функция для получения дат начала и конца периода
export function getTimeRangeDates(range: TimeRange): { start: Date; end: Date } | null {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (range) {
        case TIME_RANGES.TODAY:
            return { start: today, end: now }
        
        case TIME_RANGES.YESTERDAY:
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            return { start: yesterday, end: today }
        
        case TIME_RANGES.LAST_7_DAYS:
            const last7Days = new Date(today)
            last7Days.setDate(last7Days.getDate() - 7)
            return { start: last7Days, end: now }
        
        case TIME_RANGES.LAST_14_DAYS:
            const last14Days = new Date(today)
            last14Days.setDate(last14Days.getDate() - 14)
            return { start: last14Days, end: now }
        
        case TIME_RANGES.LAST_30_DAYS:
            const last30Days = new Date(today)
            last30Days.setDate(last30Days.getDate() - 30)
            return { start: last30Days, end: now }
        
        case TIME_RANGES.LAST_90_DAYS:
            const last90Days = new Date(today)
            last90Days.setDate(last90Days.getDate() - 90)
            return { start: last90Days, end: now }
        
        case TIME_RANGES.THIS_MONTH:
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            return { start: thisMonthStart, end: now }
        
        case TIME_RANGES.LAST_MONTH:
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            return { start: lastMonthStart, end: lastMonthEnd }
        
        case TIME_RANGES.THIS_YEAR:
            const thisYearStart = new Date(now.getFullYear(), 0, 1)
            return { start: thisYearStart, end: now }
        
        case TIME_RANGES.LAST_YEAR:
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
            const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
            return { start: lastYearStart, end: lastYearEnd }
        
        case TIME_RANGES.CUSTOM:
            return null // Для custom периода даты задаются вручную
        
        default:
            return null
    }
}

// Функция для форматирования периода в строку для API (формат: '30d', 'thisMonth', etc.)
export function formatTimeRangeForApi(range: TimeRange): string {
    return range
}
