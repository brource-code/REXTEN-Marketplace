'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import ActionLink from '@/components/shared/ActionLink'
import ForgotPasswordForm from './ForgotPasswordForm'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useRouter } from 'next/navigation'
import AuthPageLogo from '@/components/auth/AuthPageLogo'

export const ForgotPassword = ({
    signInUrl = '/sign-in',
    onForgotPasswordSubmit,
}) => {
    const t = useTranslations('auth.forgotPassword')
    const [emailSent, setEmailSent] = useState(false)
    const [message, setMessage] = useTimeOutMessage()

    const router = useRouter()

    const handleContinue = () => {
        router.push(signInUrl)
    }

    return (
        <div>
            <AuthPageLogo />
            <div className="mb-6">
                {emailSent ? (
                    <>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {t('emailSentTitle')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('emailSentDescription')}
                        </p>
                    </>
                ) : (
                    <>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {t('title')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('description')}
                        </p>
                    </>
                )}
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <ForgotPasswordForm
                emailSent={emailSent}
                setMessage={setMessage}
                setEmailSent={setEmailSent}
                onForgotPasswordSubmit={onForgotPasswordSubmit}
            >
                <Button
                    block
                    variant="solid"
                    type="button"
                    onClick={handleContinue}
                >
                    {t('continue')}
                </Button>
            </ForgotPasswordForm>
            {!emailSent && (
                <div className="mt-4 text-center">
                    <ActionLink
                        href={signInUrl}
                        className="text-sm font-bold text-gray-900 dark:text-gray-100"
                        themeColor={false}
                    >
                        {t('backToSignIn')}
                    </ActionLink>
                </div>
            )}
        </div>
    )
}

export default ForgotPassword
