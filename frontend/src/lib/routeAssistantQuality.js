/** Пороги в одном месте (должны совпадать по смыслу с backend RouteAssistantResponseFilter). */
const THRESH = {
    LATE: 10,
    IDLE: 10,
    MILES: 1,
}

/**
 * @param {undefined | { late_min?: number, idle_min?: number, miles?: number }} e
 * @returns {boolean}
 */
export function isMeaningfulExpected(e) {
    if (!e || typeof e !== 'object') {
        return false
    }
    const l = Math.abs(Number(e.late_min) || 0)
    const i = Math.abs(Number(e.idle_min) || 0)
    const m = Math.abs(Number(e.miles) || 0)
    if (l >= THRESH.LATE) {
        return true
    }
    if (i >= THRESH.IDLE) {
        return true
    }
    if (m >= THRESH.MILES) {
        return true
    }
    return false
}

/**
 * @param {undefined | { title?: string, detail?: string, expected?: unknown }} r
 * @returns {boolean}
 */
export function keepRecommendation(r) {
    return Boolean(r) && isMeaningfulExpected(r?.expected)
}

/**
 * @param {undefined | { kind?: string, expected?: unknown }} a
 * @returns {boolean}
 */
export function keepProposedAction(a) {
    if (!a || !isMeaningfulExpected(a?.expected)) {
        return false
    }
    return true
}
