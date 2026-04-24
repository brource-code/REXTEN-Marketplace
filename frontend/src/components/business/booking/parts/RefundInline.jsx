'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AmountInput from '@/components/ui/AmountInput/AmountInput'
import { FormItem } from '@/components/ui/Form'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { refundBookingPayment } from '@/lib/api/stripe'
import { LABEL_CLS, HINT_CLS } from '@/components/business/booking/shared/bookingTypography'

/**
 * Inline-секция возврата платежа в Payment-вкладке BookingDrawer.
 * Никаких модалок поверх модалок: разворачивается прямо в табе.
 */
export default function RefundInline({
    bookingId,
    totalAmount,
    currency = 'USD',
    onRefunded,
    onCancel,
}) {
    const t = useTranslations('business.schedule.payment.refund')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()

    const [reason, setReason] = useState('')
    /** null = не указана (полный возврат), иначе частичная сумма */
    const [refundAmount, setRefundAmount] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const presets = useMemo(() => {
        const total = Number(totalAmount) || 0
        return [
            { key: 'full', label: t('full'), value: total },
            { key: 'half', label: t('half'), value: Math.round(total * 50) / 100 },
            { key: 'quarter', label: t('quarter'), value: Math.round(total * 25) / 100 },
        ]
    }, [totalAmount, t])

    const handleSubmit = async () => {
        setError(null)
        if (!bookingId) return

        const trimmedReason = reason.trim()
        if (!trimmedReason) {
            setError(t('reasonRequired'))
            return
        }

        const payload = { reason: trimmedReason }
        if (refundAmount != null) {
            const n = Number(refundAmount)
            if (Number.isNaN(n) || n <= 0) {
                setError(t('amountInvalid'))
                return
            }
            payload.amount = n
        }

        setSubmitting(true)
        try {
            await refundBookingPayment(bookingId, payload)
            toast.push(
                <Notification type="success" title={tCommon('success')}>
                    {t('success')}
                </Notification>,
                { placement: 'top-end' },
            )
            await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            await queryClient.invalidateQueries({ queryKey: ['booking-payments'] })
            await queryClient.invalidateQueries({ queryKey: ['booking-activities', bookingId] })
            onRefunded?.()
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || t('error')
            setError(String(msg))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/40">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('title')}
            </div>

            <FormItem label={<span className={LABEL_CLS}>{t('amountLabel')}</span>}>
                <div className="flex flex-col gap-2">
                    <AmountInput
                        size="sm"
                        placeholder={t('amountPlaceholder', { currency })}
                        value={refundAmount}
                        onValueChange={setRefundAmount}
                        min={0}
                    />
                    <div className="flex flex-wrap gap-2">
                        {presets.map((p) => (
                            <Button
                                key={p.key}
                                type="button"
                                size="xs"
                                variant="default"
                                onClick={() => setRefundAmount(p.value)}
                            >
                                {p.label}
                            </Button>
                        ))}
                    </div>
                    <div className={HINT_CLS}>
                        {t('amountHint', { total: totalAmount, currency })}
                    </div>
                </div>
            </FormItem>

            <FormItem label={<span className={LABEL_CLS}>{t('reasonLabel')}</span>}>
                <Input
                    size="sm"
                    placeholder={t('reasonPlaceholder')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
            </FormItem>

            {error && (
                <div className="mb-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="default" onClick={onCancel} disabled={submitting}>
                    {tCommon('cancel')}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="solid"
                    color="rose"
                    loading={submitting}
                    onClick={handleSubmit}
                >
                    {t('confirm')}
                </Button>
            </div>
        </div>
    )
}
