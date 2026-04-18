'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

function PaymentStatusInner() {
    const t = useTranslations('components.paymentStatus')
    const searchParams = useSearchParams()
    const clientSecret = searchParams.get('payment_intent_client_secret')
    const bookingId = searchParams.get('booking_id')
    const redirectStatus = searchParams.get('redirect_status')

    const [status, setStatus] = useState('loading')
    const [message, setMessage] = useState(null)
    const [piStatus, setPiStatus] = useState(null)

    useEffect(() => {
        let cancelled = false

        async function run() {
            if (!clientSecret) {
                setStatus('no_secret')
                setMessage(t('missingParams'))
                return
            }

            try {
                const stripe = await stripePromise
                if (!stripe) {
                    setStatus('error')
                    setMessage(t('stripeLoadFailed'))
                    return
                }

                const { error, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret)

                if (cancelled) return

                if (error) {
                    setStatus('error')
                    setMessage(error.message || t('retrieveFailed'))
                    return
                }

                setPiStatus(paymentIntent?.status ?? null)

                if (
                    paymentIntent?.status === 'requires_capture' ||
                    paymentIntent?.status === 'succeeded'
                ) {
                    setStatus('success')
                    return
                }

                if (paymentIntent?.status === 'processing') {
                    setStatus('processing')
                    return
                }

                if (redirectStatus === 'failed' || paymentIntent?.status === 'requires_payment_method') {
                    setStatus('failed')
                    setMessage(t('paymentFailed'))
                    return
                }

                setStatus('unknown')
                setMessage(t('unexpectedStatus', { status: paymentIntent?.status || '—' }))
            } catch (e) {
                if (!cancelled) {
                    setStatus('error')
                    setMessage(e?.message || t('retrieveFailed'))
                }
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [clientSecret, redirectStatus, t])

    const title =
        status === 'success'
            ? t('titleSuccess')
            : status === 'processing'
              ? t('titleProcessing')
              : status === 'failed' || status === 'error'
                ? t('titleError')
                : status === 'no_secret'
                  ? t('titleMissing')
                  : t('titleUnknown')

    return (
        <Container className="py-10">
            <Card className="max-w-lg mx-auto p-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h4>
                {status === 'loading' && (
                    <div className="flex items-center gap-2 py-6">
                        <Spinner size={24} />
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</p>
                    </div>
                )}
                {bookingId && status !== 'loading' && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                        {t('bookingRef', { id: bookingId })}
                    </p>
                )}
                {piStatus && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">
                        {t(`piFriendly.${piStatus}`, {
                            defaultValue:
                                status === 'unknown' || status === 'error'
                                    ? t('unexpectedStatus', { status: piStatus })
                                    : t('piStatus', { status: piStatus }),
                        })}
                    </p>
                )}
                {message && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{message}</p>
                )}
                {status === 'success' && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">{t('successHint')}</p>
                )}
                {status === 'processing' && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">{t('processingHint')}</p>
                )}
                <Link href="/booking">
                    <Button variant="solid" className="w-full">
                        {t('backToBookings')}
                    </Button>
                </Link>
            </Card>
        </Container>
    )
}

export default function PaymentStatusPage() {
    const t = useTranslations('components.paymentStatus')
    return (
        <Suspense
            fallback={
                <Container className="py-10">
                    <Card className="max-w-lg mx-auto p-6 flex items-center gap-2">
                        <Spinner size={24} />
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</span>
                    </Card>
                </Container>
            }
        >
            <PaymentStatusInner />
        </Suspense>
    )
}
