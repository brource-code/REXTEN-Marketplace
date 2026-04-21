'use client'

import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Tag from '@/components/ui/Tag'
import CloseButton from '@/components/ui/CloseButton'
import { TITLE_CLS, MUTED_CLS } from '@/components/business/booking/shared/bookingTypography'

function statusTagClass(status) {
    switch (status) {
        case 'new':
            return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
        case 'pending':
            return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
        case 'confirmed':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        case 'completed':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        case 'cancelled':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
        default:
            return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
}

export default function BookingDrawerHeader({
    slot,
    isCustomEvent,
    onClose,
}) {
    const t = useTranslations('business.schedule.drawer.header')
    const tStatuses = useTranslations('business.schedule.statuses')

    const title = isCustomEvent
        ? slot?.title || t('blockEvent')
        : slot?.service?.name || slot?.title || t('booking')

    const start = slot?.start ? dayjs(slot.start) : null
    let dateLabel = ''
    let timeLabel = ''
    if (start?.isValid()) {
        dateLabel = start.format('ddd, DD MMM')
        timeLabel = start.format('HH:mm')
    } else {
        if (slot?.booking_date) dateLabel = dayjs(slot.booking_date).format('ddd, DD MMM')
        if (slot?.booking_time) timeLabel = String(slot.booking_time).substring(0, 5)
    }
    const status = slot?.status || 'new'

    const clientName = slot?.client?.name || slot?.client_name
    const specialistName = slot?.specialist?.name

    return (
        <div className="flex shrink-0 items-start gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`${TITLE_CLS} truncate`}>{title}</h4>
                    <Tag className={statusTagClass(status)}>
                        {tStatuses(status, { defaultValue: status })}
                    </Tag>
                    {isCustomEvent && (
                        <Tag className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            {t('blockTag')}
                        </Tag>
                    )}
                </div>
                <div className={`mt-1 ${MUTED_CLS}`}>
                    {[dateLabel, timeLabel, clientName, specialistName]
                        .filter(Boolean)
                        .join(' · ')}
                </div>
            </div>
            <CloseButton onClick={onClose} />
        </div>
    )
}
