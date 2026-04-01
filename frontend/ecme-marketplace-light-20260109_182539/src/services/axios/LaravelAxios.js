import axios from 'axios'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/utils/auth/tokenStorage'

// Базовый URL для Laravel API
// Если фронтенд открыт по IP, используем IP для API тоже
const getLaravelApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port || (protocol === 'https:' ? '443' : '80')
        
        // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Используем тот же протокол и хост, но порт 8000 для API
            return `${protocol}//${hostname}:8000/api`
        }
    }
    // Иначе используем переменную окружения или localhost
    return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

// Создаем axios инстанс для Laravel API
const LaravelAxios = axios.create({
    timeout: 60000,
    headers: {
        'Accept': 'application/json',
    },
    withCredentials: true, // Для работы с cookies
})

// Флаг для предотвращения множественных запросов на refresh
let isRefreshing = false
let failedQueue = []

// Обработка очереди запросов после обновления токена
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    
    failedQueue = []
}

// Request interceptor: добавляем JWT токен в заголовки и правильный baseURL
LaravelAxios.interceptors.request.use(
    (config) => {
        // Динамически определяем URL API на основе текущего hostname
        const apiUrl = getLaravelApiUrl()
        // Устанавливаем baseURL для каждого запроса
        config.baseURL = apiUrl
        
        // Получаем токен только на клиенте (проверка для SSR)
        let token = null
        if (typeof window !== 'undefined') {
            token = getAccessToken()
            
            // Список публичных эндпоинтов, которые не требуют авторизации
            const publicEndpoints = [
                '/settings/public',
                '/marketplace/',
                '/auth/login',
                '/auth/register',
                '/auth/google/redirect',
                '/auth/google/callback',
            ]
            
            const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint))
            
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            } else if (!isPublicEndpoint) {
                // Если токена нет и это не публичный эндпоинт, логируем для отладки (только в dev режиме)
                if (process.env.NODE_ENV === 'development') {
                    console.warn('LaravelAxios: No access token found for request:', config.url)
                }
            }
        }

        // Для FormData не устанавливаем Content-Type - axios сделает это автоматически с boundary
        if (config.data instanceof FormData) {
            // Удаляем Content-Type, если он был установлен вручную, чтобы axios мог установить правильный с boundary
            delete config.headers['Content-Type']
            // Убеждаемся, что токен все еще есть после удаления Content-Type
            // Важно: устанавливаем токен ПОСЛЕ удаления Content-Type, чтобы он не был удален
            if (typeof window !== 'undefined' && token) {
                config.headers.Authorization = `Bearer ${token}`
                if (process.env.NODE_ENV === 'development') {
                    console.log('LaravelAxios: FormData request with token for:', config.url, 'Token present:', !!token)
                }
            } else if (typeof window !== 'undefined') {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('LaravelAxios: No access token found for FormData request:', config.url)
                }
            }
        } else if (!config.headers['Content-Type']) {
            // Для обычных запросов устанавливаем Content-Type: application/json
            config.headers['Content-Type'] = 'application/json'
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor: обработка ответов и refresh token логика
LaravelAxios.interceptors.response.use(
    (response) => {
        // Если в ответе есть новый access token, сохраняем его
        // Refresh token устанавливается сервером в httpOnly cookie и не приходит в ответе
        if (response.data?.access_token) {
            setAccessToken(response.data.access_token)
        }
        // Не сохраняем refresh_token из ответа - он в httpOnly cookie
        
        return response
    },
    async (error) => {
        const originalRequest = error.config

        // Если ошибка 401 и это не запрос на refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Если уже идет процесс обновления токена, добавляем запрос в очередь
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return LaravelAxios(originalRequest)
                    })
                    .catch(err => {
                        return Promise.reject(err)
                    })
            }

            originalRequest._retry = true
            isRefreshing = true

            // Проверяем, что мы на клиенте
            if (typeof window === 'undefined') {
                return Promise.reject(error)
            }
            
            // Проверяем наличие refresh token cookie
            // Refresh token хранится в httpOnly cookie и недоступен через JavaScript
            // Просто пытаемся обновить токен - если cookie нет, сервер вернет 401

            try {
                // Пытаемся обновить токен
                // Refresh token автоматически отправляется в httpOnly cookie через withCredentials
                const apiUrl = getLaravelApiUrl()
                const response = await axios.post(
                    `${apiUrl}/auth/refresh`,
                    {}, // Пустое тело - refresh token в httpOnly cookie
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        withCredentials: true, // Важно! Отправляет cookies
                    }
                )

                // Проверяем формат ответа
                // Backend возвращает: { success: true, access_token: '...', ... }
                const access_token = response.data?.access_token

                if (!access_token) {
                    throw new Error('Access token not received from refresh endpoint')
                }

                // Сохраняем только новый access token
                // Новый refresh token устанавливается сервером в httpOnly cookie
                setAccessToken(access_token)

                // Обновляем заголовок оригинального запроса
                originalRequest.headers.Authorization = `Bearer ${access_token}`

                // Обрабатываем очередь запросов
                processQueue(null, access_token)
                isRefreshing = false

                // Повторяем оригинальный запрос
                return LaravelAxios(originalRequest)
            } catch (refreshError) {
                // Не удалось обновить токен - очищаем все
                clearTokens()
                processQueue(refreshError, null)
                isRefreshing = false
                
                // Редиректим на логин только если это не публичная страница
                if (typeof window !== 'undefined') {
                    const publicRoutes = ['/services', '/marketplace', '/landing', '/sign-in', '/business/sign-in', '/admin/sign-in']
                    const isPublicRoute = publicRoutes.some(route => window.location.pathname.startsWith(route))
                    
                    if (!isPublicRoute && !window.location.pathname.includes('/sign-in')) {
                        window.location.href = '/sign-in'
                    }
                }

                // Пробрасываем оригинальную ошибку 401, а не refreshError
                // Это важно для правильной обработки ошибок в компонентах
                return Promise.reject(error)
            }
        }

        // Обработка других ошибок
        if (error.response) {
            // Сервер вернул ошибку
            const { status, data, config } = error.response
            const url = config?.url || 'unknown'
            const method = config?.method?.toUpperCase() || 'UNKNOWN'

            // Формируем информативное сообщение об ошибке
            const errorMessage = data?.message || data?.error || 'Unknown error'
            const errorDetails = data && Object.keys(data).length > 0 
                ? (data.message || JSON.stringify(data)) 
                : 'No error details provided'

            switch (status) {
                case 403:
                    // Доступ запрещен
                    // Не логируем ошибки 403 для публичных endpoints, так как это нормально
                    const isPublicEndpoint = url.includes('/settings/public') || url.includes('/marketplace') || url.includes('/auth/')
                    if (!isPublicEndpoint && (errorMessage !== 'Unknown error' || Object.keys(data || {}).length > 0)) {
                        console.error(`[${method} ${url}] Access forbidden:`, errorDetails)
                    }
                    break
                case 404:
                    // Ресурс не найден - не логируем как ошибку, это нормальное поведение для некоторых запросов
                    // console.error('Resource not found:', data)
                    break
                case 422:
                    // Ошибка валидации
                    if (data && Object.keys(data).length > 0) {
                        console.error(`❌ [${method} ${url}] Validation error:`, errorDetails)
                        console.error(`❌ [${method} ${url}] Validation errors details:`, JSON.stringify(errorDetails, null, 2))
                        
                        // Сохраняем ошибку валидации в localStorage для отладки
                        try {
                            const validationError = {
                                method,
                                url,
                                status: 422,
                                errors: data.errors || data,
                                timestamp: new Date().toISOString(),
                            }
                            localStorage.setItem('last_validation_error', JSON.stringify(validationError))
                            console.error(`❌ [${method} ${url}] Ошибка сохранена в localStorage как 'last_validation_error'`)
                        } catch (e) {
                            console.error('Не удалось сохранить ошибку валидации в localStorage:', e)
                        }
                    }
                    break
                case 500:
                    // Ошибка сервера - логируем только если есть информация
                    console.error(`❌ [${method} ${url}] Server error (500):`, errorDetails)
                    if (errorMessage !== 'Unknown error' || (data && Object.keys(data).length > 0)) {
                        console.error(`❌ [${method} ${url}] Server error details:`, JSON.stringify(errorDetails, null, 2))
                    } else {
                        // Если данных нет, логируем только URL и метод
                        console.error(`❌ [${method} ${url}] Server error: Internal server error (no details)`)
                    }
                    
                    // Сохраняем ошибку сервера в localStorage
                    try {
                        const serverError = {
                            method,
                            url,
                            status: 500,
                            error: errorMessage || 'Internal server error',
                            data: data || {},
                            timestamp: new Date().toISOString(),
                        }
                        localStorage.setItem('last_server_error', JSON.stringify(serverError))
                        console.error(`❌ [${method} ${url}] Ошибка сохранена в localStorage как 'last_server_error'`)
                    } catch (e) {
                        console.error('Не удалось сохранить ошибку сервера в localStorage:', e)
                    }
                    break
                default:
                    // Не логируем ошибку 400 "Already in favorites" как ошибку, так как это нормальная ситуация
                    const isAlreadyInFavorites = status === 400 && (
                        (data?.message && (data.message.includes('Already in favorites') || data.message.includes('уже в избранном'))) ||
                        (errorMessage && (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')))
                    )
                    
                    if (!isAlreadyInFavorites) {
                        if (data && Object.keys(data).length > 0) {
                            console.error(`[${method} ${url}] API error (${status}):`, errorDetails)
                        } else {
                            console.error(`[${method} ${url}] API error (${status}): No error details`)
                        }
                    }
            }
        } else if (error.request) {
            // Запрос был отправлен, но ответа не получено
            console.error('Network error:', error.message || 'No response from server')
        } else {
            // Ошибка при настройке запроса
            console.error('Request setup error:', error.message || 'Unknown request error')
        }

        return Promise.reject(error)
    }
)

export default LaravelAxios

