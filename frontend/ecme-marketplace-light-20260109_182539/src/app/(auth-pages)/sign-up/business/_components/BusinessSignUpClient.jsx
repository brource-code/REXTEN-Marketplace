'use client'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import BusinessSignUpForm from '@/components/auth/SignUp/BusinessSignUpForm'
import { useRegister } from '@/hooks/api/useAuth'
import { useRouter } from 'next/navigation'
import Logo from '@/components/template/Logo'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useTheme from '@/utils/hooks/useTheme'
import Alert from '@/components/ui/Alert'
import { PiArrowLeft } from 'react-icons/pi'

const BusinessSignUpClient = () => {
    const router = useRouter()
    const registerMutation = useRegister()
    const [message, setMessage] = useTimeOutMessage()
    const mode = useTheme((state) => state.mode)

    const handleSignUp = async ({ values, setSubmitting, setMessage }) => {
        setSubmitting(true)
        setMessage('')

        // Преобразуем данные формы в формат API
        const registerData = {
            first_name: values.firstName,
            last_name: values.lastName,
            email: values.email,
            phone: values.phone || '',
            password: values.password,
            password_confirmation: values.confirmPassword,
            role: 'BUSINESS_OWNER',
        }

        registerMutation.mutate(registerData, {
            onSuccess: async (data) => {
                // Сохраняем данные бизнеса после успешной регистрации
                if (data?.user?.id && data?.user?.role === 'BUSINESS_OWNER') {
                    try {
                        // Ждем, чтобы токены точно сохранились в localStorage
                        // setAuth выполняется синхронно, но даем время для обновления состояния
                        await new Promise(resolve => setTimeout(resolve, 100))
                        
                        // Проверяем, что токен доступен
                        const { getAccessToken } = await import('@/utils/auth/tokenStorage')
                        const token = getAccessToken()
                        
                        if (!token) {
                            console.warn('Токен не найден после регистрации, попытка повторить через 500ms')
                            await new Promise(resolve => setTimeout(resolve, 500))
                            const retryToken = getAccessToken()
                            if (!retryToken) {
                                console.error('Токен не найден после повторной попытки')
                                throw new Error('Токен не доступен')
                            }
                        }
                        
                        const LaravelAxios = (await import('@/services/axios/LaravelAxios')).default
                        
                        // Подготавливаем данные для отправки
                        const companyData = {
                            name: values.businessName,
                            description: values.businessDescription || '',
                            address: values.businessAddress,
                            phone: values.businessPhone,
                            email: values.businessEmail || values.email,
                            website: values.businessWebsite || '',
                        }
                        
                        console.log('📤 Отправка данных компании на сервер:', companyData)
                        console.log('📤 URL:', '/business/settings/profile')
                        console.log('📤 Метод: PUT')
                        
                        // Создаем/обновляем профиль компании через бизнес API
                        const response = await LaravelAxios.put('/business/settings/profile', companyData)
                        
                        console.log('✅ Ответ от сервера:', response.status, response.data)
                        
                        if (response?.data?.data) {
                            console.log('✅ Данные компании успешно сохранены:', {
                                name: response.data.data.name,
                                address: response.data.data.address,
                                phone: response.data.data.phone,
                            })
                            
                            // После успешного сохранения данных компании выполняем редирект
                            toast.push(
                                <Notification title="Аккаунт создан!" type="success">
                                    Добро пожаловать! Вы будете перенаправлены в личный кабинет.
                                </Notification>,
                            )
                            
                            // Редирект в дашборд бизнеса
                            setTimeout(() => {
                                router.push('/business/dashboard')
                            }, 500)
                        } else {
                            console.warn('⚠️ Ответ от сервера не содержит данных компании')
                            // Даже если ответ не содержит данных, выполняем редирект
                            toast.push(
                                <Notification title="Аккаунт создан!" type="success">
                                    Добро пожаловать! Вы будете перенаправлены в личный кабинет.
                                </Notification>,
                            )
                            setTimeout(() => {
                                router.push('/business/dashboard')
                            }, 500)
                        }
                    } catch (error) {
                        console.error('❌ Ошибка при сохранении данных компании:', error)
                        console.error('Детали ошибки:', {
                            message: error?.message,
                            response: error?.response?.data,
                            status: error?.response?.status,
                            url: error?.config?.url,
                        })
                        // Не блокируем регистрацию, если не удалось создать компанию
                        // Пользователь сможет заполнить данные позже в настройках
                        toast.push(
                            <Notification title="Внимание" type="warning">
                                Аккаунт создан, но данные компании не были сохранены. Вы сможете заполнить их в настройках.
                            </Notification>,
                        )
                        // Выполняем редирект даже при ошибке
                        setTimeout(() => {
                            router.push('/business/dashboard')
                        }, 1000)
                    }
                } else {
                    // Если не BUSINESS_OWNER, редирект уже выполнен в useRegister
                    toast.push(
                        <Notification title="Аккаунт создан!" type="success">
                            Добро пожаловать! Вы будете перенаправлены в личный кабинет.
                        </Notification>,
                    )
                }
            },
            onError: (error) => {
                // Обработка ошибок валидации Laravel
                if (error?.response?.data?.errors) {
                    const validationErrors = error.response.data.errors
                    // Собираем все ошибки валидации
                    const allErrors = []
                    Object.keys(validationErrors).forEach(field => {
                        validationErrors[field].forEach(msg => {
                            allErrors.push(msg)
                        })
                    })
                    
                    // Показываем первую ошибку в сообщении
                    const firstError = allErrors[0] || 'Ошибка валидации'
                    setMessage(firstError)
                    
                    // Показываем все ошибки в toast
                    const errorText = allErrors.length > 1 
                        ? allErrors.join('. ') 
                        : firstError
                    
                    toast.push(
                        <Notification title="Ошибка регистрации" type="danger">
                            {errorText}
                        </Notification>,
                    )
                } else {
                    const errorMessage =
                        error?.response?.data?.message ||
                        error?.response?.data?.error ||
                        error?.message ||
                        'Ошибка регистрации. Попробуйте еще раз.'
                    
                    setMessage(errorMessage)
                    
                    toast.push(
                        <Notification title="Ошибка регистрации" type="danger">
                            {errorMessage}
                        </Notification>,
                    )
                }
                
                setSubmitting(false)
            },
        })
    }

    return (
        <>
            <div className="mb-8">
                <Logo
                    type="streamline"
                    mode={mode}
                    forceSvg={true}
                    imgClass="max-h-12 w-auto"
                />
            </div>
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
                >
                    <PiArrowLeft className="mr-2" />
                    Назад к регистрации
                </button>
                <h3 className="mb-1">Регистрация бизнеса</h3>
                <p className="font-semibold heading-text">
                    Создайте аккаунт для вашего бизнеса
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <BusinessSignUpForm onSignUp={handleSignUp} setMessage={setMessage} />
            <div>
                <div className="mt-6 text-center">
                    <span>Уже есть аккаунт? </span>
                    <ActionLink
                        href="/sign-in"
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        Войти
                    </ActionLink>
                </div>
            </div>
        </>
    )
}

export default BusinessSignUpClient

