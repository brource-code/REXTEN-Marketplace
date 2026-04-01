'use client'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import SignUp from '@/components/auth/SignUp'
import { useRegister } from '@/hooks/api/useAuth'

const SignUpClient = () => {
    const registerMutation = useRegister()

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
            role: 'CLIENT', // Всегда CLIENT для основной страницы регистрации
        }

        registerMutation.mutate(registerData, {
            onSuccess: () => {

                toast.push(
                    <Notification title="Аккаунт создан!" type="success">
                        Добро пожаловать! Вы будете перенаправлены в личный кабинет.
                    </Notification>,
                )
                // Редирект будет выполнен автоматически в useRegister хуке
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

    return <SignUp onSignUp={handleSignUp} />
}

export default SignUpClient
