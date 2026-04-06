/**
 * Подписи пунктов навигации: безопасно при отсутствии translateKey (разделители и т.п.).
 * next-intl ожидает строковый ключ; undefined ломает разбор пути (.split).
 */
export function translateNavLabel(t, nav) {
    const fallback = nav?.title ?? ''
    const key = nav?.translateKey
    if (!key || typeof key !== 'string') {
        return fallback
    }
    const out = t(key, { defaultValue: fallback })
    return typeof out === 'string' ? out : fallback
}

/** Строка описания в meta.description (мега-меню). */
export function translateNavMetaDescription(t, description) {
    const label = description?.label ?? ''
    const key = description?.translateKey
    if (!key || typeof key !== 'string') {
        return label
    }
    const out = t(key, { defaultValue: label })
    return typeof out === 'string' ? out : label
}
