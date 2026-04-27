'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePlatformPublicRuntime } from '@/hooks/api/usePlatformPublicRuntime'
import {
    getSubscriptionPlans,
    getCurrentSubscription,
    getSubscriptionUsage,
    createSubscriptionCheckout,
    cancelSubscription,
    resumeSubscription,
    changeSubscriptionPlan,
    cancelScheduledPlanChange,
    getSubscriptionOverLimit,
    resolveSubscriptionLimits,
} from '@/lib/api/stripe'
import { getSubscriptionServerMessage } from '@/utils/subscriptionServerMessage'
import {
    PiCheck,
    PiCrown,
    PiRocketLaunch,
    PiBuildings,
    PiX,
    PiCalendarCheck,
    PiCreditCard,
    PiArrowRight,
    PiCaretDown,
    PiCaretUp,
    PiLightning,
    PiHeadset,
    PiCode,
    PiUsers,
    PiMegaphone,
    PiWrench,
    PiGift,
    PiMapTrifold,
} from 'react-icons/pi'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Checkbox from '@/components/ui/Checkbox'
import { formatDate } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

const planIcons = {
    starter: PiRocketLaunch,
    professional: PiCrown,
    enterprise: PiBuildings,
}

const planColors = {
    starter: {
        border: 'border-blue-500 dark:border-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    professional: {
        border: 'border-indigo-500 dark:border-indigo-600',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        icon: 'text-indigo-600 dark:text-indigo-400',
        button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
    enterprise: {
        border: 'border-amber-500 dark:border-amber-600',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400',
        button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
}

export default function SubscriptionPage() {
    return (
        <PermissionGuard permission="manage_settings">
            <Suspense fallback={<SubscriptionFallback />}>
                <SubscriptionContent />
            </Suspense>
        </PermissionGuard>
    )
}

function SubscriptionFallback() {
    return (
        <Container>
            <AdaptiveCard>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loading loading />
                </div>
            </AdaptiveCard>
        </Container>
    )
}

function SubscriptionContent() {
    const t = useTranslations('business.subscription')
    const tCommon = useTranslations('business.common')
    const tServer = useTranslations('business.subscription.serverMessages')
    const locale = useLocale()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { settings } = useBusinessStore()
    const subscriptionDisplayTz = settings?.timezone || 'America/Los_Angeles'
    const usShortDate = useCallback(
        (iso) => formatDate(iso, subscriptionDisplayTz, 'short'),
        [subscriptionDisplayTz],
    )

    // Локализованное форматирование цены подписки.
    // Дробная часть прячется для целых сумм (например $19, а не $19.00).
    const formatMoney = useCallback(
        (amount, currency = 'USD') => {
            const value = Number(amount) || 0
            const cur = (currency || 'USD').toUpperCase()
            try {
                return new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: cur,
                    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
                    maximumFractionDigits: 2,
                }).format(value)
            } catch {
                return `${value} ${cur}`
            }
        },
        [locale],
    )

    const { data: publicPlatform } = usePlatformPublicRuntime()
    const stripeOn = publicPlatform?.stripePaymentsEnabled !== false

    const [billingInterval, setBillingInterval] = useState('month')
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [successDialogOpen, setSuccessDialogOpen] = useState(false)
    const [paymentInfo, setPaymentInfo] = useState(null)
    const [expandedFaq, setExpandedFaq] = useState(null)
    const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false)
    const [pendingDowngradePlan, setPendingDowngradePlan] = useState(null)
    const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
    const [pendingUpgradePlan, setPendingUpgradePlan] = useState(null)
    const [selectedDeactivate, setSelectedDeactivate] = useState({
        team_member_ids: [],
        company_user_ids: [],
        service_ids: [],
        advertisement_ids: [],
    })

    const { data: plans, isLoading: plansLoading } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: getSubscriptionPlans,
        staleTime: 30 * 60 * 1000,
    })

    const { data: currentSub, isLoading: subLoading } = useQuery({
        queryKey: ['current-subscription'],
        queryFn: getCurrentSubscription,
        staleTime: 60 * 1000,
    })

    const { data: usageData, isLoading: usageLoading } = useQuery({
        queryKey: ['subscription-usage'],
        queryFn: getSubscriptionUsage,
        staleTime: 60 * 1000,
    })

    const { data: overLimitData } = useQuery({
        queryKey: ['subscription-over-limit'],
        queryFn: getSubscriptionOverLimit,
        enabled: Boolean(usageData?.is_over_limit),
        staleTime: 30 * 1000,
    })

    const checkoutMutation = useMutation({
        mutationFn: ({ plan, interval }) => createSubscriptionCheckout(plan, interval),
        onSuccess: (data, variables) => {
            if (data.session_id) {
                localStorage.setItem('sub_checkout_session_id', data.session_id)
                localStorage.setItem('sub_checkout_timestamp', Date.now().toString())
                localStorage.setItem('sub_checkout_plan', variables.plan)
                localStorage.setItem('sub_checkout_interval', variables.interval)
            }
            if (data.checkout_url) {
                window.location.href = data.checkout_url
            }
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {getSubscriptionServerMessage(error.response?.data, tServer, error.message)}
                </Notification>
            )
        },
    })

    const cancelMutation = useMutation({
        mutationFn: cancelSubscription,
        onSuccess: () => {
            const cached = queryClient.getQueryData(['current-subscription'])
            const endRaw = cached?.subscription?.current_period_end
            const endDateStr = endRaw ? usShortDate(endRaw) : null
            queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            setCancelDialogOpen(false)
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {endDateStr
                        ? t('cancelSuccess', { endDate: endDateStr })
                        : t('cancelSuccessNoDate')}
                </Notification>
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {getSubscriptionServerMessage(error.response?.data, tServer, error.message)}
                </Notification>
            )
        },
    })

    const resumeMutation = useMutation({
        mutationFn: resumeSubscription,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('resumeSuccess')}
                </Notification>
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {getSubscriptionServerMessage(error.response?.data, tServer, error.message)}
                </Notification>
            )
        },
    })

    const changePlanMutation = useMutation({
        mutationFn: ({ plan, interval }) => changeSubscriptionPlan(plan, interval),
        onSuccess: (data, variables) => {
            if (data.checkout_url) {
                setUpgradeDialogOpen(false)
                setPendingUpgradePlan(null)
                if (data.session_id) {
                    localStorage.setItem('sub_checkout_session_id', data.session_id)
                    localStorage.setItem('sub_checkout_timestamp', Date.now().toString())
                    localStorage.setItem('sub_checkout_plan', variables.plan)
                    localStorage.setItem('sub_checkout_interval', variables.interval)
                }
                window.location.href = data.checkout_url
                return
            }
            if (data.action === 'downgrade_scheduled') {
                setDowngradeDialogOpen(false)
                setPendingDowngradePlan(null)
                queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
                queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
                toast.push(
                    <Notification title={tCommon('success')} type="success">
                        {getSubscriptionServerMessage(data, tServer, t('downgrade.scheduledSuccess'))}
                    </Notification>
                )
                return
            }
            if (data.action === 'upgraded') {
                setUpgradeDialogOpen(false)
                setPendingUpgradePlan(null)
                queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
                queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
                queryClient.invalidateQueries({ queryKey: ['subscription-over-limit'] })
                toast.push(
                    <Notification title={tCommon('success')} type="success">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {getSubscriptionServerMessage(data, tServer, t('upgradeDialog.defaultSuccess'))}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {t('upgradeDialog.successNote')}
                            </span>
                        </div>
                    </Notification>
                )
            }
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {getSubscriptionServerMessage(error.response?.data, tServer, error.message)}
                </Notification>
            )
        },
    })

    const cancelScheduleMutation = useMutation({
        mutationFn: cancelScheduledPlanChange,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('downgrade.scheduleCanceled')}
                </Notification>
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {getSubscriptionServerMessage(error.response?.data, tServer, error.message)}
                </Notification>
            )
        },
    })

    const resolveLimitsMutation = useMutation({
        mutationFn: (payload) => resolveSubscriptionLimits(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-over-limit'] })
            queryClient.invalidateQueries({ queryKey: ['business-services'] })
            queryClient.invalidateQueries({ queryKey: ['business-team'] })
            setSelectedDeactivate({
                team_member_ids: [],
                company_user_ids: [],
                service_ids: [],
                advertisement_ids: [],
            })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('resolveLimits.success')}
                </Notification>
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {getSubscriptionServerMessage(error.response?.data, tServer, error.message)}
                </Notification>
            )
        },
    })

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const payment = params.get('payment')
        const sessionId = params.get('session_id')

        if (payment === 'success' && sessionId) {
            const saved = localStorage.getItem('sub_checkout_session_id')
            const ts = localStorage.getItem('sub_checkout_timestamp')
            const isRecent = ts && (Date.now() - parseInt(ts)) < 10 * 60 * 1000

            if (saved === sessionId && isRecent) {
                const plan = localStorage.getItem('sub_checkout_plan')
                const interval = localStorage.getItem('sub_checkout_interval')
                setPaymentInfo({ plan, interval })
                setSuccessDialogOpen(true)
                queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
                queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
                queryClient.invalidateQueries({ queryKey: ['subscription-over-limit'] })
            }

            localStorage.removeItem('sub_checkout_session_id')
            localStorage.removeItem('sub_checkout_timestamp')
            localStorage.removeItem('sub_checkout_plan')
            localStorage.removeItem('sub_checkout_interval')
            router.replace('/business/subscription')
        } else if (payment === 'cancelled') {
            localStorage.removeItem('sub_checkout_session_id')
            localStorage.removeItem('sub_checkout_timestamp')
            localStorage.removeItem('sub_checkout_plan')
            localStorage.removeItem('sub_checkout_interval')
            toast.push(
                <Notification title={tCommon('info')} type="warning">
                    {t('paymentCancelled')}
                </Notification>
            )
            router.replace('/business/subscription')
        }
    }, [router, queryClient, t, tCommon])

    const activeSub = currentSub?.subscription
    const isLoading = plansLoading || subLoading

    /** Подставляем месяц/год из подписки, но не во время бесплатного периода — там пользователь сам выбирает год при оплате. */
    useEffect(() => {
        if (!activeSub || activeSub.is_trial) return
        if (activeSub.interval === 'year' || activeSub.interval === 'month') {
            setBillingInterval(activeSub.interval)
        }
    }, [activeSub?.id, activeSub?.interval, activeSub?.is_trial])

    /** Одна строка: план + бесплатный период + сроки (без дубля с баннером). */
    const trialCompactHeadline = useMemo(() => {
        if (!activeSub?.is_trial) return null
        const planName = t(`plans.${activeSub.plan}.name`, { defaultValue: activeSub.plan })
        const period = t('trial.periodShort')
        const bits = []
        if (activeSub.trial_days_left != null) {
            bits.push(t('trial.daysLeft', { days: activeSub.trial_days_left }))
        }
        if (activeSub.trial_ends_at) {
            bits.push(t('trial.endsOn', { date: usShortDate(activeSub.trial_ends_at) }))
        }
        const status = bits.join(' · ')
        return status
            ? t('trial.compactHeadline', { plan: planName, period, status })
            : t('trial.compactHeadlinePlanOnly', { plan: planName, period })
    }, [activeSub, t, usShortDate])

    const handleSubscribe = (planId) => {
        if (!stripeOn) {
            toast.push(
                <Notification title={tCommon('error')} type="warning">
                    {t('stripeDisabled')}
                </Notification>
            )
            return
        }
        checkoutMutation.mutate({ plan: planId, interval: billingInterval })
    }

    const getSortOrder = (planSlug) => {
        if (planSlug === 'free') {
            return 0
        }
        const p = plans?.find((x) => x.id === planSlug)
        return p?.sort_order ?? 0
    }

    const handlePlanAction = (plan) => {
        if (!stripeOn) {
            toast.push(
                <Notification title={tCommon('error')} type="warning">
                    {t('stripeDisabled')}
                </Notification>
            )
            return
        }
        const isCurrent = activeSub?.plan === plan.id
        if (isCurrent) {
            return
        }
        if (!activeSub || activeSub.is_free) {
            handleSubscribe(plan.id)
            return
        }
        const curOrder = getSortOrder(activeSub.plan)
        const tgtOrder = plan.sort_order ?? 0
        if (tgtOrder > curOrder) {
            setPendingUpgradePlan(plan)
            setUpgradeDialogOpen(true)
        } else if (tgtOrder < curOrder) {
            setPendingDowngradePlan(plan)
            setDowngradeDialogOpen(true)
        }
    }

    const downgradeWarnings = useMemo(() => {
        if (!pendingDowngradePlan || !usageData) {
            return []
        }
        const f = pendingDowngradePlan.features
        const w = []
        const tm = f.max_team_members
        if (tm >= 0 && usageData.team_members.current > tm) {
            w.push({
                key: 'teamMembers',
                over: usageData.team_members.current - tm,
            })
        }
        const ms = f.max_services
        if (ms >= 0 && usageData.services.current > ms) {
            w.push({
                key: 'services',
                over: usageData.services.current - ms,
            })
        }
        const ma = f.max_advertisements
        if (ma >= 0 && usageData.advertisements.current > ma) {
            w.push({
                key: 'advertisements',
                over: usageData.advertisements.current - ma,
            })
        }
        return w
    }, [pendingDowngradePlan, usageData])

    const featureRows = useMemo(() => [
        { key: 'max_team_members', label: t('features.teamMembers'), icon: PiUsers },
        { key: 'max_services', label: t('features.services'), icon: PiWrench },
        { key: 'max_advertisements', label: t('features.advertisements'), icon: PiMegaphone },
        {
            key: 'routes_ai_analytics',
            label: t('features.routesAiDispatcherAnalytics'),
            icon: PiMapTrifold,
            resolve: (f) =>
                Boolean(
                    f?.routes &&
                        f?.analytics &&
                        (Number(f?.ai_max_requests_per_month) > 0 ||
                            Number(f?.ai_max_tokens_per_month) > 0),
                ),
        },
        { key: 'api_access', label: t('features.apiAccess'), icon: PiCode },
        { key: 'priority_support', label: t('features.prioritySupport'), icon: PiHeadset },
    ], [t])

    const faqItems = useMemo(() => [
        { q: t('faq.q1'), a: t('faq.a1') },
        { q: t('faq.q2'), a: t('faq.a2') },
        { q: t('faq.q3'), a: t('faq.a3') },
        { q: t('faq.q4'), a: t('faq.a4') },
    ], [t])

    const formatValue = (val) => {
        if (typeof val === 'boolean') return val
        if (val === -1) return t('features.unlimited')
        return val
    }

    const getPlanFeatureValue = (plan, row) => {
        if (row.resolve) {
            return row.resolve(plan.features)
        }
        return plan.features[row.key]
    }

    return (
        <Container>
            <div className="flex flex-col gap-4">
                {/* Заголовок */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-3">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('title')}
                            </h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('description')}
                            </p>
                        </div>

                        {/* Текущая подписка */}
                        {activeSub && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div
                                    className={
                                        activeSub.is_trial
                                            ? 'p-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/15'
                                            : 'p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                                    }
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                    activeSub.is_trial
                                                        ? 'bg-violet-100 dark:bg-violet-900/40'
                                                        : planColors[activeSub.plan]?.bg || 'bg-gray-100 dark:bg-gray-700'
                                                }`}
                                            >
                                                {activeSub.is_trial ? (
                                                    <PiGift className="text-xl text-violet-600 dark:text-violet-300" />
                                                ) : (
                                                    (() => {
                                                        const Icon = planIcons[activeSub.plan] || PiCreditCard
                                                        return (
                                                            <Icon
                                                                className={`text-xl ${planColors[activeSub.plan]?.icon || 'text-gray-600'}`}
                                                            />
                                                        )
                                                    })()
                                                )}
                                            </div>
                                            <div>
                                                {activeSub.is_trial ? (
                                                    <>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            {trialCompactHeadline}
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                            {t('trial.bannerHint')}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            {t('currentPlan')}: {t(`plans.${activeSub.plan}.name`)}
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                                            {activeSub.scheduled_plan && !activeSub.canceled_at ? (
                                                                <>
                                                                    <Tag className="bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200">
                                                                        {t('downgrade.scheduledBadge', {
                                                                            plan: t(`plans.${activeSub.scheduled_plan}.name`),
                                                                        })}
                                                                    </Tag>
                                                                    {activeSub.current_period_end && (
                                                                        <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
                                                                            <PiCalendarCheck size={14} />
                                                                            {t('downgrade.effectiveOn')}{' '}
                                                                            {usShortDate(activeSub.current_period_end)}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : activeSub.cancellation_scheduled || activeSub.canceled_at ? (
                                                                <>
                                                                    <Tag className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                                                                        {t('canceledBadge')}
                                                                    </Tag>
                                                                    {activeSub.current_period_end && (
                                                                        <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
                                                                            <PiCalendarCheck size={14} />
                                                                            {t('activeUntil')}{' '}
                                                                            {usShortDate(activeSub.current_period_end)}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Tag className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                        {t('active')}
                                                                    </Tag>
                                                                    {activeSub.current_period_end && (
                                                                        <span className="flex items-center gap-1">
                                                                            <PiCalendarCheck size={14} />
                                                                            {t('renewsOn')}{' '}
                                                                            {usShortDate(activeSub.current_period_end)}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                {formatMoney(activeSub.price, activeSub.currency)}/{activeSub.interval === 'year' ? t('yr') : t('mo')}
                                            </span>
                                            {!activeSub.is_free &&
                                                (activeSub.cancellation_scheduled ||
                                                    activeSub.canceled_at) && (
                                                    <Button
                                                        variant="solid"
                                                        size="xs"
                                                        className="!bg-emerald-600 hover:!bg-emerald-700 text-white"
                                                        loading={resumeMutation.isPending}
                                                        onClick={() => resumeMutation.mutate()}
                                                    >
                                                        {t('resumeSubscription')}
                                                    </Button>
                                                )}
                                            {!activeSub.is_free &&
                                                activeSub.scheduled_plan &&
                                                !activeSub.canceled_at && (
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        loading={cancelScheduleMutation.isPending}
                                                        onClick={() => cancelScheduleMutation.mutate()}
                                                    >
                                                        {t('downgrade.cancelSchedule')}
                                                    </Button>
                                                )}
                                            {!activeSub.is_free &&
                                                !activeSub.is_trial &&
                                                !activeSub.cancellation_scheduled &&
                                                !activeSub.canceled_at && (
                                                    <Button
                                                        variant="plain"
                                                        size="xs"
                                                        className="text-red-500"
                                                        onClick={() => setCancelDialogOpen(true)}
                                                    >
                                                        {t('cancel')}
                                                    </Button>
                                                )}
                                            {activeSub.is_trial && stripeOn && (
                                                <Button
                                                    variant="solid"
                                                    size="xs"
                                                    icon={<PiArrowRight />}
                                                    loading={
                                                        checkoutMutation.isPending &&
                                                        checkoutMutation.variables?.plan === activeSub.plan
                                                    }
                                                    onClick={() =>
                                                        checkoutMutation.mutate({
                                                            plan: activeSub.plan,
                                                            interval: billingInterval,
                                                        })
                                                    }
                                                >
                                                    {t('trial.bannerCta')}
                                                </Button>
                                            )}
                                            {activeSub.is_free &&
                                                activeSub.previous_plan &&
                                                activeSub.previous_plan !== activeSub.plan && (
                                                    <Button
                                                        variant="solid"
                                                        size="xs"
                                                        loading={checkoutMutation.isPending}
                                                        onClick={() =>
                                                            checkoutMutation.mutate({
                                                                plan: activeSub.previous_plan,
                                                                interval:
                                                                    activeSub.interval || 'month',
                                                            })
                                                        }
                                                    >
                                                        {t('restorePreviousPlan', {
                                                            plan: t(
                                                                `plans.${activeSub.previous_plan}.name`,
                                                                {
                                                                    defaultValue:
                                                                        activeSub.previous_plan,
                                                                },
                                                            ),
                                                        })}
                                                    </Button>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {usageLoading ? (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-center py-3">
                                <Loading loading />
                            </div>
                        ) : usageData ? (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/60 p-3 sm:p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                        {t('usage.title')}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                        {[
                                            {
                                                key: 'team_members',
                                                label: t('features.teamMembers'),
                                            },
                                            {
                                                key: 'services',
                                                label: t('features.services'),
                                            },
                                            {
                                                key: 'advertisements',
                                                label: t('features.advertisements'),
                                            },
                                        ].map(({ key, label }) => {
                                            const row = usageData[key]
                                            const pct =
                                                row.unlimited || !row.limit
                                                    ? 0
                                                    : Math.min(100, (row.current / row.limit) * 100)
                                            return (
                                                <div key={key} className="min-w-0 rounded-md bg-white/70 dark:bg-gray-900/40 px-2 py-1.5 border border-gray-100 dark:border-gray-700/80">
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-tight line-clamp-2">
                                                        {label}
                                                    </div>
                                                    <div className="mt-0.5 text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                                        {row.unlimited
                                                            ? `${row.current} / ${t('usage.unlimited')}`
                                                            : t('usage.of', {
                                                                  current: row.current,
                                                                  limit: row.limit,
                                                              })}
                                                    </div>
                                                    {!row.unlimited && row.limit > 0 ? (
                                                        <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                            <div
                                                                className="h-1 rounded-full bg-primary"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-600 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {t('features.analytics')}{' '}
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {usageData.analytics.allowed
                                                    ? t('usage.included')
                                                    : t('usage.notIncluded')}
                                            </span>
                                        </span>
                                        <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
                                            ·
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 inline-flex items-center gap-1 flex-wrap">
                                            {t('features.apiAccess')}{' '}
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {usageData.api_access.allowed
                                                    ? t('usage.included')
                                                    : t('usage.notIncluded')}
                                            </span>
                                            {usageData.api_access.allowed ? (
                                                <Link
                                                    href="/business/api"
                                                    className="text-xs font-bold text-primary hover:underline ml-1"
                                                >
                                                    {t('apiManageLink')}
                                                </Link>
                                            ) : null}
                                        </span>
                                        <span className="hidden sm:inline text-gray-300 dark:text-gray-600">
                                            ·
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 inline-flex items-center gap-1 flex-wrap">
                                            {t('features.prioritySupport')}{' '}
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {usageData.priority_support.allowed
                                                    ? t('usage.included')
                                                    : t('usage.notIncluded')}
                                            </span>
                                        </span>
                                    </div>
                                    {usageData.ai ? (
                                        <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-600/80 bg-white/60 dark:bg-gray-900/30 p-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                <PiLightning className="h-4 w-4 text-amber-500" aria-hidden />
                                                {t('features.ai')}
                                            </div>
                                            {usageData.ai.allowed ? (
                                                <>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                                                        {usageData.ai.requests_used} / {usageData.ai.requests_limit}
                                                    </div>
                                                    {usageData.ai.requests_limit > 0 ? (
                                                        <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                            <div
                                                                className="h-1 rounded-full bg-amber-500"
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        (usageData.ai.requests_used /
                                                                            usageData.ai.requests_limit) *
                                                                            100,
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    ) : null}
                                                    {usageData.ai.period_end_iso ? (
                                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                                                            {t('aiUsageResets', {
                                                                date: usShortDate(usageData.ai.period_end_iso),
                                                            })}
                                                        </p>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {t('aiUpsellShort')}{' '}
                                                    <Link
                                                        href="/business/subscription"
                                                        className="text-primary font-bold hover:underline"
                                                    >
                                                        {t('aiUpsellLink')}
                                                    </Link>
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </AdaptiveCard>

                {usageData?.is_over_limit ? (
                    <div id="resolve-limits">
                        <AdaptiveCard>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('resolveLimits.title')}
                                    </h4>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                        {t('resolveLimits.description')}
                                    </p>
                                </div>
                                {!overLimitData ? (
                                    <Loading loading />
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {['team_members', 'services', 'advertisements'].map((resKey) => {
                                            const block = overLimitData.resources?.[resKey]
                                            if (!block || block.unlimited || !block.items?.length) {
                                                return null
                                            }
                                            if ((block.over_by ?? 0) <= 0) {
                                                return null
                                            }
                                            const labelKey =
                                                resKey === 'team_members'
                                                    ? 'teamMembers'
                                                    : resKey === 'services'
                                                      ? 'services'
                                                      : 'advertisements'
                                            return (
                                                <div
                                                    key={resKey}
                                                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                                                >
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                                                        {t(`resolveLimits.${labelKey}`)} — {block.current_active} /{' '}
                                                        {block.limit}
                                                    </p>
                                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                                                        {block.items.map((item) => {
                                                            const field =
                                                                item.type === 'team_member'
                                                                    ? 'team_member_ids'
                                                                    : item.type === 'company_user'
                                                                      ? 'company_user_ids'
                                                                      : item.type === 'service'
                                                                        ? 'service_ids'
                                                                        : 'advertisement_ids'
                                                            const id = item.id
                                                            const checked = selectedDeactivate[field].includes(id)
                                                            return (
                                                                <label
                                                                    key={`${item.type}-${id}`}
                                                                    className="flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        onChange={(nextChecked) => {
                                                                            setSelectedDeactivate((prev) => {
                                                                                const arr = [...prev[field]]
                                                                                if (nextChecked) {
                                                                                    if (!arr.includes(id)) {
                                                                                        arr.push(id)
                                                                                    }
                                                                                } else {
                                                                                    return {
                                                                                        ...prev,
                                                                                        [field]: arr.filter(
                                                                                            (x) => x !== id,
                                                                                        ),
                                                                                    }
                                                                                }
                                                                                return { ...prev, [field]: arr }
                                                                            })
                                                                        }}
                                                                    />
                                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                        {item.name || item.email || `#${id}`}
                                                                    </span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="flex">
                                            <Button
                                                variant="solid"
                                                className="w-full sm:w-auto"
                                                loading={resolveLimitsMutation.isPending}
                                                onClick={() =>
                                                    resolveLimitsMutation.mutate({
                                                        deactivate_team_member_ids:
                                                            selectedDeactivate.team_member_ids,
                                                        deactivate_company_user_ids:
                                                            selectedDeactivate.company_user_ids,
                                                        deactivate_service_ids: selectedDeactivate.service_ids,
                                                        deactivate_advertisement_ids:
                                                            selectedDeactivate.advertisement_ids,
                                                    })
                                                }
                                            >
                                                {t('resolveLimits.submit')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AdaptiveCard>
                    </div>
                ) : null}

                {/* Планы — компактные карточки */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {t('choosePlan')}
                            </h4>
                            <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 self-start sm:self-auto">
                                <button
                                    type="button"
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                        billingInterval === 'month'
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                    onClick={() => setBillingInterval('month')}
                                >
                                    {t('monthly')}
                                </button>
                                <button
                                    type="button"
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                                        billingInterval === 'year'
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                    onClick={() => setBillingInterval('year')}
                                >
                                    {t('yearly')}
                                    <span className="text-emerald-600 dark:text-emerald-400">{t('savePercent')}</span>
                                </button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[200px]">
                                <Loading loading />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {plans?.map((plan) => {
                                    const colors = planColors[plan.id] || planColors.starter
                                    const Icon = planIcons[plan.id] || PiCreditCard
                                    const isCurrentPlan = activeSub?.plan === plan.id
                                    const price = billingInterval === 'year' ? plan.price_yearly : plan.price_monthly
                                    const isPopular = plan.id === 'professional' && !activeSub

                                    return (
                                        <div
                                            key={plan.id}
                                            className={`relative p-4 rounded-lg border-2 transition-all ${
                                                isCurrentPlan
                                                    ? `${colors.border} ${colors.bg}`
                                                    : isPopular
                                                    ? `${colors.border} ring-1 ring-indigo-200 dark:ring-indigo-800`
                                                    : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            {isPopular && (
                                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                                    <Tag className={`${colors.badge} text-[10px] px-2 py-0.5`}>
                                                        {t('popular')}
                                                    </Tag>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                                    <Icon className={`text-lg ${colors.icon}`} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {t(`plans.${plan.id}.name`)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-1 mb-2">
                                                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatMoney(price, plan.currency)}</span>
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    /{billingInterval === 'year' ? t('yr') : t('mo')}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                                                {t(`plans.${plan.id}.description`)}
                                            </p>
                                            {isCurrentPlan ? (
                                                <Button variant="outline" size="xs" disabled className="w-full">
                                                    {t('currentPlanBadge')}
                                                </Button>
                                            ) : !activeSub || activeSub.is_free ? (
                                                <Button
                                                    variant="solid"
                                                    size="xs"
                                                    className="w-full"
                                                    icon={<PiArrowRight />}
                                                    loading={checkoutMutation.isPending}
                                                    disabled={!stripeOn}
                                                    onClick={() => handleSubscribe(plan.id)}
                                                >
                                                    {t('subscribe')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="solid"
                                                    size="xs"
                                                    className="w-full"
                                                    icon={<PiArrowRight />}
                                                    loading={
                                                        changePlanMutation.isPending &&
                                                        changePlanMutation.variables?.plan === plan.id
                                                    }
                                                    disabled={!stripeOn}
                                                    onClick={() => handlePlanAction(plan)}
                                                >
                                                    {(() => {
                                                        const cur = getSortOrder(activeSub.plan)
                                                        const tgt = plan.sort_order ?? 0
                                                        if (tgt > cur) {
                                                            return t('upgrade')
                                                        }
                                                        if (tgt < cur) {
                                                            return t('downgrade.cta')
                                                        }
                                                        return t('changePlan')
                                                    })()}
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {!stripeOn && (
                            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                    {t('stripeDisabled')}
                                </p>
                            </div>
                        )}
                    </div>
                </AdaptiveCard>

                {/* Таблица сравнения */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {t('compareTitle')}
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-3 pr-4 font-bold text-gray-500 dark:text-gray-400 w-1/3">
                                            {t('feature')}
                                        </th>
                                        {plans?.map((plan) => (
                                            <th key={plan.id} className="text-center py-3 px-2 font-bold text-gray-900 dark:text-gray-100">
                                                {t(`plans.${plan.id}.name`)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {featureRows.map((row, idx) => {
                                        const RowIcon = row.icon
                                        return (
                                            <tr key={row.key} className={idx < featureRows.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}>
                                                <td className="py-3 pr-4 max-w-[min(100%,20rem)]">
                                                    <div className="flex items-start gap-2">
                                                        <RowIcon
                                                            className="text-gray-400 flex-shrink-0 mt-0.5"
                                                            size={16}
                                                        />
                                                        <span className="font-bold text-gray-700 dark:text-gray-300 min-w-0 break-words leading-snug whitespace-pre-line">
                                                            {row.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                {plans?.map((plan) => {
                                                    const val = getPlanFeatureValue(plan, row)
                                                    const isBool = typeof val === 'boolean'
                                                    return (
                                                        <td key={plan.id} className="text-center py-3 px-2">
                                                            {isBool ? (
                                                                val ? (
                                                                    <PiCheck className="inline text-emerald-500" size={18} />
                                                                ) : (
                                                                    <PiX className="inline text-gray-300 dark:text-gray-600" size={18} />
                                                                )
                                                            ) : (
                                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                                    {formatValue(val)}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </AdaptiveCard>

                {/* Что планируется */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <PiLightning className="text-amber-500" size={20} />
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {t('roadmapTitle')}
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i}</span>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {t(`roadmap.item${i}.title`)}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                            {t(`roadmap.item${i}.desc`)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AdaptiveCard>

                {/* FAQ */}
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {t('faqTitle')}
                        </h4>
                        <div className="flex flex-col gap-2">
                            {faqItems.map((item, idx) => (
                                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <button
                                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                    >
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 pr-4">{item.q}</span>
                                        {expandedFaq === idx ? (
                                            <PiCaretUp className="text-gray-400 flex-shrink-0" size={16} />
                                        ) : (
                                            <PiCaretDown className="text-gray-400 flex-shrink-0" size={16} />
                                        )}
                                    </button>
                                    {expandedFaq === idx && (
                                        <div className="px-3 pb-3">
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{item.a}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </AdaptiveCard>
            </div>

            <Dialog
                isOpen={upgradeDialogOpen}
                onClose={() => {
                    setUpgradeDialogOpen(false)
                    setPendingUpgradePlan(null)
                }}
                width={480}
            >
                <div className="p-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('upgradeDialog.title')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                        {t('upgradeDialog.intro')}
                    </p>
                    {activeSub && pendingUpgradePlan && (
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                            {t('upgradeDialog.fromTo', {
                                from: t(`plans.${activeSub.plan}.name`),
                                to: t(`plans.${pendingUpgradePlan.id}.name`),
                            })}
                        </p>
                    )}
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4">
                        {t('upgradeDialog.note')}
                    </p>
                    <div className="flex gap-3 mt-2">
                        <Button
                            variant="plain"
                            className="flex-1"
                            onClick={() => {
                                setUpgradeDialogOpen(false)
                                setPendingUpgradePlan(null)
                            }}
                        >
                            {t('upgradeDialog.cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            className="flex-1"
                            loading={changePlanMutation.isPending}
                            onClick={() => {
                                if (pendingUpgradePlan) {
                                    changePlanMutation.mutate({
                                        plan: pendingUpgradePlan.id,
                                        interval: billingInterval,
                                    })
                                }
                            }}
                        >
                            {t('upgradeDialog.confirm')}
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog
                isOpen={downgradeDialogOpen}
                onClose={() => {
                    setDowngradeDialogOpen(false)
                    setPendingDowngradePlan(null)
                }}
                width={480}
            >
                <div className="p-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('downgrade.dialogTitle')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                        {t('downgrade.dialogIntro')}
                    </p>
                    {activeSub?.current_period_end && (
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
                            {t('downgrade.effectiveOn')}:{' '}
                            {usShortDate(activeSub.current_period_end)}
                        </p>
                    )}
                    {pendingDowngradePlan && (
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {t(`plans.${pendingDowngradePlan.id}.name`)}
                        </p>
                    )}
                    {downgradeWarnings.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 mb-4">
                            {downgradeWarnings.map((w) => (
                                <li
                                    key={w.key}
                                    className="text-sm font-bold text-gray-700 dark:text-gray-300"
                                >
                                    {t('downgrade.warningLine', {
                                        resource: t(`resolveLimits.${w.key}`),
                                        count: w.over,
                                    })}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    <div className="flex gap-3 mt-2">
                        <Button
                            variant="plain"
                            className="flex-1"
                            onClick={() => {
                                setDowngradeDialogOpen(false)
                                setPendingDowngradePlan(null)
                            }}
                        >
                            {t('downgrade.cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            className="flex-1"
                            loading={changePlanMutation.isPending}
                            onClick={() => {
                                if (pendingDowngradePlan) {
                                    changePlanMutation.mutate({
                                        plan: pendingDowngradePlan.id,
                                        interval: billingInterval,
                                    })
                                }
                            }}
                        >
                            {t('downgrade.confirm')}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Диалог отмены */}
            <Dialog
                isOpen={cancelDialogOpen}
                onClose={() => setCancelDialogOpen(false)}
                width={440}
            >
                <div className="p-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('cancelDialog.title')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">
                        {activeSub?.current_period_end
                            ? t('cancelDialog.message', {
                                  endDate: usShortDate(activeSub.current_period_end),
                              })
                            : t('cancelDialog.messageNoEnd')}
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="plain"
                            className="flex-1"
                            onClick={() => setCancelDialogOpen(false)}
                        >
                            {t('cancelDialog.keep')}
                        </Button>
                        <Button
                            variant="solid"
                            color="red"
                            className="flex-1"
                            loading={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate()}
                        >
                            {t('cancelDialog.confirm')}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Диалог успешной оплаты */}
            <Dialog
                isOpen={successDialogOpen}
                onClose={() => setSuccessDialogOpen(false)}
                width={440}
            >
                <div className="p-4 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <PiCheck className="text-2xl text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('successDialog.title')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                        {t('successDialog.message')}
                    </p>
                    {paymentInfo && (
                        <Tag className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {t(`plans.${paymentInfo.plan}.name`)} — {paymentInfo.interval === 'year' ? t('yearly') : t('monthly')}
                        </Tag>
                    )}
                    <div className="mt-6">
                        <Button
                            variant="solid"
                            className="w-full"
                            onClick={() => setSuccessDialogOpen(false)}
                        >
                            {t('successDialog.close')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Container>
    )
}
