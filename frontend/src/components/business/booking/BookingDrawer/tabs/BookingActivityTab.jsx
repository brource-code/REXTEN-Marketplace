'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { getBookingActivities, addBookingComment } from '@/lib/api/business'
import { LABEL_CLS, HINT_CLS, MUTED_CLS } from '@/components/business/booking/shared/bookingTypography'

function formatActivityTime(iso) {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch (_e) {
        return ''
    }
}

function ActivityItem({ item, t }) {
    const author = item.actor?.name || t('systemActor')
    const ts = formatActivityTime(item.created_at)

    let summary = ''
    const p = item.payload || {}
    switch (item.type) {
        case 'created':
            summary = t('typeCreated')
            break
        case 'deleted':
            summary = t('typeDeleted')
            break
        case 'status_changed':
            summary = t('typeStatusChanged', { from: p.from || '—', to: p.to || '—' })
            break
        case 'rescheduled':
            summary = t('typeRescheduled')
            break
        case 'price_changed':
            summary = t('typePriceChanged', {
                from: p.from?.total_price ?? p.from?.price ?? '—',
                to: p.to?.total_price ?? p.to?.price ?? '—',
            })
            break
        case 'payment_authorized':
            summary = t('typePaymentAuthorized')
            break
        case 'payment_captured':
            summary = t('typePaymentCaptured', { amount: p.total_price ?? '—' })
            break
        case 'payment_refunded':
            summary = t('typePaymentRefunded')
            break
        case 'comment':
            summary = p.text || ''
            break
        default:
            summary = item.type
    }

    return (
        <li className="border-l-2 border-gray-200 dark:border-gray-700 pl-3 pb-3">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {summary}
            </div>
            <div className={MUTED_CLS}>
                {author} · {ts}
            </div>
        </li>
    )
}

export default function BookingActivityTab({ bookingId }) {
    const t = useTranslations('business.schedule.activity')
    const queryClient = useQueryClient()
    const [comment, setComment] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['booking-activities', bookingId],
        queryFn: () => getBookingActivities(bookingId),
        enabled: !!bookingId,
    })

    const mutation = useMutation({
        mutationFn: (text) => addBookingComment(bookingId, text),
        onSuccess: () => {
            setComment('')
            queryClient.invalidateQueries({ queryKey: ['booking-activities', bookingId] })
        },
    })

    if (!bookingId) {
        return (
            <div className={`p-3 ${HINT_CLS}`}>
                {t('emptyForNew')}
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-6">
                <Spinner />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                {t('loadError')}
            </div>
        )
    }

    const items = data || []

    return (
        <div className="flex flex-col gap-3">
            <div>
                <div className={`mb-1 ${LABEL_CLS}`}>{t('comment')}</div>
                <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('placeholder')}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                />
                <div className="mt-1 flex justify-end">
                    <Button
                        size="xs"
                        variant="solid"
                        loading={mutation.isPending}
                        disabled={!comment.trim()}
                        onClick={() => mutation.mutate(comment.trim())}
                    >
                        {t('post')}
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className={`text-center py-4 ${HINT_CLS}`}>{t('empty')}</div>
            ) : (
                <ul className="flex flex-col gap-1">
                    {items.map((item) => (
                        <ActivityItem key={item.id} item={item} t={t} />
                    ))}
                </ul>
            )}
        </div>
    )
}
