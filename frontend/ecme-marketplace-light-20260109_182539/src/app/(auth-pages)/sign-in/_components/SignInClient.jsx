'use client'
import SignIn from '@/components/auth/SignIn'
import { useLogin } from '@/hooks/api/useAuth'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { getLaravelApiUrl } from '@/utils/api/getLaravelApiUrl'

// Проверка, является ли hostname приватным IP
const isPrivateIp = (hostname) => {
    // Проверяем паттерны приватных IP
    const privateIpPatterns = [
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^127\./,
        /^169\.254\./,
    ]
    return privateIpPatterns.some(pattern => pattern.test(hostname))
}

const SignInClient = () => {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get(REDIRECT_URL_KEY)
    const loginMutation = useLogin()

    const handleSignIn = ({ values, setSubmitting, setMessage }) => {
        setSubmitting(true)
        setMessage('')

        loginMutation.mutate(
            {
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: () => {
                    // Редирект будет выполнен автоматически в useLogin хуке
                    // Но если есть callbackUrl, используем его
                    if (callbackUrl) {
                        window.location.href = callbackUrl
                    }
                },
                onError: (error) => {
                    setSubmitting(false)
                    
                    // ВСЕГДА логируем ошибку для отладки
                    const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
                    const debugInfo = {
                        hasError: !!error,
                        hasResponse: !!error?.response,
                        hasRequest: !!error?.request,
                        status: error?.response?.status,
                        statusType: typeof error?.response?.status,
                        statusString: String(error?.response?.status),
                        data: error?.response?.data,
                        dataType: typeof error?.response?.data,
                        dataIsString: typeof error?.response?.data === 'string',
                        dataKeys: error?.response?.data && typeof error?.response?.data === 'object' ? Object.keys(error?.response?.data) : [],
                        message: error?.message,
                        isIOS: isIOS,
                    }
                    console.log('Login Error Debug:', debugInfo)
                    
                    // Определяем, мобильное ли устройство (нужно определить ДО обработки ошибки)
                    const isMobile = typeof window !== 'undefined' && (
                        window.innerWidth < 768 || 
                        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                    )
                    
                    // Извлекаем сообщение об ошибке
                    let errorMessage = 'Ошибка входа. Проверьте email и пароль.'
                    let notificationTitle = 'Ошибка входа'
                    
                    // Проверяем сетевые ошибки (когда нет ответа от сервера)
                    if (!error?.response && error?.request) {
                        errorMessage = 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова.'
                        notificationTitle = 'Ошибка сети'
                    } else if (error?.response) {
                        // Есть ответ от сервера - проверяем статус и сообщение
                        const status = error.response.status
                        const statusNumber = Number(status)
                        const statusString = String(status)
                        
                        // Парсим data - может быть объектом или строкой (HTML)
                        let responseData = {}
                        if (typeof error.response.data === 'string') {
                            try {
                                responseData = JSON.parse(error.response.data)
                            } catch (e) {
                                console.warn('Response data is not JSON:', error.response.data.substring(0, 100))
                                responseData = {}
                            }
                        } else if (typeof error.response.data === 'object' && error.response.data !== null) {
                            responseData = error.response.data
                        }
                        
                        const responseMessage = responseData.message || responseData.error || ''
                        const responseMessageLower = String(responseMessage).toLowerCase()
                        
                        // Проверяем флаг is_blocked в ответе (если есть)
                        const isBlocked = responseData.is_blocked === true || responseData.is_blocked === 'true' || responseData.is_blocked === 1 || responseData.is_blocked === '1'
                        
                        // АГРЕССИВНАЯ проверка блокировки - проверяем ВСЕ возможные варианты
                        const is403Status = statusNumber === 403 || status === 403 || statusString === '403' || String(status).trim() === '403'
                        const hasBlockedText = responseMessageLower.includes('заблокирован') || 
                                              responseMessageLower.includes('неактивен') ||
                                              responseMessageLower.includes('blocked') ||
                                              responseMessageLower.includes('inactive') ||
                                              responseMessageLower.includes('аккаунт заблокирован')
                        
                        // Если ЛЮБОЕ условие выполнено - считаем аккаунт заблокированным
                        if (is403Status || isBlocked || hasBlockedText) {
                            errorMessage = responseMessage || 'Ваш аккаунт заблокирован. Обратитесь к администратору для получения дополнительной информации.'
                            notificationTitle = 'Аккаунт заблокирован'
                        } else if (responseMessage) {
                            // Используем сообщение от сервера
                            errorMessage = responseMessage
                        } else if (responseData.errors) {
                            // Laravel может вернуть ошибки валидации
                            const errors = responseData.errors
                            const firstError = Object.values(errors)[0]
                            if (Array.isArray(firstError) && firstError.length > 0) {
                                errorMessage = firstError[0]
                            }
                        }
                    } else if (error?.message && !error.message.toLowerCase().includes('network error')) {
                        errorMessage = error.message
                    }
                    
                    // На мобильных показываем ошибку только в форме, на десктопе - только toast
                    if (isMobile) {
                        // На мобильных: показываем ошибку в форме
                        setMessage(errorMessage)
                    } else {
                        // На десктопе: показываем toast
                        setMessage('') // Очищаем форму на десктопе
                        toast.push(
                            <Notification 
                                title={notificationTitle} 
                                type="danger"
                                width={350}
                            >
                                {errorMessage}
                            </Notification>,
                            {
                                placement: 'top-end',
                                offsetY: 30,
                                offsetX: 30,
                            }
                        )
                    }
                },
            }
        )
    }

    // Обновляем состояние загрузки при изменении мутации
    useEffect(() => {
        if (loginMutation.isPending) {
            // Состояние загрузки обрабатывается через setSubmitting
        }
    }, [loginMutation.isPending])

    const handleOAuthSignIn = async ({ type }) => {
        if (type === 'google') {
            // Сохраняем текущий URL для редиректа после авторизации
            // НО только если это НЕ страница логина (чтобы избежать бесконечного редиректа)
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname + window.location.search
                // Сохраняем только если это не страница логина
                if (!currentPath.includes('/sign-in')) {
                    localStorage.setItem('redirect_url', currentPath)
                } else {
                    // Если уже на странице логина, очищаем redirect_url
                    localStorage.removeItem('redirect_url')
                }
            }
            
            // Для Google OAuth ВСЕГДА используем localhost для локальной разработки
            // т.к. Google не поддерживает приватные IP без device_id/device_name
            let apiUrl
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname
                // Если это не localhost и не production домен, используем localhost для Google OAuth
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    apiUrl = 'http://localhost:8000/api'
                } else if (isPrivateIp(hostname)) {
                    // Для приватных IP используем localhost
                    apiUrl = 'http://localhost:8000/api'
                } else {
                    // Для публичных доменов используем обычный API URL
                    apiUrl = getLaravelApiUrl()
                }
            } else {
                apiUrl = process.env.NEXT_PUBLIC_LARAVEL_API_URL || 'http://localhost:8000/api'
            }
            window.location.href = `${apiUrl}/auth/google/redirect`
        } else {
            toast.push(
                <Notification title="В разработке" type="warning">
                    OAuth авторизация для {type} будет доступна позже
                </Notification>,
            )
        }
    }

    return <SignIn onSignIn={handleSignIn} onOauthSignIn={handleOAuthSignIn} />
}

export default SignInClient
