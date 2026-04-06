'use client'
import Link from 'next/link'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import Alert from '@/components/ui/Alert'
import SignInForm from './SignInForm'
import OauthSignIn from './OauthSignIn'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useTheme from '@/utils/hooks/useTheme'

const BusinessSignIn = ({
    forgetPasswordUrl = '/business/forgot-password',
    onSignIn,
    onOauthSignIn,
}) => {
    const [message, setMessage] = useTimeOutMessage()

    const mode = useTheme((state) => state.mode)

    return (
        <>
            <div className="mb-8">
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
            <div className="mb-10">
                <h2 className="mb-2 text-2xl font-bold">REXTEN Business</h2>
                <p className="font-semibold heading-text">
                    Панель управления для бизнеса
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Войдите в систему для управления вашим бизнесом
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <SignInForm
                setMessage={setMessage}
                passwordHint={
                    <div className="mb-7 mt-2">
                        <ActionLink
                            href={forgetPasswordUrl}
                            className="font-semibold heading-text mt-2 underline"
                            themeColor={false}
                        >
                            Забыли пароль?
                        </ActionLink>
                    </div>
                }
                onSignIn={onSignIn}
            />
            <div className="mt-8">
                <div className="flex items-center gap-2 mb-6">
                    <div className="border-t border-gray-200 dark:border-gray-800 flex-1 mt-[1px]" />
                    <p className="font-semibold heading-text">
                        или продолжите с
                    </p>
                    <div className="border-t border-gray-200 dark:border-gray-800 flex-1 mt-[1px]" />
                </div>
                <OauthSignIn
                    setMessage={setMessage}
                    onOauthSignIn={onOauthSignIn}
                />
            </div>
        </>
    )
}

export default BusinessSignIn

