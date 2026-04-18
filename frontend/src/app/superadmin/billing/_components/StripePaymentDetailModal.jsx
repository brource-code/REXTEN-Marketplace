'use client'

import { useMemo } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button/Button'
import Loading from '@/components/shared/Loading'
import StripeSnapshotPanel from './StripeSnapshotPanel'
import { useQuery } from '@tanstack/react-query'
import {
    getConnectPaymentStripeSnapshot,
    getBillingTransactionStripeSnapshot,
} from '@/lib/api/superadmin-billing'
import { useTranslations } from 'next-intl'
import {
    stripePaymentIntentDashboardUrl,
    stripeChargeDashboardUrl,
    stripeCheckoutSessionSearchUrl,
    stripeConnectPaymentDashboardUrl,
} from '@/utils/stripeDashboardUrls'
import { PiArrowSquareOut } from 'react-icons/pi'

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {'connect' | 'platform' | null} props.variant
 * @param {number | null} props.paymentId — Connect
 * @param {string | null} props.checkoutSessionId — платформа
 * @param {string | null} props.stripeConnectAccountId — acct_ для ссылки Connect
 * @param {React.ReactNode} [props.summary] — одна строка контекста (сумма, компания)
 */
export default function StripePaymentDetailModal({
    isOpen,
    onClose,
    variant,
    paymentId,
    checkoutSessionId,
    stripeConnectAccountId,
    summary,
}) {
    const t = useTranslations('superadmin.billing.stripeModal')

    const connectQuery = useQuery({
        queryKey: ['superadmin-connect-payment-stripe-modal', paymentId],
        queryFn: () => getConnectPaymentStripeSnapshot(paymentId),
        enabled: Boolean(isOpen && variant === 'connect' && paymentId != null),
        staleTime: 30_000,
    })

    const platformQuery = useQuery({
        queryKey: ['superadmin-billing-tx-stripe-modal', checkoutSessionId],
        queryFn: () => getBillingTransactionStripeSnapshot(checkoutSessionId),
        enabled: Boolean(isOpen && variant === 'platform' && checkoutSessionId),
        staleTime: 30_000,
    })

    const loading =
        variant === 'connect'
            ? connectQuery.isLoading || connectQuery.isFetching
            : variant === 'platform'
              ? platformQuery.isLoading || platformQuery.isFetching
              : false

    const fetchError = variant === 'connect' ? connectQuery.isError : variant === 'platform' ? platformQuery.isError : false

    const snapshot =
        variant === 'connect' ? connectQuery.data?.stripe : platformQuery.data?.stripe

    const links = useMemo(() => {
        if (!snapshot || typeof snapshot !== 'object') return []
        if (typeof snapshot.error === 'string' && snapshot.error) return []

        if (variant === 'connect') {
            const piId = snapshot.payment_intent?.id
            const chId = snapshot.charge?.id
            const receipt = snapshot.charge?.receipt_url
            const acct = stripeConnectAccountId
            const out = []
            const connectPi = acct && piId ? stripeConnectPaymentDashboardUrl(acct, piId) : null
            if (connectPi) {
                out.push({ key: 'connect', href: connectPi, label: t('linkConnectPayment') })
            }
            const platPi = stripePaymentIntentDashboardUrl(piId)
            if (platPi) {
                out.push({ key: 'pi', href: platPi, label: t('linkPaymentPlatform') })
            }
            const chUrl = stripeChargeDashboardUrl(chId)
            if (chUrl) out.push({ key: 'ch', href: chUrl, label: t('linkCharge') })
            if (receipt) out.push({ key: 'rcpt', href: receipt, label: t('linkReceipt') })
            return out
        }
        if (variant === 'platform') {
            const csId = snapshot.checkout_session?.id ?? checkoutSessionId
            const details = snapshot.payment_intent_details
            const piId = details?.payment_intent?.id
            const chId = details?.charge?.id
            const receipt = details?.charge?.receipt_url
            const out = []
            const sessionSearch = stripeCheckoutSessionSearchUrl(csId)
            if (sessionSearch) out.push({ key: 'sess', href: sessionSearch, label: t('linkSession') })
            const piUrl = stripePaymentIntentDashboardUrl(piId)
            if (piUrl) out.push({ key: 'pi', href: piUrl, label: t('linkPayment') })
            const chUrl = stripeChargeDashboardUrl(chId)
            if (chUrl) out.push({ key: 'ch', href: chUrl, label: t('linkCharge') })
            if (receipt) out.push({ key: 'rcpt', href: receipt, label: t('linkReceipt') })
            return out
        }
        return []
    }, [snapshot, variant, stripeConnectAccountId, checkoutSessionId, t])

    const title =
        variant === 'connect' ? t('titleConnect') : variant === 'platform' ? t('titlePlatform') : ''

    return (
        <Dialog
            isOpen={isOpen && variant != null}
            onClose={onClose}
            width="min(92vw, 640px)"
            contentClassName="flex flex-col p-0 overflow-hidden max-h-[90vh]"
            closable
        >
            <div className="flex flex-col min-h-0 max-h-[90vh]">
                <div className="shrink-0 px-4 sm:px-6 pt-6 pb-3 pr-12 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h4>
                    {summary && (
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">
                            {summary}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
                    {loading && (
                        <div className="flex justify-center py-12">
                            <Loading loading />
                        </div>
                    )}
                    {!loading && fetchError && (
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 text-center py-8">
                            {t('loadFailed')}
                        </p>
                    )}
                    {!loading && !fetchError && snapshot && (
                        <div className="flex flex-col gap-4">
                            {links.length > 0 && (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-3">
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('linksTitle')}
                                    </p>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
                                        {t('hint')}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        {links.map((l) => (
                                            <a
                                                key={l.key}
                                                href={l.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                <PiArrowSquareOut className="shrink-0" size={18} />
                                                {l.label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <StripeSnapshotPanel
                                snapshot={snapshot}
                                variant={variant === 'platform' ? 'platform' : 'connect'}
                                inModal
                            />
                        </div>
                    )}
                </div>
                <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        {t('close')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
