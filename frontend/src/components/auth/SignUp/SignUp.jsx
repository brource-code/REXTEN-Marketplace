'use client'
import Logo from '@/components/template/Logo'
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
            <div className="mb-2 sm:mb-6 md:mb-8">
                <Logo
                    type="streamline"
                    mode={mode}
                    forceSvg={true}
                    imgClass="max-h-8 sm:max-h-12 w-auto"
                />
            </div>
            <div className="mb-2 sm:mb-6 md:mb-8">
                <h3 className="mb-0.5 sm:mb-1 text-base sm:text-xl">{t('title')}</h3>
                <p className="text-xs sm:text-base font-semibold heading-text">
                    {t('subtitle')}
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-2 sm:mb-4" type="danger">
                    <span className="break-all text-xs sm:text-sm">{message}</span>
                </Alert>
            )}
            <SignUpForm onSignUp={onSignUp} setMessage={setMessage} />
            <div className="mt-2 sm:mt-4 text-center">
                <span className="text-xs sm:text-sm">{t('haveAccount')} </span>
                <ActionLink
                    href={signInUrl}
                    className="heading-text font-bold text-xs sm:text-sm"
                    themeColor={false}
                >
                    {t('signIn')}
                </ActionLink>
            </div>
        </>
    )
}

export default SignUp
