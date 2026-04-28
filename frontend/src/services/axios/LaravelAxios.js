import axios from 'axios'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/utils/auth/tokenStorage'
import { COOKIES_KEY } from '@/constants/app.constant'
import { ACCEPT_LANGUAGE_ALIASES, SUPPORTED_LOCALES } from '@/constants/locale.constant'
import useBusinessStore from '@/store/businessStore'
import { isLocalhostDirectNextPort } from '@/constants/frontend-ports.constant'

// Базовый URL для Laravel API
// Если фронтенд открыт по IP, используем IP для API тоже
const getLaravelApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port
        
        // Для локального домена через nginx - используем относительный путь
        if (hostname === 'rexten.local' || hostname.endsWith('.local')) {
            return '/api'
        }
        
        // Для localhost через nginx (HTTPS на порту 8443) - используем относительный путь
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'https:' && port === '8443') {
            return '/api'
        }
        
        if (
            (hostname === 'localhost' || hostname === '127.0.0.1') &&
            (isLocalhostDirectNextPort(port) || (port === '' && protocol === 'http:'))
        ) {
            return 'http://localhost:8000/api'
        }

        if (process.env.NEXT_PUBLIC_LARAVEL_API_URL === '/api') {
            if ((hostname !== 'localhost' && hostname !== '127.0.0.1') || (port === '8443' && protocol === 'https:')) {
                return '/api'
            }
        }
        
        // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Проверяем, что это IP адрес (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const ipPattern = /^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/
            if (ipPattern.test(hostname)) {
                // Используем тот же протокол и хост, но порт 8000 для API
                return `${protocol}//${hostname}:8000/api`
            }
        }
    }
    // Иначе используем переменную окружения или localhost
    return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

// Функция для получения языка из cookie
const getLocale = () => {
    if (typeof window === 'undefined') {
        return 'en' // Fallback для SSR
    }
    
    // Пытаемся получить из cookie
    try {
        const cookieName = COOKIES_KEY.LOCALE + '='
        const cookies = document.cookie.split(';')
        
        for (let cookie of cookies) {
            cookie = cookie.trim()
            if (cookie.indexOf(cookieName) === 0) {
                const locale = decodeURIComponent(cookie.substring(cookieName.length))
                if (SUPPORTED_LOCALES.includes(locale)) {
                    return locale
                }
            }
        }
    } catch (e) {
        // Игнорируем ошибки чтения cookie
    }
    
    // Если не нашли в cookie, используем язык браузера
    const browserLang = navigator.language || navigator.userLanguage
    const langCode = browserLang.split('-')[0].toLowerCase()
    const aliased = ACCEPT_LANGUAGE_ALIASES[langCode]
    if (aliased && SUPPORTED_LOCALES.includes(aliased)) {
        return aliased
    }
    if (langCode === 'en' || langCode === 'ru') {
        return langCode
    }
    
    // Fallback
    return 'en'
}

const isDevBundle = process.env.NODE_ENV !== 'production'

function safeApiMessage(data) {
    if (data == null || typeof data !== 'object') return undefined
    if (typeof data.message === 'string') return data.message
    if (typeof data.error === 'string') return data.error
    return undefined
}

function logAxiosFailure(prefix, { status, method, url, data }) {
    const message = safeApiMessage(data) || 'Request failed'
    console.error(prefix, { status, method, url, message })
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
        
        // Добавляем заголовок Accept-Language для определения языка
        const locale = getLocale()
        config.headers['Accept-Language'] = locale
        
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
                '/family-budget/ai-report',
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

        // Для business API передаём current_company_id (для суперадмина и multi-tenant)
        if (typeof window !== 'undefined' && config.url?.includes('/business/')) {
            const businessId = useBusinessStore.getState()?.businessId
            const companyParam = { current_company_id: businessId }
            if (config.method?.toLowerCase() === 'get') {
                config.params = { ...(config.params || {}) }
                if (
                    (config.params.current_company_id == null || config.params.current_company_id === '') &&
                    businessId != null &&
                    businessId !== ''
                ) {
                    config.params.current_company_id = businessId
                }
            } else if (config.data instanceof FormData) {
                // Важно: не заменять FormData объектом JSON — иначе пропадают файлы (Object.keys(FormData) пустой).
                if (businessId != null && businessId !== '') {
                    if (typeof config.data.set === 'function') {
                        config.data.set('current_company_id', String(businessId))
                    } else {
                        config.data.append('current_company_id', String(businessId))
                    }
                }
            } else if (config.data && typeof config.data === 'object') {
                // НЕ перезаписываем current_company_id, если уже передан (например, из slot.company_id)
                if (config.data.current_company_id == null && businessId) {
                    config.data = { ...config.data, ...companyParam }
                }
            } else if ((!config.data || (typeof config.data === 'object' && Object.keys(config.data || {}).length === 0)) && businessId) {
                config.data = companyParam
            }
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
                    const publicRoutes = ['/services', '/marketplace', '/for-business', '/sign-in', '/business/sign-in', '/business/demo-login', '/admin/sign-in', '/auth/demo-login']
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

            const errorMessage = data?.message || data?.error || 'Unknown error'
            const payload = { status, method, url, data }

            switch (status) {
                case 403:
                    // Доступ запрещен
                    // Не логируем ошибки 403 для публичных endpoints, так как это нормально
                    var isPublicEndpoint = url.includes('/settings/public') || url.includes('/marketplace') || url.includes('/auth/')
                    if (!isPublicEndpoint && (errorMessage !== 'Unknown error' || Object.keys(data || {}).length > 0)) {
                        logAxiosFailure(`[${method} ${url}] Access forbidden`, payload)
                    }
                    break
                case 404:
                    // Ресурс не найден - не логируем как ошибку, это нормальное поведение для некоторых запросов
                    break
                case 409:
                    // Конфликт (например, бэкап уже выполняется) — ожидаемая ситуация, не спамим консоль
                    break
                case 422:
                    // Ошибка валидации — в консоль только статус и message, без полного тела ответа
                    if (data && Object.keys(data).length > 0) {
                        logAxiosFailure(`[${method} ${url}] Validation error`, payload)
                        if (isDevBundle) {
                            try {
                                localStorage.setItem(
                                    'last_validation_error',
                                    JSON.stringify({
                                        method,
                                        url,
                                        status: 422,
                                        message: safeApiMessage(data),
                                        timestamp: new Date().toISOString(),
                                    })
                                )
                            } catch (e) {
                                console.error('Не удалось сохранить ошибку валидации в localStorage:', e?.message)
                            }
                        }
                    }
                    break
                case 500:
                    logAxiosFailure(`[${method} ${url}] Server error (500)`, payload)
                    if (isDevBundle) {
                        try {
                            localStorage.setItem(
                                'last_server_error',
                                JSON.stringify({
                                    method,
                                    url,
                                    status: 500,
                                    message: safeApiMessage(data) || errorMessage || 'Internal server error',
                                    timestamp: new Date().toISOString(),
                                })
                            )
                        } catch (e) {
                            console.error('Не удалось сохранить ошибку сервера в localStorage:', e?.message)
                        }
                    }
                    break
                default:
                    // Не логируем ошибку 400 "Already in favorites" как ошибку, так как это нормальная ситуация
                    var isAlreadyInFavorites = status === 400 && (
                        (data?.message && (data.message.includes('Already in favorites') || data.message.includes('уже в избранном'))) ||
                        (errorMessage && (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')))
                    )

                    if (!isAlreadyInFavorites) {
                        if (data && Object.keys(data).length > 0) {
                            logAxiosFailure(`[${method} ${url}] API error (${status})`, payload)
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

