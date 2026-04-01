'use client'
import ForgotPassword from '@/components/auth/ForgotPassword'
import Simple from '@/components/layouts/AuthLayout/Simple'
import { apiForgotPassword } from '@/services/AuthService'

const ForgotPasswordDemoSimple = () => {
    const handleForgotPasswordSubmit = async ({
        values,
        setSubmitting,
        setMessage,
        setEmailSent,
    }) => {
        try {
            setSubmitting(true)
            await apiForgotPassword(values)
            setEmailSent(true)
        } catch (error) {
            setMessage(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Simple>
            <ForgotPassword
                signInUrl="/auth/sign-in-side"
                onForgotPasswordSubmit={handleForgotPasswordSubmit}
            />
        </Simple>
    )
}

export default ForgotPasswordDemoSimple
