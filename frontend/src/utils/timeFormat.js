/**
 * Утилиты для форматирования времени (HH:mm) с поддержкой 12h/24h.
 * Внутреннее представление формы — всегда 'HH:mm' (24-часовое).
 * Отображение зависит от настройки `time_format` ('12h' | '24h').
 */

export const TIME_FORMAT_12H = '12h'
export const TIME_FORMAT_24H = '24h'

/**
 * Парсит 'HH:mm' в { h, m }. Возвращает null, если формат неверный.
 */
export function parseHHmm(value) {
    if (!value || typeof value !== 'string') return null
    const m = value.trim().match(/^(\d{1,2}):(\d{2})/)
    if (!m) return null
    const h = Number(m[1])
    const min = Number(m[2])
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null
    if (h < 0 || h > 23 || min < 0 || min > 59) return null
    return { h, m: min }
}

/**
 * Собирает 'HH:mm' из часов/минут (24-часовое представление).
 */
export function joinHHmm(h, m) {
    const hh = Math.max(0, Math.min(23, Number(h) || 0))
    const mm = Math.max(0, Math.min(59, Number(m) || 0))
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/**
 * Форматирует 'HH:mm' для отображения в нужном формате.
 * @param {string} hhmm - 'HH:mm'
 * @param {'12h'|'24h'} format
 * @param {{ amLabel?: string, pmLabel?: string }} [labels]
 */
export function formatTime(hhmm, format = '12h', labels) {
    const parsed = parseHHmm(hhmm)
    if (!parsed) return ''
    const { h, m } = parsed
    if (format === TIME_FORMAT_24H) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const period = h >= 12 ? labels?.pmLabel || 'PM' : labels?.amLabel || 'AM'
    const h12 = ((h + 11) % 12) + 1
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Привязывает 'HH:mm' к ближайшему шагу сетки (вниз).
 */
export function snapHHmmToStep(hhmm, stepMinutes) {
    const parsed = parseHHmm(hhmm)
    if (!parsed) return null
    const step = Math.max(1, Number(stepMinutes) || 15)
    const total = parsed.h * 60 + parsed.m
    const snapped = Math.floor(total / step) * step
    return joinHHmm(Math.floor(snapped / 60) % 24, snapped % 60)
}

/**
 * Перевод 0..23 → AM/PM представление.
 */
export function to12h(h) {
    const hh = ((Number(h) % 24) + 24) % 24
    return {
        hour12: ((hh + 11) % 12) + 1,
        period: hh >= 12 ? 'PM' : 'AM',
    }
}

/**
 * AM/PM представление → 0..23.
 */
export function to24h(hour12, period) {
    const h = ((Number(hour12) - 1) % 12 + 12) % 12
    return period === 'PM' ? h + 12 : h
}

/**
 * Возвращает массив часов для колонки колеса в зависимости от формата.
 */
export function buildHourValues(format = '12h') {
    if (format === TIME_FORMAT_24H) {
        return Array.from({ length: 24 }, (_, i) => i)
    }
    return Array.from({ length: 12 }, (_, i) => i + 1)
}

/**
 * Возвращает массив минут с заданным шагом.
 */
export function buildMinuteValues(stepMinutes = 15) {
    const step = Math.max(1, Number(stepMinutes) || 15)
    const out = []
    for (let m = 0; m < 60; m += step) out.push(m)
    return out
}

/**
 * Опции для react-select / Select: один слот на каждый шаг суток.
 * value всегда 'HH:mm', label — для отображения в 12h или 24h.
 */
export function buildTimeSlotOptions(stepMinutes, displayFormat, labels) {
    const step = Math.max(1, Number(stepMinutes) || 15)
    const opts = []
    for (let total = 0; total < 24 * 60; total += step) {
        const h = Math.floor(total / 60) % 24
        const m = total % 60
        const value = joinHHmm(h, m)
        const label = formatTime(value, displayFormat || TIME_FORMAT_12H, labels)
        opts.push({ value, label })
    }
    return opts
}

/**
 * Парсит ввод пользователя в свободной форме: '9', '930', '9:30', '9:30 pm', '9p',
 * '21:30' и т.д. Возвращает 'HH:mm' или null.
 */
export function parseLooseTime(input, format = '12h') {
    if (!input || typeof input !== 'string') return null
    const raw = input.trim().toLowerCase()
    if (!raw) return null

    const periodMatch = raw.match(/(am|pm|a|p)\s*$/i)
    let period = null
    if (periodMatch) {
        period = periodMatch[1].startsWith('p') ? 'PM' : 'AM'
    }
    const stripped = raw.replace(/(am|pm|a|p)\s*$/i, '').trim()

    let h = null
    let m = 0

    const colon = stripped.match(/^(\d{1,2}):(\d{1,2})$/)
    if (colon) {
        h = Number(colon[1])
        m = Number(colon[2])
    } else {
        const digits = stripped.replace(/\D/g, '')
        if (!digits) return null
        if (digits.length <= 2) {
            h = Number(digits)
            m = 0
        } else if (digits.length === 3) {
            h = Number(digits.slice(0, 1))
            m = Number(digits.slice(1))
        } else if (digits.length === 4) {
            h = Number(digits.slice(0, 2))
            m = Number(digits.slice(2))
        } else {
            return null
        }
    }

    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    if (m < 0 || m > 59) return null

    if (format === TIME_FORMAT_12H || period) {
        if (h < 1 || h > 12) {
            if (h === 0) h = 12
            else return null
        }
        const p = period || (h >= 12 ? 'PM' : 'AM')
        return joinHHmm(to24h(h, p), m)
    }

    if (h < 0 || h > 23) return null
    return joinHHmm(h, m)
}
