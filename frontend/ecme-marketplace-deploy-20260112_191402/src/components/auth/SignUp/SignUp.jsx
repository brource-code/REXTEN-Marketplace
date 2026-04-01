'use client'
import Logo from '@/components/template/Logo'
import Alert from '@/components/ui/Alert'
import SignUpForm from './SignUpForm'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useTheme from '@/utils/hooks/useTheme'

export const SignUp = ({ onSignUp, signInUrl = '/sign-in' }) => {
    const [message, setMessage] = useTimeOutMessage()

    const mode = useTheme((state) => state.mode)

    return (
        <>
            <div className="mb-8">
                <Logo
                    type="streamline"
                    mode={mode}
                    forceSvg={true}
                    imgClass="max-h-12 w-auto"
                />
            </div>
            <div className="mb-8">
                <h3 className="mb-1">Регистрация</h3>
                <p className="font-semibold heading-text">
                    Создайте аккаунт и начните работу
                </p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <SignUpForm onSignUp={onSignUp} setMessage={setMessage} />
            <div>
                <div className="mt-6 text-center">
                    <span>Уже есть аккаунт? </span>
                    <ActionLink
                        href={signInUrl}
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        Войти
                    </ActionLink>
                </div>
            </div>
        </>
    )
}

export default SignUp
