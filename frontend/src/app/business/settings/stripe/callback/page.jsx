'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Spinner from '@/components/ui/Spinner'
import { PiCheckCircle, PiWarningCircle } from 'react-icons/pi'
import { getStripeConnectStatus } from '@/lib/api/stripe'
import { useTranslations } from 'next-intl'

export default function StripeCallbackPage() {
    const router = useRouter()
    const t = useTranslations('business.settings.payments')
    const [redirecting, setRedirecting] = useState(false)

    const { data: status, isLoading, error } = useQuery({
        queryKey: ['stripe-connect-status-callback'],
        queryFn: getStripeConnectStatus,
        refetchInterval: 2000,
        refetchIntervalInBackground: false,
    })

    useEffect(() => {
        if (status && !redirecting) {
            const accountStatus = status.stripe_account_status

            if (accountStatus === 'active') {
                setRedirecting(true)
                setTimeout(() => {
                    router.push('/business/settings?tab=payments&stripe_success=true')
                }, 2000)
            } else if (accountStatus === 'pending' || accountStatus === 'restricted') {
                setRedirecting(true)
                setTimeout(() => {
                    router.push('/business/settings?tab=payments&stripe_pending=true')
                }, 2000)
            }
        }
    }, [status, router, redirecting])

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center py-12">
                    <Spinner size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('checkingStatus')}
                    </p>
                </div>
            )
        }

        if (error) {
            return (
                <div className="text-center py-12">
                    <PiWarningCircle className="text-4xl text-red-500 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('errorCheckingStatus')}
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                        {t('redirectingToSettings')}
                    </p>
                </div>
            )
        }

        const accountStatus = status?.stripe_account_status

        if (accountStatus === 'active') {
            return (
                <div className="text-center py-12">
                    <PiCheckCircle className="text-4xl text-green-500 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('onboardingComplete')}
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                        {t('redirectingToSettings')}
                    </p>
                    <Spinner size={24} className="mx-auto mt-4" />
                </div>
            )
        }

        if (accountStatus === 'pending' || accountStatus === 'restricted') {
            return (
                <div className="text-center py-12">
                    <PiWarningCircle className="text-4xl text-yellow-500 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('onboardingIncomplete')}
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                        {t('additionalInfoRequired')}
                    </p>
                    <Spinner size={24} className="mx-auto mt-4" />
                </div>
            )
        }

        return (
            <div className="text-center py-12">
                <Spinner size={48} className="mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('processingOnboarding')}
                </p>
            </div>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {t('stripeOnboarding')}
                        </h4>
                    </div>
                    {renderContent()}
                </div>
            </AdaptiveCard>
        </Container>
    )
}
