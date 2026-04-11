import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isoWeek from 'dayjs/plugin/isoWeek'
import { formatDate } from '@/utils/dateTime'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isoWeek)

const DEFAULT_TZ = 'America/Los_Angeles'

/**
 * Начало календарного квартала (янв / апр / июл / окт).
 * @param {import('dayjs').Dayjs} d
 */
function startOfCalendarQuarter(d) {
    const m = d.month()
    const startMonth = Math.floor(m / 3) * 3
    return d.month(startMonth).date(1).startOf('day')
}

/**
 * Пресеты дат для отчётов и фильтров — как на дашборде бизнеса (Laravel DashboardController@stats):
 * даты в календаре таймзоны бизнеса.
 *
 * @param {'today' | 'week' | 'month' | 'quarter' | 'year'} preset
 * @param {string} [businessTimezone] IANA
 * @returns {{ dateFrom: string, dateTo: string }} YYYY-MM-DD
 */
export function getBusinessPresetDateRange(preset, businessTimezone = DEFAULT_TZ) {
    const today = dayjs().tz(businessTimezone)
    const dateTo = today.format('YYYY-MM-DD')
    let dateFrom
    switch (preset) {
        case 'today':
            dateFrom = dateTo
            break
        case 'week':
            dateFrom = today.startOf('isoWeek').format('YYYY-MM-DD')
            break
        case 'month':
            dateFrom = today.startOf('month').format('YYYY-MM-DD')
            break
        case 'quarter':
            dateFrom = startOfCalendarQuarter(today).format('YYYY-MM-DD')
            break
        case 'year':
            dateFrom = today.startOf('year').format('YYYY-MM-DD')
            break
        default:
            dateFrom = today.startOf('month').format('YYYY-MM-DD')
    }
    return { dateFrom, dateTo }
}

/**
 * Определяет пресет по паре дат (если совпадает с текущим «сегодня» для границ в TZ бизнеса).
 * @param {string | null | undefined} dateFrom
 * @param {string | null | undefined} dateTo
 * @param {string} [businessTimezone]
 * @returns {'today' | 'week' | 'month' | 'quarter' | 'year' | null}
 */
export function detectBusinessPresetFromDates(dateFrom, dateTo, businessTimezone = DEFAULT_TZ) {
    if (!dateFrom || !dateTo) return null
    /** @type {Array<'today' | 'week' | 'month' | 'quarter' | 'year'>} */
    const presets = ['today', 'week', 'month', 'quarter', 'year']
    for (const p of presets) {
        const r = getBusinessPresetDateRange(p, businessTimezone)
        if (r.dateFrom === dateFrom && r.dateTo === dateTo) {
            return p
        }
    }
    return null
}

/**
 * Границы периода для карточек обзора на бизнес-дашборде (US: Feb 5, 2026).
 * @param {'thisWeek' | 'thisMonth' | 'thisYear'} period
 * @param {string} [businessTimezone] IANA
 */
export function getBusinessDashboardPeriodRange(period, businessTimezone = DEFAULT_TZ) {
    const map = {
        thisWeek: 'week',
        thisMonth: 'month',
        thisYear: 'year',
    }
    const preset = map[period] ?? 'month'
    const { dateFrom, dateTo } = getBusinessPresetDateRange(preset, businessTimezone)
    return {
        from: formatDate(dateFrom, businessTimezone, 'short'),
        to: formatDate(dateTo, businessTimezone, 'short'),
    }
}
