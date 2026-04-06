'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, usePathname } from 'next/navigation'
import { login, register, logout, getCurrentUser, forgotPassword, resetPassword } from '@/lib/api/auth'
import { useAuthStore, useUserStore, clearAuthPersistStorage } from '@/store'

// Query keys
export const authKeys = {
    all: ['auth'] as const,
    user: () => [...authKeys.all, 'user'] as const,
}

// Хук для получения текущего пользователя
export function useCurrentUser(options?: { enabled?: boolean }) {
    const { isAuthenticated, authReady, userId: jwtUserId } = useAuthStore()
    const user = useUserStore((s) => s.user)

    /** Профиль из persist не должен расходиться с sub/id в JWT — иначе грузим /auth/me заново */
    const userMismatch = Boolean(
        jwtUserId && user && String(user.id) !== String(jwtUserId),
    )
    const defaultEnabled =
        authReady && isAuthenticated && (!user || userMismatch)

    return useQuery({
        queryKey: authKeys.user(),
        queryFn: getCurrentUser,
        enabled:
            options?.enabled !== undefined ? options.enabled : defaultEnabled,
        staleTime: 5 * 60 * 1000, // 5 минут
    })
}

// Хук для входа
export function useLogin() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { setAuth, checkAuth } = useAuthStore()
    const { setUser, clearUser } = useUserStore()
    
    return useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            // БЕЗОПАСНОСТЬ: Очищаем все данные предыдущего пользователя ПЕРЕД установкой новых
            // Это предотвращает утечку данных между сессиями разных пользователей
            if (typeof window !== 'undefined') {
                clearAuthPersistStorage()
                localStorage.removeItem('user-storage')
                localStorage.removeItem('business-storage')
            }
            clearUser()
            queryClient.clear()
            
            // Сохраняем авторизацию в store (синхронно)
            // setAccessToken и setRefreshToken используют localStorage.setItem, который синхронный
            setAuth(
                {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                },
                data.user
            )
            
            // Сохраняем пользователя
            setUser(data.user)
            
            // Инвалидируем кэш пользователя
            queryClient.setQueryData(authKeys.user(), data.user)
            
            // Редирект в зависимости от роли
            // Используем небольшую задержку, чтобы гарантировать, что все состояние обновлено
            const role = data.user.role
            const roleEntryPaths: Record<string, string> = {
                CLIENT: '/services', // Клиенты идут на публичный сайт
                BUSINESS_OWNER: '/business/dashboard',
                SUPERADMIN: '/superadmin/dashboard',
            }
            const entryPath = roleEntryPaths[role]
            
            if (entryPath) {
                // Используем setTimeout с минимальной задержкой для гарантии сохранения токенов
                // localStorage.setItem синхронный, но даем время для обновления состояния
                setTimeout(() => {
                // Используем window.location для более надежного редиректа
                // Это гарантирует полную перезагрузку страницы и правильную проверку авторизации
                window.location.href = entryPath
                }, 100)
            }
        },
        onError: (error) => {
            console.error('Login error:', error)
        },
    })
}

// Хук для регистрации
export function useRegister() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { setAuth } = useAuthStore()
    const { setUser, clearUser } = useUserStore()
    
    return useMutation({
        mutationFn: register,
        onSuccess: (data) => {
            // БЕЗОПАСНОСТЬ: Очищаем все данные предыдущего пользователя ПЕРЕД установкой новых
            if (typeof window !== 'undefined') {
                clearAuthPersistStorage()
                localStorage.removeItem('user-storage')
                localStorage.removeItem('business-storage')
            }
            clearUser()
            queryClient.clear()
            
            // Сохраняем авторизацию в store
            setAuth(
                {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                },
                data.user
            )
            
            // Сохраняем пользователя
            setUser(data.user)
            
            // Инвалидируем кэш пользователя
            queryClient.setQueryData(authKeys.user(), data.user)
            
            // Для BUSINESS_OWNER редирект будет выполнен в BusinessSignUpClient после сохранения данных компании
            // Для других ролей выполняем редирект сразу
            const role = data.user.role
            if (role !== 'BUSINESS_OWNER') {
                const roleEntryPaths: Record<string, string> = {
                    CLIENT: '/services', // Клиенты идут на публичный сайт
                    SUPERADMIN: '/superadmin/dashboard',
                }
                const entryPath = roleEntryPaths[role]
                
                if (entryPath) {
                    router.push(entryPath)
                }
            }
            // Для BUSINESS_OWNER редирект будет выполнен в компоненте регистрации после сохранения компании
        },
        onError: (error) => {
            console.error('Register error:', error)
        },
    })
}

// Хук для выхода
export function useLogout() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { logout: logoutStore } = useAuthStore()
    const { clearUser } = useUserStore()
    
    return useMutation({
        mutationFn: logout,
        onSuccess: () => {
            // БЕЗОПАСНОСТЬ: Полностью очищаем все данные пользователя
            if (typeof window !== 'undefined') {
                clearAuthPersistStorage()
                localStorage.removeItem('user-storage')
                localStorage.removeItem('business-storage')
            }
            
            // Очищаем stores
            logoutStore()
            clearUser()
            
            // Очищаем кэш React Query
            queryClient.clear()
            
            // Редирект на страницу входа
            router.push('/sign-in')
        },
        onError: (error) => {
            // БЕЗОПАСНОСТЬ: Даже при ошибке очищаем ВСЁ
            if (typeof window !== 'undefined') {
                clearAuthPersistStorage()
                localStorage.removeItem('user-storage')
                localStorage.removeItem('business-storage')
            }
            
            logoutStore()
            clearUser()
            queryClient.clear()
            
            // Редирект на страницу входа
            router.push('/sign-in')
        },
    })
}

// Хук для восстановления пароля
export function useForgotPassword() {
    return useMutation({
        mutationFn: forgotPassword,
    })
}

// Хук для сброса пароля
export function useResetPassword() {
    const router = useRouter()
    
    return useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            // После успешного сброса пароля редиректим на страницу входа
            router.push('/sign-in')
        },
    })
}

