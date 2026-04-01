'use client'
import ForgotPassword from '@/components/auth/ForgotPassword'
import Split from '@/components/layouts/AuthLayout/Split'
import { apiForgotPassword } from '@/services/AuthService'

const ForgotPasswordDemoSplit = () => {
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
        <Split>
            <ForgotPassword
                signInUrl="/auth/sign-in-side"
                onForgotPasswordSubmit={handleForgotPasswordSubmit}
            />
        </Split>
    )
}

export default ForgotPasswordDemoSplit
