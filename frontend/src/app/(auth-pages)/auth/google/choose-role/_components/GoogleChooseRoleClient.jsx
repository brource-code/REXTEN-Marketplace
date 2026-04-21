'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import AuthPageLogo from '@/components/auth/AuthPageLogo'
import { getGooglePending, completeGoogleSignup } from '@/lib/api/auth'
import { getLaravelApiUrl } from '@/utils/api/getLaravelApiUrl'
import { useAuthStore, clearAuthPersistStorage } from '@/store'
import LaravelAxios from '@/services/axios/LaravelAxios'
import { clearTokens } from '@/utils/auth/tokenStorage'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import classNames from '@/utils/classNames'

export default function GoogleChooseRoleClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pending = searchParams.get('pending')
    const t = useTranslations('auth.googleSignup')
    const { setAuth } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [expired, setExpired] = useState(false)
    const [profile, setProfile] = useState(null)
    const [completing, setCompleting] = useState(false)

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
                if (!cancelled) {
                    setProfile(data)
                }
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

    const onChooseClient = async () => {
        if (!pending || completing) return
        setCompleting(true)
        try {
            const res = await completeGoogleSignup({ token: pending, role: 'CLIENT' })
            if (!res?.access_token) {
                throw new Error('no_token')
            }
            await finalizeSession(res.access_token)
            router.replace('/services')
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
            toast.push(
                <Notification title={t('errors.generic')} type="danger">
                    {e?.response?.data?.message || t('errors.generic')}
                </Notification>,
            )
        } finally {
            setCompleting(false)
        }
    }

    const onChooseBusiness = () => {
        if (!pending) return
        router.push(`/auth/google/choose-role/business?pending=${encodeURIComponent(pending)}`)
    }

    const retryGoogle = () => {
        const apiUrl = getLaravelApiUrl()
        window.location.href = `${apiUrl}/auth/google/redirect`
    }

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-xl px-1">
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

    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()

    return (
        <div className="mx-auto w-full max-w-xl px-1">
            <AuthPageLogo className="mb-6" />
            <Container className="max-w-xl">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('chooseRole.title')}</h4>
                <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{t('chooseRole.subtitle')}</p>
                <p className="mt-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('chooseRole.signedInAs')}{' '}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {profile?.email}
                        {displayName ? ` (${displayName})` : ''}
                    </span>
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <button
                        type="button"
                        disabled={completing}
                        onClick={() => void onChooseClient()}
                        className={classNames(
                            'flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-left transition',
                            'hover:border-primary dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-primary',
                            completing && 'pointer-events-none opacity-60',
                        )}
                    >
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {t('chooseRole.client.title')}
                        </span>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('chooseRole.client.description')}
                        </span>
                        <span className="mt-2 text-sm font-bold text-primary">{t('chooseRole.client.cta')}</span>
                    </button>

                    <button
                        type="button"
                        disabled={completing}
                        onClick={onChooseBusiness}
                        className={classNames(
                            'flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-left transition',
                            'hover:border-primary dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-primary',
                            completing && 'pointer-events-none opacity-60',
                        )}
                    >
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {t('chooseRole.business.title')}
                        </span>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('chooseRole.business.description')}
                        </span>
                        <span className="mt-2 text-sm font-bold text-primary">{t('chooseRole.business.cta')}</span>
                    </button>
                </div>
            </Container>
        </div>
    )
}
