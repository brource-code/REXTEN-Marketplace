import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as Sentry from '@sentry/nextjs'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/utils/auth/tokenStorage'
import { clearPresenceSessionStorage } from '@/utils/presenceSessionId'

/** Старый persist содержал userRole/userId — источник бага; новый ключ без этих полей. */
const LEGACY_AUTH_PERSIST_KEY = 'auth-storage'
export const AUTH_PERSIST_STORAGE_KEY = 'auth-storage-v2'

export function clearAuthPersistStorage() {
    if (typeof window === 'undefined') {
        return
    }
    localStorage.removeItem(LEGACY_AUTH_PERSIST_KEY)
    localStorage.removeItem(AUTH_PERSIST_STORAGE_KEY)
}

function roleAndIdFromAccessToken(accessToken) {
    if (!accessToken) {
        return { role: null, userId: null }
    }
    try {
        const parts = accessToken.split('.')
        if (parts.length !== 3) {
            return { role: null, userId: null }
        }
        const payload = JSON.parse(atob(parts[1]))
        return {
            role: payload.role || null,
            userId: payload.sub || payload.user_id || null,
        }
    } catch {
        return { role: null, userId: null }
    }
}

/**
 * Store для управления авторизацией
 * Хранит состояние входа/выхода, токены, и базовую информацию о пользователе
 */
const useAuthStore = create(
    persist(
        (set, get) => ({
            // Состояние авторизации
            isAuthenticated: false,
            isLoading: false,
            /** false до завершения persist + checkAuth — иначе возможен «мигание» роли/редиректов */
            authReady: false,
            
            // Токены (также хранятся в localStorage/cookies через tokenStorage)
            accessToken: null,
            refreshToken: null,
            
            // Базовая информация о пользователе (полная информация в userStore)
            userId: null,
            userRole: null, // 'CLIENT' | 'BUSINESS_OWNER' | 'SUPERADMIN'
            
            // Действия
            setAuth: (tokens, user) => {
                const { access_token } = tokens
                
                // БЕЗОПАСНОСТЬ: При установке нового токена ВСЕГДА очищаем старые данные
                // Это предотвращает использование данных предыдущего пользователя
                const currentState = get()
                
                // Если приходит новый токен (не refresh), очищаем все старые данные
                if (access_token && access_token !== currentState.accessToken) {
                    clearAuthPersistStorage()
                }
                
                // Сохраняем только access token в localStorage
                // Refresh token устанавливается сервером в httpOnly cookie
                if (access_token) {
                    setAccessToken(access_token)
                }
                
                // Устанавливаем состояние СРАЗУ после сохранения токена
                // ВАЖНО: userId и userRole берём ТОЛЬКО из переданного user, НЕ из старого состояния!
                set({
                    isAuthenticated: true,
                    accessToken: access_token,
                    refreshToken: null, // Не храним refresh token на клиенте (в httpOnly cookie)
                    userId: user?.id ?? null, // Используем nullish coalescing для явного null
                    userRole: user?.role ?? null, // Используем nullish coalescing для явного null
                })
                
                // Sentry: устанавливаем контекст пользователя
                if (user?.id) {
                    Sentry.setUser({
                        id: String(user.id),
                        email: user.email || undefined,
                        username: user.name || user.first_name || undefined,
                    })
                }
                
                // Дополнительная проверка: убеждаемся, что токен действительно сохранен
                if (access_token && typeof window !== 'undefined') {
                    const savedToken = localStorage.getItem('auth_token')
                    if (savedToken !== access_token) {
                        console.warn('Token was not saved correctly, retrying...')
                        localStorage.setItem('auth_token', access_token)
                    }
                }
            },
            
            setTokens: (tokens) => {
                const { access_token } = tokens
                
                // Сохраняем только access token
                // Refresh token устанавливается сервером в httpOnly cookie
                if (access_token) {
                    setAccessToken(access_token)
                }

                const { role, userId } = roleAndIdFromAccessToken(access_token)
                
                set({
                    accessToken: access_token,
                    refreshToken: null, // Не храним refresh token на клиенте (в httpOnly cookie)
                    userRole: role,
                    userId,
                    isAuthenticated: !!access_token,
                })
            },
            
            logout: () => {
                clearTokens()
                clearPresenceSessionStorage()
                // БЕЗОПАСНОСТЬ: Полностью очищаем все данные авторизации
                clearAuthPersistStorage()
                set({
                    isAuthenticated: false,
                    accessToken: null,
                    refreshToken: null,
                    userId: null,
                    userRole: null,
                })
                // Sentry: очищаем контекст пользователя
                Sentry.setUser(null)
            },
            
            setLoading: (loading) => {
                set({ isLoading: loading })
            },
            
            // Проверка, авторизован ли пользователь (на основе токена)
            // БЕЗОПАСНОСТЬ: Данные берутся ТОЛЬКО из токена, НЕ из старого состояния!
            checkAuth: () => {
                const token = getAccessToken()
                const isAuth = !!token
                const currentState = get()
                
                // Если нет токена - очищаем всё
                if (!token) {
                    if (currentState.isAuthenticated || currentState.accessToken || currentState.userId || currentState.userRole) {
                        clearTokens()
                        set({
                            isAuthenticated: false,
                            accessToken: null,
                            refreshToken: null,
                            userId: null,
                            userRole: null,
                        })
                    }
                    return false
                }
                
                // Если есть токен, извлекаем данные ТОЛЬКО из него
                let role = null
                let userId = null

                try {
                    const parts = token.split('.')
                    if (parts.length !== 3) {
                        throw new Error('Invalid JWT segments')
                    }
                    const payload = JSON.parse(atob(parts[1]))

                    const parsed = roleAndIdFromAccessToken(token)
                    role = parsed.role
                    userId = parsed.userId

                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        // Access token истёк, но refresh token (httpOnly cookie, 7 дней) может быть жив.
                        // Не очищаем сессию — оставляем isAuthenticated: true с ролью из токена.
                        // При следующем API-запросе сервер вернёт 401, LaravelAxios interceptor
                        // попробует refresh; если не получится — interceptor сам сделает logout.
                        set({
                            isAuthenticated: true,
                            accessToken: token,
                            userRole: role,
                            userId,
                        })
                        return true
                    }
                } catch (error) {
                    console.warn('Invalid token format:', error)
                    clearTokens()
                    clearAuthPersistStorage()
                    set({
                        isAuthenticated: false,
                        accessToken: null,
                        refreshToken: null,
                        userId: null,
                        userRole: null,
                    })
                    return false
                }
                
                // БЕЗОПАСНОСТЬ: Используем ТОЛЬКО данные из токена, НЕ из старого состояния!
                // Это предотвращает использование роли/userId от предыдущего пользователя
                const newRole = role // НЕ используем fallback на currentState.userRole!
                const newUserId = userId // НЕ используем fallback на currentState.userId!
                
                // Обновляем только если значения изменились
                if (
                    currentState.isAuthenticated !== isAuth ||
                    currentState.accessToken !== token ||
                    currentState.userRole !== newRole ||
                    currentState.userId !== newUserId
                ) {
                    set({
                        isAuthenticated: isAuth,
                        accessToken: token,
                        userRole: newRole,
                        userId: newUserId,
                    })
                }
                
                return isAuth
            },
        }),
        {
            // v2: раньше в persist лежали userRole/userId — они расходились с JWT (критично для прав). Старый ключ не читаем.
            name: AUTH_PERSIST_STORAGE_KEY,
            // БЕЗОПАСНОСТЬ: userId и userRole НЕ сохраняем — только JWT в auth_token источник истины.
            // Иначе после перезагрузки/гидрации показывалась старая роль (например SUPERADMIN), пока не отработает checkAuth().
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)

if (typeof window !== 'undefined') {
    useAuthStore.persist.onFinishHydration(() => {
        // Удаляем старый persist с userRole/userId — он больше не используется, но мог мешать при миграции.
        localStorage.removeItem(LEGACY_AUTH_PERSIST_KEY)
        useAuthStore.getState().checkAuth()
        useAuthStore.setState({ authReady: true })
    })
}

export default useAuthStore

