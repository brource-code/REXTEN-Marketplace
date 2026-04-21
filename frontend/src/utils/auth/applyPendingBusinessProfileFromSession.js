const PENDING_BUSINESS_PROFILE_KEY = 'rexten_pending_business_profile'

/**
 * После верификации email: создаёт компанию из черновика регистрации (sessionStorage).
 * Вызывать только когда access token уже в storage (после setAuth / setAccessToken).
 */
export async function applyPendingBusinessProfileFromSession() {
    if (typeof window === 'undefined') {
        return
    }
    const raw = sessionStorage.getItem(PENDING_BUSINESS_PROFILE_KEY)
    if (!raw) {
        return
    }
    let draft
    try {
        draft = JSON.parse(raw)
    } catch {
        sessionStorage.removeItem(PENDING_BUSINESS_PROFILE_KEY)
        return
    }
    if (!draft || typeof draft !== 'object') {
        sessionStorage.removeItem(PENDING_BUSINESS_PROFILE_KEY)
        return
    }
    try {
        const LaravelAxios = (await import('@/services/axios/LaravelAxios')).default
        await LaravelAxios.put('/business/settings/profile', draft)
    } catch {
        // Ошибку покажет страница / дашборд; ключ всё равно снимаем, чтобы не зациклиться
    } finally {
        sessionStorage.removeItem(PENDING_BUSINESS_PROFILE_KEY)
    }
}
