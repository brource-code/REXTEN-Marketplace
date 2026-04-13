'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useTranslations } from 'next-intl'
import Spinner from '@/components/ui/Spinner'
import { getBookingPaymentEligibility } from '@/lib/api/stripe'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function subscribeDarkMode(callback) {
    if (typeof document === 'undefined') {
        return () => {}
    }
    const el = document.documentElement
    const obs = new MutationObserver(() => callback())
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
}

function getDarkSnapshot() {
    return document.documentElement.classList.contains('dark')
}

function useAppDarkMode() {
    return useSyncExternalStore(subscribeDarkMode, getDarkSnapshot, () => false)
}

function PaymentForm({ bookingId, clientEmail, onSuccess, onError, amount, currency }) {
    const stripe = useStripe()
    const elements = useElements()
    const t = useTranslations('components.bookingDialog.payment')
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState(null)

    const runPaymentAttempt = async () => {
        if (!stripe || !elements) return

        setProcessing(true)
        setError(null)

        try {
            const elig = await getBookingPaymentEligibility(bookingId, clientEmail)
            if (!elig.can_pay) {
                const msg = elig.message || t('bookingExpired')
                setError(msg)
                setProcessing(false)
                if (onError) onError(msg)
                return
            }

            const { error: submitError } = await elements.submit()
            if (submitError) {
                setError(submitError.message)
                setProcessing(false)
                return
            }

            const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            })

            if (confirmError) {
                setError(confirmError.message)
                setProcessing(false)
                if (onError) onError(confirmError.message)
                return
            }

            if (paymentIntent?.status === 'processing') {
                const msg = t('processingStatus')
                setError(msg)
                setProcessing(false)
                if (onError) onError(msg)
                return
            }

            if (paymentIntent && (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded')) {
                if (onSuccess) onSuccess(paymentIntent)
                return
            }

            setError(t('unexpectedStatus'))
            setProcessing(false)
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || t('unexpectedStatus')
            setError(msg)
            setProcessing(false)
            if (onError) onError(msg)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        await runPaymentAttempt()
    }

    const formatAmount = (cents) => {
        const dollars = (cents / 100).toFixed(2)
        return currency === 'usd' ? `$${dollars}` : `${dollars} ${currency?.toUpperCase()}`
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-gray-800/80 dark:border-gray-600 p-3 space-y-2">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('paymentNote')}</p>
                {amount ? (
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatAmount(amount)}</p>
                ) : null}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/90 p-3 -mx-0">
                <PaymentElement options={{ layout: 'tabs' }} />
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                    <button
                        type="button"
                        onClick={() => runPaymentAttempt()}
                        disabled={processing}
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                        {t('retryPay')}
                    </button>
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || processing}
                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {processing ? (
                    <span className="flex items-center justify-center gap-2">
                        <Spinner size={18} />
                        {t('processing')}
                    </span>
                ) : (
                    t('payButton')
                )}
            </button>
        </form>
    )
}

function buildStripeAppearance(isDark) {
    if (isDark) {
        return {
            theme: 'night',
            variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#1f2937',
                colorText: '#f9fafb',
                colorTextSecondary: '#9ca3af',
                colorTextPlaceholder: '#6b7280',
                colorDanger: '#f87171',
                colorIcon: '#9ca3af',
                borderRadius: '8px',
                fontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
                spacingUnit: '3px',
            },
            rules: {
                '.Input': {
                    borderColor: '#4b5563',
                    backgroundColor: '#111827',
                    boxShadow: 'none',
                },
                '.Input:focus': {
                    borderColor: '#3b82f6',
                    boxShadow: '0 0 0 1px #3b82f6',
                },
                '.Label': {
                    color: '#d1d5db',
                },
                '.Tab': {
                    borderColor: '#4b5563',
                },
                '.Tab--selected': {
                    borderColor: '#3b82f6',
                    backgroundColor: '#1e3a5f',
                },
            },
        }
    }
    return {
        theme: 'stripe',
        variables: {
            colorPrimary: '#2563eb',
            borderRadius: '8px',
            fontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
        },
    }
}

export default function BookingPayment({ bookingId, clientSecret, clientEmail, amount, currency, onSuccess, onError }) {
    const isDark = useAppDarkMode()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!clientSecret || !bookingId) return null

    const appearance = buildStripeAppearance(mounted && isDark)

    const options = {
        clientSecret,
        appearance,
    }

    return (
        <Elements key={mounted ? (isDark ? 'dark' : 'light') : 'ssr'} stripe={stripePromise} options={options}>
            <PaymentForm
                bookingId={bookingId}
                clientEmail={clientEmail}
                onSuccess={onSuccess}
                onError={onError}
                amount={amount}
                currency={currency}
            />
        </Elements>
    )
}
