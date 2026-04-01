import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/utils/auth/tokenStorage'
import { clearPresenceSessionStorage } from '@/utils/presenceSessionId'

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
                    // Очищаем localStorage от старых данных auth-storage
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('auth-storage')
                    }
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
                
                set({
                    accessToken: access_token,
                    refreshToken: null, // Не храним refresh token на клиенте (в httpOnly cookie)
                })
            },
            
            logout: () => {
                clearTokens()
                clearPresenceSessionStorage()
                // БЕЗОПАСНОСТЬ: Полностью очищаем все данные авторизации
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth-storage')
                }
                set({
                    isAuthenticated: false,
                    accessToken: null,
                    refreshToken: null,
                    userId: null,
                    userRole: null,
                })
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
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]))
                            // Laravel JWT использует 'sub' для user_id и 'role' в кастомных claims
                            role = payload.role || null
                            userId = payload.sub || payload.user_id || null
                            
                            // Проверяем срок действия (exp в секундах, Date.now() в миллисекундах)
                            if (payload.exp && payload.exp * 1000 < Date.now()) {
                            // Токен истек - очищаем ВСЁ
                                clearTokens()
                            if (typeof window !== 'undefined') {
                                localStorage.removeItem('auth-storage')
                            }
                                set({
                                    isAuthenticated: false,
                                    accessToken: null,
                                    refreshToken: null,
                                    userId: null,
                                    userRole: null,
                                })
                                return false
                            }
                        }
                    } catch (error) {
                    // Не удалось распарсить токен - очищаем ВСЁ
                        console.warn('Invalid token format:', error)
                        clearTokens()
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('auth-storage')
                    }
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
            name: 'auth-storage', // Имя для localStorage
            partialize: (state) => ({
                // Сохраняем только необходимые данные
                isAuthenticated: state.isAuthenticated,
                userId: state.userId,
                userRole: state.userRole,
            }),
        }
    )
)

export default useAuthStore

