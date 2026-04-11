import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { SUPERADMIN_DISPLAY_TIMEZONE } from '@/constants/superadmin-datetime.constant'
import { resolveClientBookingTimezone } from '@/constants/client-datetime.constant'

dayjs.extend(utc)
dayjs.extend(timezone)

// Американские форматы дат и времени
const US_DATE_FORMAT = 'MM/DD/YYYY'                    // 02/05/2026
const US_DATE_SHORT = 'MMM D, YYYY'                    // Feb 5, 2026
const US_DATE_LONG = 'MMMM D, YYYY'                    // February 5, 2026
const US_TIME_FORMAT = 'h:mm A'                        // 9:30 AM
const US_DATETIME_FORMAT = 'MMM D, YYYY h:mm A'        // Feb 5, 2026 9:30 AM
const US_DATETIME_FULL = 'MMMM D, YYYY h:mm A'         // February 5, 2026 9:30 AM

/**
 * Форматирует дату в американском формате
 * @param {string|Date|dayjs.Dayjs} date - дата
 * @param {string} timezone - таймзона бизнеса (например 'America/New_York')
 * @param {string} format - формат ('numeric', 'short', 'long')
 * @returns {string} Отформатированная дата
 */
export const formatDate = (date, timezone = 'America/Los_Angeles', format = 'short') => {
  if (!date) return '—'
  
  let d
  try {
    // Если это строка даты без времени, парсим как локальную дату
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Формат YYYY-MM-DD - парсим как локальную дату в указанной таймзоне
      d = dayjs.tz(date, timezone).startOf('day')
    } else {
      d = dayjs(date).tz(timezone)
    }
  } catch (error) {
    console.error('Error formatting date:', error, date)
    return '—'
  }
  
  if (!d.isValid()) {
    return '—'
  }
  
  switch (format) {
    case 'numeric':
      return d.format(US_DATE_FORMAT)      // 02/05/2026
    case 'long':
      return d.format(US_DATE_LONG)         // February 5, 2026
    case 'short':
    default:
      return d.format(US_DATE_SHORT)        // Feb 5, 2026
  }
}

/**
 * Дата в таймзоне с учётом локали UI (Intl), в отличие от formatDate (фиксированные US-шаблоны dayjs).
 */
export const formatDateLocalized = (
  date,
  timezone = 'America/Los_Angeles',
  intlLocale = 'en-US'
) => {
  if (!date) return '—'

  try {
    let d
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      d = dayjs.tz(date, timezone).startOf('day')
    } else {
      d = dayjs(date).tz(timezone)
    }

    if (!d.isValid()) {
      return '—'
    }

    const tag = intlLocale || 'en-US'
    return new Intl.DateTimeFormat(tag, {
      dateStyle: 'medium',
      timeZone: timezone,
    }).format(d.toDate())
  } catch (error) {
    console.error('Error formatting date (localized):', error, date)
    return '—'
  }
}

/**
 * Форматирует время в таймзоне бизнеса с учётом локали UI (next-intl), не только en-US.
 * @param {string} time - время HH:mm или HH:mm:ss
 * @param {string} timezone - таймзона бизнеса
 * @param {string} [intlLocale] - BCP47, например 'hy-AM', 'uk-UA', 'en-US' (из useLocale())
 */
export const formatTime = (time, timezone = 'America/Los_Angeles', intlLocale = 'en-US') => {
  if (!time) return '—'

  try {
    const timeStr = time.length <= 8 ? `2000-01-01 ${time}` : time
    const d = dayjs.tz(timeStr, timezone)

    if (!d.isValid()) {
      return '—'
    }

    const tag = intlLocale || 'en-US'
    return new Intl.DateTimeFormat(tag, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(d.toDate())
  } catch (error) {
    console.error('Error formatting time:', error, time)
    return '—'
  }
}

/**
 * Форматирует дату и время вместе
 * @param {string|Date} date - дата
 * @param {string} time - время (опционально)
 * @param {string} timezone - таймзона бизнеса
 * @param {string} format - формат ('short' или 'long')
 * @returns {string} Отформатированная дата и время
 */
/**
 * ISO UTC (или любой парсабельный момент) → дата и время в таймзоне, US short (Feb 5, 2026 9:30 AM).
 */
export const formatDateTimeFromIso = (iso, timezone = 'America/Los_Angeles') => {
    if (!iso) return '—'
    try {
        const d = dayjs(iso).tz(timezone)
        if (!d.isValid()) {
            return '—'
        }
        return d.format(US_DATETIME_FORMAT)
    } catch (error) {
        console.error('formatDateTimeFromIso:', error, iso)
        return '—'
    }
}

export const formatDateTime = (date, time = null, timezone = 'America/Los_Angeles', format = 'short') => {
  if (!date) return '—'
  
  try {
    let d
    if (time) {
      // Если есть время, объединяем дату и время
      const dateTimeStr = `${date} ${time}`
      d = dayjs.tz(dateTimeStr, timezone)
    } else {
      // Если времени нет, используем только дату
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        d = dayjs.tz(date, timezone).startOf('day')
      } else {
        d = dayjs(date).tz(timezone)
      }
    }
    
    if (!d.isValid()) {
      return '—'
    }
    
    return format === 'long' 
      ? d.format(US_DATETIME_FULL)   // February 5, 2026 9:30 AM
      : d.format(US_DATETIME_FORMAT)  // Feb 5, 2026 9:30 AM
  } catch (error) {
    console.error('Error formatting datetime:', error, date, time)
    return '—'
  }
}

/**
 * Проверяет, является ли дата сегодня/завтра
 * @param {string|Date} date - дата
 * @param {string} timezone - таймзона бизнеса
 * @returns {string|null} 'today', 'tomorrow' или null
 */
export const getRelativeDay = (date, timezone = 'America/Los_Angeles') => {
  if (!date) return null
  
  try {
    let d
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      d = dayjs.tz(date, timezone).startOf('day')
    } else {
      d = dayjs(date).tz(timezone).startOf('day')
    }
    
    if (!d.isValid()) {
      return null
    }
    
    const today = dayjs().tz(timezone).startOf('day')
    const tomorrow = today.add(1, 'day')
    
    if (d.isSame(today)) return 'today'
    if (d.isSame(tomorrow)) return 'tomorrow'
    return null
  } catch (error) {
    console.error('Error getting relative day:', error, date)
    return null
  }
}

/**
 * Возвращает аббревиатуру таймзоны (PST, EST, PDT, EDT и т.д.)
 * @param {string} timezone - таймзона бизнеса
 * @returns {string} Аббревиатура таймзоны
 */
export const getTimezoneAbbr = (timezone = 'America/Los_Angeles') => {
  try {
    return dayjs().tz(timezone).format('z')  // PST, EST, etc.
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error, timezone)
    return ''
  }
}

/**
 * Конвертирует дату и время в таймзону бизнеса
 * @param {string|Date} date - дата
 * @param {string} time - время (опционально)
 * @param {string} timezone - таймзона бизнеса
 * @returns {dayjs.Dayjs} Объект dayjs в указанной таймзоне
 */
export const toBusinessTimezone = (date, time = null, timezone = 'America/Los_Angeles') => {
  try {
    if (time) {
      return dayjs.tz(`${date} ${time}`, timezone)
    }
    
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dayjs.tz(date, timezone).startOf('day')
    }
    
    return dayjs(date).tz(timezone)
  } catch (error) {
    console.error('Error converting to business timezone:', error, date, time)
    return dayjs()
  }
}

/**
 * Диапазон события для календаря бронирований клиента (UTC ISO), с учётом таймзоны компании.
 * @param {{ date: string, time?: string | null, timezone?: string | null }} booking
 * @returns {{ start: string, end: string }}
 */
export function clientBookingCalendarEventRange(booking) {
  const tz = resolveClientBookingTimezone(booking)
  const start = toBusinessTimezone(booking.date, booking.time || '00:00:00', tz)
  if (!start.isValid()) {
    const fallback = `${booking.date}T${(booking.time || '00:00:00').toString().slice(0, 8)}`
    return { start: fallback, end: fallback }
  }
  return {
    start: start.toISOString(),
    end: start.add(60, 'minute').toISOString(),
  }
}

/**
 * Форматирует дату с относительным днем (Today, Tomorrow или дата)
 * @param {string|Date} date - дата
 * @param {string} timezone - таймзона бизнеса
 * @param {object} translations - объект с переводами { today: 'Today', tomorrow: 'Tomorrow' }
 * @returns {string} "Today", "Tomorrow" или отформатированная дата
 */
export const formatDateWithRelative = (date, timezone = 'America/Los_Angeles', translations = {}) => {
  if (!date) return '—'
  
  const relative = getRelativeDay(date, timezone)
  if (relative === 'today' && translations.today) {
    return translations.today
  }
  if (relative === 'tomorrow' && translations.tomorrow) {
    return translations.tomorrow
  }
  
  return formatDate(date, timezone, 'short')
}

// --- Суперадминка: единый US-формат (MM/DD/YYYY, 12h AM/PM, таймзона США) ---

/**
 * @param {string|Date|null|undefined} iso - момент времени (UTC ISO с бэка)
 * @returns {string} например "03/17/2026 4:30 PM PST"
 */
export function formatSuperadminDateTime(iso) {
    if (!iso) return '—'
    const d = dayjs(iso).tz(SUPERADMIN_DISPLAY_TIMEZONE)
    if (!d.isValid()) return '—'
    const base = d.format('MM/DD/YYYY h:mm A')
    try {
        const tzName =
            new Intl.DateTimeFormat('en-US', {
                timeZone: SUPERADMIN_DISPLAY_TIMEZONE,
                timeZoneName: 'short',
            })
                .formatToParts(d.toDate())
                .find((p) => p.type === 'timeZoneName')?.value ?? ''
        return tzName ? `${base} ${tzName}` : base
    } catch {
        return base
    }
}

export function formatSuperadminDateOnly(iso) {
    if (!iso) return '—'
    const d = dayjs(iso).tz(SUPERADMIN_DISPLAY_TIMEZONE)
    return d.isValid() ? d.format('MM/DD/YYYY') : '—'
}

export function formatSuperadminTimeOnly(iso) {
    if (!iso) return '—'
    const d = dayjs(iso).tz(SUPERADMIN_DISPLAY_TIMEZONE)
    if (!d.isValid()) return '—'
    const base = d.format('h:mm A')
    try {
        const tzName =
            new Intl.DateTimeFormat('en-US', {
                timeZone: SUPERADMIN_DISPLAY_TIMEZONE,
                timeZoneName: 'short',
            })
                .formatToParts(d.toDate())
                .find((p) => p.type === 'timeZoneName')?.value ?? ''
        return tzName ? `${base} ${tzName}` : base
    } catch {
        return base
    }
}

/** Подпись для графиков: день календаря в таймзоне суперадминки */
export function formatSuperadminChartDayLabel(dateStr) {
    if (!dateStr) return ''
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))
        ? dayjs.tz(String(dateStr), SUPERADMIN_DISPLAY_TIMEZONE)
        : dayjs(dateStr).tz(SUPERADMIN_DISPLAY_TIMEZONE)
    return d.isValid() ? d.format('ddd M/D') : String(dateStr)
}

export { SUPERADMIN_DISPLAY_TIMEZONE }
