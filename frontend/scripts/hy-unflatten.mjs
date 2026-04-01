/**
 * Flat path (dot-separated) <-> nested object (same shape as JSON locale parts).
 */
export function flattenStrings(obj, prefix = '', out = {}) {
    if (typeof obj === 'string') {
        out[prefix] = obj
        return out
    }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const k of Object.keys(obj)) {
            const p = prefix ? `${prefix}.${k}` : k
            flattenStrings(obj[k], p, out)
        }
    }
    return out
}

export function unflattenStrings(flat) {
    const result = {}
    for (const [path, value] of Object.entries(flat)) {
        const parts = path.split('.')
        let cur = result
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i]
            if (!cur[p]) cur[p] = {}
            cur = cur[p]
        }
        cur[parts[parts.length - 1]] = value
    }
    return result
}
