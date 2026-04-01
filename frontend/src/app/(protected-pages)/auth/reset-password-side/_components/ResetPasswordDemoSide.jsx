'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import ResetPassword from '@/components/auth/ResetPassword'
import Side from '@/components/layouts/AuthLayout/Side'
import { apiResetPassword } from '@/services/AuthService'
import { getLaravelApiErrorMessage } from '@/utils/getLaravelApiErrorMessage'

const ResetPasswordDemoSide = () => {
    const searchParams = useSearchParams()
    const t = useTranslations('auth.resetPassword')

    const token = searchParams.get('token')
    const emailParam = searchParams.get('email')
    const email = emailParam ? decodeURIComponent(emailParam) : null

    const invalidLink = !token || !email

    const handleResetPassword = async (payload) => {
        const { values, setSubmitting, setMessage, setResetComplete } = payload
        try {
            setSubmitting(true)
            await apiResetPassword({
                token,
                email,
                password: values.newPassword,
                password_confirmation: values.confirmPassword,
            })
            setResetComplete?.(true)
        } catch (error) {
            setMessage(getLaravelApiErrorMessage(error, t('errors.generic')))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Side>
            <ResetPassword
                signInUrl="/auth/sign-in-side"
                invalidLink={invalidLink}
                onResetPasswordSubmit={invalidLink ? undefined : handleResetPassword}
            />
        </Side>
    )
}

export default ResetPasswordDemoSide
