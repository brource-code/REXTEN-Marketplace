'use client'

import { useTranslations } from 'next-intl'

/**
 * @param {import('@/lib/api/superadmin-billing').StripeConnectApiSnapshot | import('@/lib/api/superadmin-billing').StripeCheckoutSessionApiSnapshot | null | undefined} snapshot
 * @param {'connect' | 'platform'} variant
 * @param {boolean} [inModal] — без лишних отступов, больше места под JSON
 */
export default function StripeSnapshotPanel({ snapshot, variant = 'connect', inModal = false }) {
    const t = useTranslations('superadmin.billing.stripeSnapshot')

    if (snapshot == null) {
        return null
    }

    const isNoPaymentIntent =
        snapshot.error_code === 'no_payment_intent' || snapshot.error === 'no_payment_intent'
    if (isNoPaymentIntent) {
        return (
            <div
                className={`rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 ${inModal ? '' : 'mt-2'}`}
            >
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('missingPaymentIntentTitle')}</p>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('missingPaymentIntentBody')}</p>
            </div>
        )
    }

    if (typeof snapshot.error === 'string' && snapshot.error) {
        return (
            <div
                className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 ${inModal ? '' : 'mt-2'}`}
            >
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    {t('stripeError')}: {snapshot.error}
                </p>
            </div>
        )
    }

    if (variant === 'platform' && snapshot.checkout_session) {
        const piDetails = snapshot.payment_intent_details
        return (
            <div
                className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2 space-y-2 ${inModal ? '' : 'mt-2'}`}
            >
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('titlePlatform')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('sessionId')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100 break-all">
                            {String(snapshot.checkout_session.id ?? '—')}
                        </div>
                    </div>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('paymentStatus')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {String(snapshot.checkout_session.payment_status ?? '—')}
                        </div>
                    </div>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('mode')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {String(snapshot.checkout_session.mode ?? '—')}
                        </div>
                    </div>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('customer')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100 break-all">
                            {String(snapshot.checkout_session.customer ?? '—')}
                        </div>
                    </div>
                </div>
                {piDetails && !piDetails.error && (
                    <ConnectInnerDetails t={t} pi={piDetails} />
                )}
                <details className="text-sm">
                    <summary className="cursor-pointer font-bold text-gray-500 dark:text-gray-400">
                        {t('rawJson')}
                    </summary>
                    <pre
                        className={`mt-2 overflow-auto text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all ${inModal ? 'max-h-[min(50vh,320px)]' : 'max-h-48'}`}
                    >
                        {JSON.stringify(snapshot, null, 2)}
                    </pre>
                </details>
            </div>
        )
    }

    return (
        <div
            className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-3 py-2 space-y-2 ${inModal ? '' : 'mt-2'}`}
        >
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('titleConnect')}</p>
            <ConnectInnerDetails t={t} pi={snapshot} />
            <details className="text-sm">
                <summary className="cursor-pointer font-bold text-gray-500 dark:text-gray-400">{t('rawJson')}</summary>
                <pre
                    className={`mt-2 overflow-auto text-xs font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-all ${inModal ? 'max-h-[min(50vh,320px)]' : 'max-h-48'}`}
                >
                    {JSON.stringify(snapshot, null, 2)}
                </pre>
            </details>
        </div>
    )
}

function ConnectInnerDetails({ t, pi }) {
    const p = pi.payment_intent ?? {}
    const ch = pi.charge
    const bt = pi.balance_transaction

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
                <span className="font-bold text-gray-500 dark:text-gray-400">{t('piId')}</span>
                <div className="font-bold text-gray-900 dark:text-gray-100 break-all">{String(p.id ?? '—')}</div>
            </div>
            <div>
                <span className="font-bold text-gray-500 dark:text-gray-400">{t('piStatus')}</span>
                <div className="font-bold text-gray-900 dark:text-gray-100">{String(p.status ?? '—')}</div>
            </div>
            <div>
                <span className="font-bold text-gray-500 dark:text-gray-400">{t('captureMethod')}</span>
                <div className="font-bold text-gray-900 dark:text-gray-100">{String(p.capture_method ?? '—')}</div>
            </div>
            <div>
                <span className="font-bold text-gray-500 dark:text-gray-400">{t('amounts')}</span>
                <div className="font-bold text-gray-900 dark:text-gray-100">
                    {p.amount != null ? String(p.amount) : '—'} / {p.amount_received != null ? String(p.amount_received) : '—'}{' '}
                    {p.currency ? String(p.currency) : ''}
                </div>
            </div>
            {ch && (
                <>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('chargeId')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100 break-all">{String(ch.id ?? '—')}</div>
                    </div>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('transferId')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100 break-all">
                            {String(ch.transfer ?? '—')}
                        </div>
                    </div>
                </>
            )}
            {bt && (
                <>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('stripeFee')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{bt.fee != null ? String(bt.fee) : '—'}</div>
                    </div>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('net')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{bt.net != null ? String(bt.net) : '—'}</div>
                    </div>
                    <div>
                        <span className="font-bold text-gray-500 dark:text-gray-400">{t('btType')}</span>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{String(bt.type ?? '—')}</div>
                    </div>
                </>
            )}
        </div>
    )
}
