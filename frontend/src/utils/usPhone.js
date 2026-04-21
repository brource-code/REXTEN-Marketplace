/**
 * US NANP: в поле всегда префикс +1, дальше до 10 национальных цифр с маской (XXX) XXX-XXXX.
 * Цифры «1» из «+1» в счёт NPA не попадают — берём только хвост после литерала +1.
 */

export const US_PHONE_PREFIX = '+1'

/**
 * 10 национальных цифр (без кода страны).
 */
export function stripToNanpDigits(input) {
    const s = String(input ?? '').trim()
    if (!s) return ''

    const lower = s.toLowerCase()
    if (lower.startsWith('+1')) {
        return s.slice(2).replace(/\D/g, '').slice(0, 10)
    }

    const all = s.replace(/\D/g, '')
    if (!all) return ''
    if (all.length >= 11 && all[0] === '1') {
        return all.slice(1, 11)
    }
    return all.slice(0, 10)
}

export function formatUsPhoneDisplay(input) {
    const d = stripToNanpDigits(input)
    if (!d) {
        return US_PHONE_PREFIX
    }
    if (d.length <= 3) {
        return `${US_PHONE_PREFIX} (${d}`
    }
    const a = d.slice(0, 3)
    const b = d.slice(3, 6)
    const c = d.slice(6, 10)
    if (d.length <= 6) {
        return `${US_PHONE_PREFIX} (${a}) ${b}` + (d.length === 6 ? '-' : '')
    }
    return `${US_PHONE_PREFIX} (${a}) ${b}-${c}`
}

/** Для API: +1 и 10 цифр; пустая строка если неполный номер */
export function usPhoneToE164(input) {
    const d = stripToNanpDigits(input)
    if (d.length !== 10) return ''
    return `+1${d}`
}
