'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { captureBookingPayment } from '@/lib/api/stripe'
import RefundInline from '@/components/business/booking/parts/RefundInline'
import { LABEL_CLS, VALUE_CLS, HINT_CLS } from '@/components/business/booking/shared/bookingTypography'
import { formatCurrency } from '@/utils/formatCurrency'

function statusTagClass(status) {
    switch (status) {
        case 'paid':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        case 'authorized':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        case 'refunded':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
        default:
            return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
}

export default function BookingPaymentTab({ slot, currency = 'USD', onUpdated }) {
    const t = useTranslations('business.schedule.payment')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()

    const [refundOpen, setRefundOpen] = useState(false)
    const [capturing, setCapturing] = useState(false)

    const paymentStatus = slot?.payment_status || 'none'
    const totalAmount = Number(slot?.total_price ?? slot?.price ?? 0) || 0

    const handleCapture = async () => {
        if (!slot?.id) return
        setCapturing(true)
        try {
            await captureBookingPayment(slot.id)
            toast.push(
                <Notification type="success" title={tCommon('success')}>
                    {t('captureSuccess')}
                </Notification>,
                { placement: 'top-end' },
            )
            await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            await queryClient.invalidateQueries({ queryKey: ['booking-payments'] })
            await queryClient.invalidateQueries({ queryKey: ['booking-activities', slot.id] })
            onUpdated?.()
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || t('captureError')
            toast.push(
                <Notification type="danger" title={tCommon('error')}>
                    {String(msg)}
                </Notification>,
                { placement: 'top-end' },
            )
        } finally {
            setCapturing(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <div className={LABEL_CLS}>{t('statusLabel')}</div>
                    <div className="mt-1">
                        <Tag className={statusTagClass(paymentStatus)}>
                            {t(`statuses.${paymentStatus}`, { defaultValue: paymentStatus })}
                        </Tag>
                    </div>
                </div>
                <div className="text-right">
                    <div className={LABEL_CLS}>{t('amountLabel')}</div>
                    <div className={`mt-1 ${VALUE_CLS}`}>
                        {formatCurrency(totalAmount, currency)}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {paymentStatus === 'authorized' && (
                    <Button
                        size="sm"
                        variant="solid"
                        loading={capturing}
                        onClick={handleCapture}
                    >
                        {t('captureNow')}
                    </Button>
                )}
                {(paymentStatus === 'paid' || paymentStatus === 'authorized') && (
                    <Button
                        size="sm"
                        variant="default"
                        color="rose"
                        onClick={() => setRefundOpen((v) => !v)}
                    >
                        {refundOpen ? tCommon('cancel') : t('refundAction')}
                    </Button>
                )}
            </div>

            {paymentStatus === 'none' && (
                <div className={HINT_CLS}>{t('noneHint')}</div>
            )}

            {refundOpen && (
                <RefundInline
                    bookingId={slot.id}
                    totalAmount={totalAmount}
                    currency={currency}
                    onCancel={() => setRefundOpen(false)}
                    onRefunded={() => {
                        setRefundOpen(false)
                        onUpdated?.()
                    }}
                />
            )}
        </div>
    )
}
