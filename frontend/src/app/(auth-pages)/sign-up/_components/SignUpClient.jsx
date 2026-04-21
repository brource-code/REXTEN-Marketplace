'use client'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import SignUp from '@/components/auth/SignUp'
import { useRegister } from '@/hooks/api/useAuth'
import { usPhoneToE164 } from '@/utils/usPhone'
import { useLocale } from 'next-intl'

const SignUpClient = () => {
    const registerMutation = useRegister()
    const locale = useLocale()

    const handleSignUp = async ({ values, setSubmitting, setMessage }) => {
        setSubmitting(true)
        setMessage('')

        // Преобразуем данные формы в формат API
        const registerData = {
            first_name: values.firstName,
            last_name: values.lastName,
            email: values.email,
            phone: usPhoneToE164(values.phone) || '',
            password: values.password,
            password_confirmation: values.confirmPassword,
            role: 'CLIENT', // Всегда CLIENT для основной страницы регистрации
            locale,
        }

        try {
            const result = await registerMutation.mutateAsync(registerData)
            if (result?.requires_email_verification) {
                toast.push(
                    <Notification title="Аккаунт создан!" type="success">
                        Мы отправили письмо на ваш email. Подтвердите адрес, чтобы пользоваться сервисом.
                    </Notification>,
                )
            } else {
                toast.push(
                    <Notification title="Аккаунт создан!" type="success">
                        Добро пожаловать! Вы будете перенаправлены на сайт.
                    </Notification>,
                )
            }
        } catch (error) {
            if (error?.response?.data?.errors) {
                const validationErrors = error.response.data.errors
                const allErrors = []
                Object.keys(validationErrors).forEach((field) => {
                    validationErrors[field].forEach((msg) => {
                        allErrors.push(msg)
                    })
                })

                const firstError = allErrors[0] || 'Ошибка валидации'
                setMessage(firstError)

                const errorText = allErrors.length > 1 ? allErrors.join('. ') : firstError

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
        } finally {
            setSubmitting(false)
        }
    }

    return <SignUp onSignUp={handleSignUp} />
}

export default SignUpClient
