const STORAGE_KEY = 'rexten_presence_client_session_id'

/**
 * Стабильный ID вкладки/браузера для учёта сессий присутствия (heartbeat).
 */
export function getPresenceClientSessionId() {
    if (typeof window === 'undefined') {
        return ''
    }
    try {
        let id = window.localStorage.getItem(STORAGE_KEY)
        if (!id || typeof id !== 'string') {
            id =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
            window.localStorage.setItem(STORAGE_KEY, id)
        }
        return id
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
    }
}

/** Сброс ID сессии присутствия (после выхода — новый UUID при следующем входе). */
export function clearPresenceSessionStorage() {
    if (typeof window === 'undefined') {
        return
    }
    try {
        window.localStorage.removeItem(STORAGE_KEY)
    } catch {
        /* ignore */
    }
}
