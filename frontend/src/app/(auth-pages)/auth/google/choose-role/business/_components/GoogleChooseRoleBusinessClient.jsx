'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import AuthPageLogo from '@/components/auth/AuthPageLogo'
import BusinessSignUpForm from '@/components/auth/SignUp/BusinessSignUpForm'
import { getGooglePending, completeGoogleSignup } from '@/lib/api/auth'
import { getLaravelApiUrl } from '@/utils/api/getLaravelApiUrl'
import { useAuthStore, clearAuthPersistStorage } from '@/store'
import LaravelAxios from '@/services/axios/LaravelAxios'
import { clearTokens } from '@/utils/auth/tokenStorage'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { usPhoneToE164 } from '@/utils/usPhone'

export default function GoogleChooseRoleBusinessClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pending = searchParams.get('pending')
    const t = useTranslations('auth.googleSignup')
    const { setAuth } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [expired, setExpired] = useState(false)
    const [profile, setProfile] = useState(null)

    const finalizeSession = useCallback(
        async (accessToken) => {
            clearTokens()
            clearAuthPersistStorage()
            if (typeof window !== 'undefined') {
                localStorage.removeItem('user-storage')
                localStorage.removeItem('business-storage')
            }
            setAuth({ access_token: accessToken }, null)
            await new Promise((r) => setTimeout(r, 80))
            const { data } = await LaravelAxios.get('/auth/me')
            if (!data?.id || !data?.role) {
                throw new Error('me_failed')
            }
            setAuth({ access_token: accessToken }, data)
        },
        [setAuth],
    )

    useEffect(() => {
        let cancelled = false
        const run = async () => {
            if (!pending) {
                setExpired(true)
                setLoading(false)
                return
            }
            try {
                const data = await getGooglePending(pending)
                if (!cancelled) setProfile(data)
            } catch (e) {
                const status = e?.response?.status
                if (status === 410 || status === 404) {
                    if (!cancelled) setExpired(true)
                } else if (!cancelled) {
                    toast.push(
                        <Notification title={t('errors.generic')} type="danger">
                            {e?.response?.data?.message || t('errors.generic')}
                        </Notification>,
                    )
                    if (!cancelled) setExpired(true)
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [pending, t])

    const handleBusinessSubmit = async ({ values, setSubmitting, setMessage }) => {
        setSubmitting(true)
        setMessage?.('')
        if (!pending) {
            setSubmitting(false)
            return
        }
        try {
            const phoneE164 = usPhoneToE164(values.businessPhone)
            if (!phoneE164) {
                setMessage?.(t('errors.phoneInvalid'))
                toast.push(
                    <Notification title={t('errors.generic')} type="danger">
                        {t('errors.phoneInvalid')}
                    </Notification>,
                )
                setSubmitting(false)
                return
            }
            const res = await completeGoogleSignup({
                token: pending,
                role: 'BUSINESS_OWNER',
                company: {
                    name: values.businessName,
                    address: values.businessAddress,
                    phone: phoneE164,
                    description: values.businessDescription || undefined,
                    email: values.businessEmail || undefined,
                    website: values.businessWebsite || undefined,
                },
            })
            if (!res?.access_token) {
                throw new Error('no_token')
            }
            await finalizeSession(res.access_token)
            router.replace('/business/dashboard')
        } catch (e) {
            const code = e?.response?.data?.code
            if (code === 'account_exists') {
                toast.push(
                    <Notification title={t('errors.accountExists')} type="warning">
                        {e?.response?.data?.message || t('errors.accountExists')}
                    </Notification>,
                )
                router.replace('/sign-in')
                return
            }
            const msg =
                e?.response?.data?.message ||
                (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
                t('errors.generic')
            setMessage?.(msg)
            toast.push(
                <Notification title={t('errors.generic')} type="danger">
                    {msg}
                </Notification>,
            )
        } finally {
            setSubmitting(false)
        }
    }

    const retryGoogle = () => {
        const apiUrl = getLaravelApiUrl()
        window.location.href = `${apiUrl}/auth/google/redirect`
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-2xl px-1">
                <AuthPageLogo className="mb-6" />
                <div className="flex justify-center py-16">
                    <Loading loading />
                </div>
            </div>
        )
    }

    if (expired || !pending) {
        return (
            <div className="mx-auto w-full max-w-xl px-1">
                <AuthPageLogo className="mb-6" />
                <Container className="max-w-xl">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('chooseRole.expired.title')}
                    </h4>
                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('chooseRole.expired.message')}
                    </p>
                    <Button className="mt-6 w-full" variant="solid" onClick={retryGoogle}>
                        {t('chooseRole.expired.retry')}
                    </Button>
                </Container>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-1">
            <AuthPageLogo className="mb-6" />
            <Container className="max-w-2xl">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('business.title')}</h4>
                <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{t('business.subtitle')}</p>
                <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{profile?.email}</span>
                </p>
                <div className="mt-6">
                    <BusinessSignUpForm
                        mode="company-only"
                        submitButtonLabel={t('business.submit')}
                        onSignUp={handleBusinessSubmit}
                    />
                </div>
            </Container>
        </div>
    )
}
