/**
 * Base URL для серверных fetch к Laravel (sitemap, metadata SSR).
 *
 * Важно: контейнер `rexten_backend` — php-fpm (FastCGI), не HTTP. `fetch()` к
 * http://rexten_backend/api не даст JSON. Внутренний HTTP — через nginx:
 * INTERNAL_LARAVEL_API_URL=http://nginx/api
 *
 * Порядок: SSR_LARAVEL_API_URL → LARAVEL_API_URL (runtime) → NEXT_PUBLIC_* →
 * INTERNAL → http://nginx/api → localhost.
 */

function pushUnique(candidates, raw) {
    if (!raw || typeof raw !== 'string') return
    const t = raw.trim()
    if (!/^https?:\/\//i.test(t)) return
    const n = t.replace(/\/$/, '')
    if (!candidates.includes(n)) candidates.push(n)
}

/** Упорядоченные базы для SSR. */
export function getServerLaravelApiBaseUrls() {
    const candidates = []
    pushUnique(candidates, process.env.SSR_LARAVEL_API_URL)
    pushUnique(candidates, process.env.LARAVEL_API_URL)
    pushUnique(candidates, process.env.NEXT_PUBLIC_LARAVEL_API_URL)
    pushUnique(candidates, process.env.NEXT_PUBLIC_API_URL)
    pushUnique(candidates, process.env.INTERNAL_LARAVEL_API_URL)
    pushUnique(candidates, 'http://nginx/api')
    pushUnique(candidates, 'http://localhost:8000/api')
    return candidates.length ? candidates : ['http://localhost:8000/api']
}

/** Первый кандидат (совместимо со старыми вызовами). */
export function getServerLaravelApiBaseUrl() {
    return getServerLaravelApiBaseUrls()[0]
}
