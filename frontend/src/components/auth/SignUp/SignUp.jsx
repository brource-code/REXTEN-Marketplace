'use client'
import Link from 'next/link'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import Alert from '@/components/ui/Alert'
import SignUpForm from './SignUpForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useTheme from '@/utils/hooks/useTheme'
import { useTranslations } from 'next-intl'

export const SignUp = ({ onSignUp, signInUrl = '/sign-in' }) => {
    const [message, setMessage] = useTimeOutMessage()
    const t = useTranslations('auth.signUp')

    const mode = useTheme((state) => state.mode)

    return (
        <>
            <div className="mb-6 sm:mb-8">
                <Link
                    href={appConfig.marketplaceHomePath}
                    className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                >
                    <Logo
                        type="full"
                        mode={mode}
                        forceSvg={true}
                        imgClass="h-7 w-auto max-w-[130px] sm:h-8 sm:max-w-[150px]"
                    />
                </Link>
            </div>
            <div className="mb-6 sm:mb-8">
                <h3 className="mb-1">{t('title')}</h3>
                <p className="font-semibold heading-text">
                    {t('subtitle')}
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all text-sm">{message}</span>
                </Alert>
            )}
            <SignUpForm onSignUp={onSignUp} setMessage={setMessage} />
            <div className="mt-6 text-center">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('haveAccount')}{' '}
                </span>
                <ActionLink
                    href={signInUrl}
                    className="text-sm font-bold heading-text"
                    themeColor={false}
                >
                    {t('signIn')}
                </ActionLink>
            </div>
        </>
    )
}

export default SignUp
