'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import ActionLink from '@/components/shared/ActionLink'
import ResetPasswordForm from './ResetPasswordForm'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useRouter } from 'next/navigation'
import AuthPageLogo from '@/components/auth/AuthPageLogo'

export const ResetPassword = ({
    signInUrl = '/sign-in',
    invalidLink = false,
    onResetPasswordSubmit,
}) => {
    const t = useTranslations('auth.resetPassword')
    const [resetComplete, setResetComplete] = useState(false)
    const [message, setMessage] = useTimeOutMessage()
    const router = useRouter()

    const handleContinue = () => {
        router.push(signInUrl)
    }

    if (invalidLink) {
        return (
            <div>
                <AuthPageLogo />
                <div className="mb-6">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('invalidLinkTitle')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('invalidLinkDescription')}
                    </p>
                </div>
                <div className="mt-4 text-center">
                    <ActionLink
                        href={signInUrl}
                        className="text-sm font-bold text-gray-900 dark:text-gray-100"
                        themeColor={false}
                    >
                        {t('backToSignIn')}
                    </ActionLink>
                </div>
            </div>
        )
    }

    return (
        <div>
            <AuthPageLogo />
            <div className="mb-6">
                {resetComplete ? (
                    <>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {t('successTitle')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('successDescription')}
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
            <ResetPasswordForm
                resetComplete={resetComplete}
                setMessage={setMessage}
                setResetComplete={setResetComplete}
                onResetPasswordSubmit={onResetPasswordSubmit}
            >
                <Button
                    block
                    variant="solid"
                    type="button"
                    onClick={handleContinue}
                >
                    {t('continue')}
                </Button>
            </ResetPasswordForm>
            <div className="mt-4 text-center">
                <ActionLink
                    href={signInUrl}
                    className="text-sm font-bold text-gray-900 dark:text-gray-100"
                    themeColor={false}
                >
                    {t('backToSignIn')}
                </ActionLink>
            </div>
        </div>
    )
}

export default ResetPassword
