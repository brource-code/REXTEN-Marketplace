'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Switcher from '@/components/ui/Switcher'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { PiCreditCard, PiCheckCircle, PiWarningCircle, PiArrowSquareOut, PiLinkBreak, PiArrowClockwise } from 'react-icons/pi'
import {
    getStripeConnectStatus,
    createStripeConnectAccount,
    refreshStripeConnectLink,
    getStripeDashboardLink,
    disconnectStripeAccount,
} from '@/lib/api/stripe'
import { updateMarketplaceSettings, getMarketplaceSettings } from '@/lib/api/business'

/** Stripe `requirements.disabled_reason` — показываем человекочитаемый текст, не сырой код. */
function formatStripeDisabledReason(reason, t) {
    if (reason == null || String(reason).trim() === '') {
        return ''
    }
    const r = String(reason).trim()
    if (r === 'requirements.past_due') {
        return t('requirements.past_due')
    }
    return t('stripeDisabledReasonOther', { reason: r })
}

const PaymentsTab = () => {
    const t = useTranslations('business.settings.payments')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()

    const { data: status, isLoading, error } = useQuery({
        queryKey: ['stripe-connect-status'],
        queryFn: getStripeConnectStatus,
        staleTime: 30000,
    })

    const { data: marketplaceSettings } = useQuery({
        queryKey: ['marketplace-settings'],
        queryFn: getMarketplaceSettings,
        staleTime: 30000,
    })

    const [onlinePaymentToggling, setOnlinePaymentToggling] = useState(false)
    const [cancellationFreeHours, setCancellationFreeHours] = useState(12)
    const [cancellationLateFeePercent, setCancellationLateFeePercent] = useState(50)
    const [savingCancellationPolicy, setSavingCancellationPolicy] = useState(false)

    useEffect(() => {
        if (marketplaceSettings?.cancellationFreeHours != null) {
            setCancellationFreeHours(marketplaceSettings.cancellationFreeHours)
        }
        if (marketplaceSettings?.cancellationLateFeePercent != null) {
            setCancellationLateFeePercent(marketplaceSettings.cancellationLateFeePercent)
        }
    }, [marketplaceSettings])

    const saveCancellationPolicy = async () => {
        setSavingCancellationPolicy(true)
        try {
            await updateMarketplaceSettings({
                cancellationFreeHours,
                cancellationLateFeePercent,
            })
            queryClient.invalidateQueries({ queryKey: ['marketplace-settings'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('cancellationPolicySaved')}
                </Notification>
            )
        } catch (err) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err.response?.data?.message || t('cancellationPolicySaveError')}
                </Notification>
            )
        } finally {
            setSavingCancellationPolicy(false)
        }
    }

    const toggleOnlinePayment = async (checked) => {
        setOnlinePaymentToggling(true)
        try {
            await updateMarketplaceSettings({ onlinePaymentEnabled: checked })
            queryClient.invalidateQueries({ queryKey: ['marketplace-settings'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {checked ? t('onlinePaymentEnabled') : t('onlinePaymentDisabled')}
                </Notification>
            )
        } catch (err) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err.response?.data?.message || t('errorToggling')}
                </Notification>
            )
        } finally {
            setOnlinePaymentToggling(false)
        }
    }

    const createAccountMutation = useMutation({
        mutationFn: createStripeConnectAccount,
        onSuccess: (data) => {
            if (data.url) {
                window.location.href = data.url
            }
        },
        onError: (err) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err.response?.data?.message || t('errorConnecting')}
                </Notification>
            )
        },
    })

    const refreshLinkMutation = useMutation({
        mutationFn: refreshStripeConnectLink,
        onSuccess: (data) => {
            if (data.url) {
                window.location.href = data.url
            }
        },
        onError: (err) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err.response?.data?.message || t('errorRefreshing')}
                </Notification>
            )
        },
    })

    const dashboardMutation = useMutation({
        mutationFn: getStripeDashboardLink,
        onSuccess: (data) => {
            if (data.url) {
                window.open(data.url, '_blank')
            }
        },
        onError: (err) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err.response?.data?.message || t('errorDashboard')}
                </Notification>
            )
        },
    })

    const disconnectMutation = useMutation({
        mutationFn: disconnectStripeAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stripe-connect-status'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('disconnected')}
                </Notification>
            )
        },
        onError: (err) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {err.response?.data?.message || t('errorDisconnecting')}
                </Notification>
            )
        },
    })

    const handleConnect = () => {
        createAccountMutation.mutate()
    }

    const handleContinueOnboarding = () => {
        refreshLinkMutation.mutate()
    }

    const handleOpenDashboard = () => {
        dashboardMutation.mutate()
    }

    const handleDisconnect = () => {
        if (window.confirm(t('confirmDisconnect'))) {
            disconnectMutation.mutate()
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('description')}
                    </p>
                </div>
                <Card>
                    <div className="flex items-center justify-center py-12">
                        <Spinner size={32} />
                    </div>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col gap-4">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('description')}
                    </p>
                </div>
                <Card>
                    <div className="text-center py-12">
                        <PiWarningCircle className="text-4xl text-red-500 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('errorLoading')}
                        </p>
                    </div>
                </Card>
            </div>
        )
    }

    const accountStatus = status?.stripe_account_status || 'none'
    const isConnected = accountStatus === 'active'
    const isPending = accountStatus === 'pending'
    const isRestricted = accountStatus === 'restricted'
    const isDisabled = accountStatus === 'disabled'

    const renderNotConnected = () => (
        <Card>
            <div className="text-center py-12">
                <PiCreditCard className="text-4xl text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('notConnected')}
                </p>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                    {t('connectDescription')}
                </p>
                <Button
                    variant="solid"
                    className="mt-4"
                    icon={<PiCreditCard />}
                    onClick={handleConnect}
                    loading={createAccountMutation.isPending}
                >
                    {t('connectStripe')}
                </Button>
            </div>
        </Card>
    )

    const renderPendingOrRestricted = () => (
        <Card>
            <div className="text-center py-12">
                <PiWarningCircle className="text-4xl text-yellow-500 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {isRestricted ? t('statusRestricted') : t('statusPending')}
                </p>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                    {t('completeOnboarding')}
                </p>
                {status?.requirements?.currently_due?.length > 0 && (
                    <div className="mt-4 text-left max-w-md mx-auto">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            {t('requirementsDue')}:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400">
                            {status.requirements.currently_due.slice(0, 5).map((req, i) => (
                                <li key={i}>{req}</li>
                            ))}
                            {status.requirements.currently_due.length > 5 && (
                                <li>...{t('andMore', { count: status.requirements.currently_due.length - 5 })}</li>
                            )}
                        </ul>
                    </div>
                )}
                <Button
                    variant="solid"
                    className="mt-4"
                    icon={<PiArrowClockwise />}
                    onClick={handleContinueOnboarding}
                    loading={refreshLinkMutation.isPending}
                >
                    {t('continueSetup')}
                </Button>
            </div>
        </Card>
    )

    const renderDisabled = () => (
        <Card>
            <div className="text-center py-12">
                <PiWarningCircle className="text-4xl text-red-500 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {t('statusDisabled')}
                </p>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                    {status?.stripe_disabled_reason
                        ? formatStripeDisabledReason(status.stripe_disabled_reason, t)
                        : t('contactSupport')}
                </p>
                <div className="flex gap-2 justify-center mt-4">
                    <Button
                        variant="default"
                        icon={<PiArrowSquareOut />}
                        onClick={handleOpenDashboard}
                        loading={dashboardMutation.isPending}
                    >
                        {t('openDashboard')}
                    </Button>
                    <Button
                        variant="plain"
                        icon={<PiLinkBreak />}
                        onClick={handleDisconnect}
                        loading={disconnectMutation.isPending}
                    >
                        {t('disconnect')}
                    </Button>
                </div>
            </div>
        </Card>
    )

    const renderConnected = () => (
        <Card>
            <div className="py-6">
                <div className="flex items-center gap-3 mb-6">
                    <PiCheckCircle className="text-3xl text-green-500" />
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {t('statusActive')}
                        </p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('accountConnected')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('payoutsEnabled')}
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {status?.stripe_payouts_enabled ? t('yes') : t('no')}
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('chargesEnabled')}
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                            {status?.stripe_charges_enabled ? t('yes') : t('no')}
                        </p>
                    </div>
                </div>

                {status?.has_active_dispute && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-6">
                        <div className="flex items-center gap-2">
                            <PiWarningCircle className="text-red-500" />
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                {t('activeDispute')}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        variant="solid"
                        icon={<PiArrowSquareOut />}
                        onClick={handleOpenDashboard}
                        loading={dashboardMutation.isPending}
                    >
                        {t('openDashboard')}
                    </Button>
                    <Button
                        variant="plain"
                        icon={<PiLinkBreak />}
                        onClick={handleDisconnect}
                        loading={disconnectMutation.isPending}
                    >
                        {t('disconnect')}
                    </Button>
                </div>
            </div>
        </Card>
    )

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('description')}
                </p>
            </div>

            {accountStatus === 'none' && renderNotConnected()}
            {(isPending || isRestricted) && renderPendingOrRestricted()}
            {isDisabled && renderDisabled()}
            {isConnected && renderConnected()}

            {isConnected && (
                <Card>
                    <div className="py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {t('onlinePaymentTitle')}
                                </p>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {t('onlinePaymentDescription')}
                                </p>
                                {status?.platform_fee_percent != null && (
                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                                        {t('platformFeeNote', { percent: status.platform_fee_percent })}
                                    </p>
                                )}
                            </div>
                            <Switcher
                                checked={marketplaceSettings?.onlinePaymentEnabled ?? false}
                                onChange={toggleOnlinePayment}
                                disabled={onlinePaymentToggling}
                                isLoading={onlinePaymentToggling}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {isConnected && (
                <Card>
                    <div className="py-4 space-y-4">
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {t('cancellationPolicyTitle')}
                            </p>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('cancellationPolicyDescription')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    {t('cancellationFreeHoursLabel')}
                                </p>
                                <Input
                                    type="number"
                                    min={1}
                                    max={168}
                                    value={String(cancellationFreeHours)}
                                    onChange={(e) =>
                                        setCancellationFreeHours(
                                            Math.min(168, Math.max(1, parseInt(e.target.value, 10) || 1))
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    {t('cancellationLateFeePercentLabel')}
                                </p>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={String(cancellationLateFeePercent)}
                                    onChange={(e) =>
                                        setCancellationLateFeePercent(
                                            Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="solid"
                            loading={savingCancellationPolicy}
                            onClick={saveCancellationPolicy}
                        >
                            {t('saveCancellationPolicy')}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    )
}

export default PaymentsTab
