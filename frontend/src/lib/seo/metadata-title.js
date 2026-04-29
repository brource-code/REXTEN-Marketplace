/**
 * Обходит глобальный `title.template` из `page-meta.config.js`, чтобы не получать
 * «… | REXTEN | REXTEN», когда строка title уже содержит бренд или полный заголовок.
 *
 * @param {string} title
 * @returns {{ absolute: string }}
 */
export function absoluteDocumentTitle(title) {
    return { absolute: String(title ?? '').trim() || 'REXTEN' }
}

/**
 * Добавляет суффикс «| REXTEN» только если его ещё нет в конце строки.
 * @param {string} fragment
 */
export function withRextenTitleSuffixIfNeeded(fragment) {
    const t = String(fragment ?? '').trim()
    if (!t) return 'REXTEN'
    if (/\|\s*REXTEN\s*$/i.test(t)) return t
    return `${t} | REXTEN`
}

/**
 * Полный document title для `<title>` без повторного применения `title.template`.
 * @param {string} fragment — заголовок с опциональным «| REXTEN» в конце
 */
export function absoluteBrandedTitle(fragment) {
    return absoluteDocumentTitle(withRextenTitleSuffixIfNeeded(fragment))
}
