import LaravelAxios from './axios/LaravelAxios'
import MockAuthService from './MockAuthService'
import { setAccessToken, setRefreshToken, clearTokens } from '@/utils/auth/tokenStorage'

// Используем mock сервис, если нет реального API
const USE_MOCK = !process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'

/**
 * Сервис для работы с авторизацией через Laravel API
 * Использует JWT токены и интегрируется с authStore
 * В режиме разработки может использовать MockAuthService
 */
const LaravelAuthService = {
    /**
     * Вход в систему
     * @param {Object} credentials - {email, password}
     * @returns {Promise} - возвращает {access_token, refresh_token, user}
     */
    async login(credentials) {
        if (USE_MOCK) {
            return MockAuthService.login(credentials)
        }

        try {
            const response = await LaravelAxios.post('/auth/login', credentials)
            // Бэкенд возвращает данные напрямую, без обертки 'data'
            const data = response.data
            
            // Сохраняем токены через tokenStorage
            if (data.access_token) {
                setAccessToken(data.access_token)
            }
            if (data.refresh_token) {
                setRefreshToken(data.refresh_token)
            }
            
            return {
                access_token: data.access_token,
                refresh_token: data.refresh_token || data.access_token,
                user: data.user,
            }
        } catch (error) {
            // Обрабатываем ошибки от Laravel API
            const errorMessage = error?.response?.data?.message || 
                                error?.message || 
                                'Неверный email или пароль'
            
            // Создаем ошибку с правильным форматом для React Query
            const authError = new Error(errorMessage)
            authError.response = error.response
            authError.message = errorMessage
            
            throw authError
        }
    },

    /**
     * Регистрация
     * @param {Object} data - данные пользователя {name, email, password, password_confirmation, role?}
     * @returns {Promise} - возвращает {access_token, refresh_token, user}
     */
    async register(data) {
        if (USE_MOCK) {
            return MockAuthService.register(data)
        }

        const response = await LaravelAxios.post('/auth/register', data)
        // Бэкенд возвращает данные напрямую, без обертки 'data'
        const responseData = response.data
        
        // Сохраняем токены через tokenStorage
        if (responseData.access_token) {
            setAccessToken(responseData.access_token)
        }
        if (responseData.refresh_token) {
            setRefreshToken(responseData.refresh_token)
        }
        
        return {
            access_token: responseData.access_token,
            refresh_token: responseData.refresh_token || responseData.access_token,
            user: responseData.user,
        }
    },

    /**
     * Выход из системы
     */
    async logout() {
        if (USE_MOCK) {
            await MockAuthService.logout()
            clearTokens()
            return
        }

        try {
            await LaravelAxios.post('/auth/logout')
        } catch (error) {
            // Игнорируем ошибки при выходе (токен может быть уже невалидным)
            console.warn('Logout error:', error)
        } finally {
            // Всегда очищаем токены
            clearTokens()
        }
    },

    /**
     * Обновить токен
     * @param {string} refreshToken - refresh token
     * @returns {Promise} - возвращает новый access_token и refresh_token
     */
    async refreshToken(refreshToken) {
        if (USE_MOCK) {
            return MockAuthService.refreshToken(refreshToken)
        }

        const response = await LaravelAxios.post('/auth/refresh', {
            refresh_token: refreshToken,
        })
        const data = response.data
        
        // Сохраняем новые токены
        if (data.access_token) {
            setAccessToken(data.access_token)
        }
        if (data.refresh_token) {
            setRefreshToken(data.refresh_token)
        }
        
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
        }
    },

    /**
     * Получить текущего пользователя
     * @returns {Promise} - возвращает данные пользователя
     */
    async getCurrentUser() {
        if (USE_MOCK) {
            return MockAuthService.getCurrentUser()
        }

        // Проверяем наличие токена перед запросом
        const { getAccessToken } = require('@/utils/auth/tokenStorage')
        const token = getAccessToken()
        
        if (!token) {
            // Нет токена - выбрасываем ошибку, чтобы React Query не пытался загрузить данные
            const error = new Error('No access token')
            error.response = { status: 401 }
            throw error
        }

        try {
            // Сначала получаем базовую информацию из /auth/me
            const authResponse = await LaravelAxios.get('/auth/me')
            const authData = authResponse.data
            
            // Если пользователь - клиент, получаем полный профиль из /client/profile
            if (authData && authData.role === 'CLIENT') {
                try {
                    const profileResponse = await LaravelAxios.get('/client/profile')
                    if (profileResponse.data && profileResponse.data.data) {
                        const profileData = profileResponse.data.data
                        // Объединяем данные: базовая информация + полный профиль
                        const fullUserData = {
                            ...authData,
                            ...profileData,
                            // Преобразуем формат пользователя для совместимости
                            name: profileData.firstName && profileData.lastName 
                                ? `${profileData.firstName} ${profileData.lastName}`.trim()
                                : authData.name || '',
                        }
                        return fullUserData
                    }
                } catch (error) {
                    // Если /client/profile недоступен, используем только /auth/me
                    console.warn('Failed to get profile from /client/profile, using /auth/me only:', error)
                }
            }

            // Fallback на /auth/me (для не-клиентов или если /client/profile недоступен)
            // Преобразуем формат пользователя для совместимости
            if (authData && !authData.name && authData.firstName) {
                authData.name = `${authData.firstName} ${authData.lastName || ''}`.trim()
            }
            return authData
        } catch (error) {
            // Если ошибка 401, не редиректим - просто пробрасываем ошибку
            // React Query обработает это через onError и не будет редиректить
            if (error?.response?.status === 401) {
                // Очищаем токен, если он невалидный
                const { clearTokens } = require('@/utils/auth/tokenStorage')
                clearTokens()
            }
            throw error
        }
    },

    /**
     * Восстановление пароля
     * @param {Object} data - {email}
     */
    async forgotPassword(data) {
        if (USE_MOCK) {
            return MockAuthService.forgotPassword(data)
        }

        const response = await LaravelAxios.post('/auth/forgot-password', data)
        return response.data
    },

    /**
     * Сброс пароля
     * @param {Object} data - {token, email, password, password_confirmation}
     */
    async resetPassword(data) {
        if (USE_MOCK) {
            return MockAuthService.resetPassword(data)
        }

        const response = await LaravelAxios.post('/auth/reset-password', data)
        return response.data
    },
}

export default LaravelAuthService

