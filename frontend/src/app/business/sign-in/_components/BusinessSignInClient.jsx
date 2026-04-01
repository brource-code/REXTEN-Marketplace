'use client'
import BusinessSignIn from '@/components/auth/SignIn/BusinessSignIn'
import { useLogin } from '@/hooks/api/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useAuthStore } from '@/store'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const BusinessSignInClient = () => {
    const router = useRouter()
    const loginMutation = useLogin()
    const { isAuthenticated, userRole, logout } = useAuthStore()

    // Если уже авторизован как админ, редиректим в админку
    useEffect(() => {
        if (isAuthenticated && (userRole === BUSINESS_OWNER || userRole === SUPERADMIN)) {
            if (userRole === SUPERADMIN) {
                router.push('/superadmin/dashboard')
            } else {
                router.push('/business/dashboard')
            }
        }
    }, [isAuthenticated, userRole, router])

    const handleSignIn = ({ values, setSubmitting, setMessage }) => {
        setSubmitting(true)
        setMessage('')

        loginMutation.mutate(
            {
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: (data) => {
                    const role = data.user.role
                    
                    // Проверяем, что это админ (бизнес или суперадмин)
                    if (role !== BUSINESS_OWNER && role !== SUPERADMIN) {
                        setMessage('Доступ запрещен. Эта страница только для администраторов.')
                        setSubmitting(false)
                        
                        toast.push(
                            <Notification title="Доступ запрещен" type="danger">
                                Эта страница только для администраторов. Клиенты должны использовать публичный сайт.
                            </Notification>,
                        )
                        
                        // Очищаем авторизацию для клиента
                        loginMutation.reset()
                        // Очищаем токены
                        logout()
                        return
                    }
                    
                    // Редирект уже обрабатывается в useLogin, не дублируем
                    // Просто ждем, пока произойдет редирект
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

    const handleOAuthSignIn = async ({ type }) => {
        // OAuth пока не реализован для Laravel API
        toast.push(
            <Notification title="В разработке" type="warning">
                OAuth авторизация будет доступна позже
            </Notification>,
        )
    }

    return <BusinessSignIn onSignIn={handleSignIn} onOauthSignIn={handleOAuthSignIn} />
}

export default BusinessSignInClient

