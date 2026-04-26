'use client'
import Link from 'next/link'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import BusinessSignUpForm from '@/components/auth/SignUp/BusinessSignUpForm'
import { useRegister } from '@/hooks/api/useAuth'
import { useRouter } from 'next/navigation'
import Logo from '@/components/template/Logo'
import appConfig from '@/configs/app.config'
import ActionLink from '@/components/shared/ActionLink'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useTheme from '@/utils/hooks/useTheme'
import Alert from '@/components/ui/Alert'
import { PiArrowLeft } from 'react-icons/pi'
import { useLocale, useTranslations } from 'next-intl'
import { usPhoneToE164 } from '@/utils/usPhone'

const BusinessSignUpClient = () => {
    const router = useRouter()
    const registerMutation = useRegister()
    const [message, setMessage] = useTimeOutMessage()
    const mode = useTheme((state) => state.mode)
    const t = useTranslations('auth.businessSignUp')
    const tSignUp = useTranslations('auth.signUp')
    const locale = useLocale()

    const handleSignUp = async ({ values, setSubmitting, setMessage: setFormMessage }) => {
        setSubmitting(true)
        setFormMessage('')

        const registerData = {
            first_name: values.firstName,
            last_name: values.lastName,
            email: values.email,
            phone: usPhoneToE164(values.phone) || '',
            password: values.password,
            password_confirmation: values.confirmPassword,
            role: 'BUSINESS_OWNER',
            locale,
            company: {
                name: values.businessName,
                description: values.businessDescription || '',
                address: values.businessAddress,
                phone: usPhoneToE164(values.businessPhone),
                email: values.businessEmail || values.email,
                website: values.businessWebsite || '',
            },
        }

        const goAfterSignup = (requiresVerify, emailForVerify) => {
            if (requiresVerify) {
                router.push(`/verify-code?email=${encodeURIComponent(emailForVerify || values.email)}`)
            } else {
                router.push('/business/dashboard')
            }
        }

        try {
            const data = await registerMutation.mutateAsync(registerData)
            const requiresVerify = Boolean(data.requires_email_verification)

            toast.push(
                <Notification title={t('messages.accountCreated')} type="success">
                    {t('messages.welcomeRedirect')}
                </Notification>,
            )
            setTimeout(() => goAfterSignup(requiresVerify, data.email || data.user?.email || values.email), 400)
        } catch (error) {
            if (error?.response?.data?.errors) {
                const validationErrors = error.response.data.errors
                const allErrors = []
                Object.keys(validationErrors).forEach((field) => {
                    validationErrors[field].forEach((msg) => {
                        allErrors.push(msg)
                    })
                })

                const firstError = allErrors[0] || t('messages.validationError')
                setMessage(firstError)

                const errorText = allErrors.length > 1 ? allErrors.join('. ') : firstError

                toast.push(
                    <Notification title={t('messages.registrationError')} type="danger">
                        {errorText}
                    </Notification>,
                )
            } else {
                const errorMessage =
                    error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    error?.message ||
                    t('messages.tryAgain')

                setMessage(errorMessage)

                toast.push(
                    <Notification title={t('messages.registrationError')} type="danger">
                        {errorMessage}
                    </Notification>,
                )
            }
        } finally {
            setSubmitting(false)
        }
    }

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
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
                >
                    <PiArrowLeft className="mr-2" />
                    {t('backToSignUp')}
                </button>
                <h3 className="mb-1">{t('title')}</h3>
                <p className="font-semibold heading-text">{t('subtitle')}</p>
            </div>
            {message && (
                <Alert showIcon className="mb-4" type="danger">
                    <span className="break-all">{message}</span>
                </Alert>
            )}
            <BusinessSignUpForm onSignUp={handleSignUp} setMessage={setMessage} />
            <div>
                <div className="mt-6 text-center">
                    <span>{tSignUp('haveAccount')} </span>
                    <ActionLink
                        href="/sign-in"
                        className="heading-text font-bold"
                        themeColor={false}
                    >
                        {tSignUp('signIn')}
                    </ActionLink>
                </div>
            </div>
        </>
    )
}

export default BusinessSignUpClient
