'use client'

import { useLocale, useTranslations } from 'next-intl'
import { apiForgotPassword } from '@/services/AuthService'
import ForgotPassword from '@/components/auth/ForgotPassword'
import { toast } from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { getLaravelApiErrorMessage } from '@/utils/getLaravelApiErrorMessage'

const ForgotPasswordClient = () => {
    const t = useTranslations('auth.forgotPassword')
    const locale = useLocale()

    const handleForgotPasswordSubmit = async ({
        values,
        setSubmitting,
        setMessage,
        setEmailSent,
    }) => {
        try {
            setSubmitting(true)
            await apiForgotPassword({ email: values.email, locale })
            toast.push(
                <Notification title={t('toastSuccessTitle')} type="success">
                    {t('toastSuccessDescription')}
                </Notification>,
            )
            setEmailSent(true)
        } catch (error) {
            setMessage(getLaravelApiErrorMessage(error, t('errors.generic')))
        } finally {
            setSubmitting(false)
        }
    }

    return <ForgotPassword onForgotPasswordSubmit={handleForgotPasswordSubmit} />
}

export default ForgotPasswordClient
