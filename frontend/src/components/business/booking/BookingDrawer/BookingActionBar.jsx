'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import {
    HiOutlineCheck,
    HiOutlineTrash,
    HiOutlineCalendar,
    HiOutlineClipboardCheck,
    HiOutlineX,
} from 'react-icons/hi'

export default function BookingActionBar({
    slot,
    isCustomEvent,
    onReschedule,
    onConfirm,
    onComplete,
    onCancel,
    onDelete,
    saving = false,
}) {
    const t = useTranslations('business.schedule.drawer.actions')
    const tDrawer = useTranslations('business.schedule.drawer')
    const status = slot?.status || 'new'

    const showConfirm = !isCustomEvent && (status === 'new' || status === 'pending')
    const showComplete = !isCustomEvent && (status === 'confirmed' || status === 'pending')
    const showCancel = !isCustomEvent && status !== 'cancelled' && status !== 'completed'

    return (
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                {tDrawer('actionsSectionTitle')}
            </p>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-2 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
                <div className="flex flex-wrap gap-2 flex-1 min-w-0 sm:pr-3">
                    <Button size="sm" variant="default" icon={<HiOutlineCalendar />} onClick={onReschedule} disabled={saving}>
                        {t('reschedule')}
                    </Button>
                    {showConfirm && (
                        <Button size="sm" variant="solid" icon={<HiOutlineCheck />} onClick={onConfirm} disabled={saving}>
                            {t('confirm')}
                        </Button>
                    )}
                    {showComplete && (
                        <Button
                            size="sm"
                            variant="solid"
                            icon={<HiOutlineClipboardCheck />}
                            onClick={onComplete}
                            disabled={saving}
                        >
                            {t('complete')}
                        </Button>
                    )}
                    {showCancel && (
                        <Button size="sm" variant="default" icon={<HiOutlineX />} onClick={onCancel} disabled={saving}>
                            {t('cancelBooking')}
                        </Button>
                    )}
                </div>
                <div
                    className="hidden sm:block w-px shrink-0 bg-gray-200 dark:bg-gray-600 self-stretch min-h-[2.25rem]"
                    aria-hidden
                />
                <div className="flex pt-2 border-t border-gray-100 dark:border-gray-700 sm:pt-0 sm:border-t-0 sm:pl-3 sm:border-l sm:border-gray-200 dark:sm:border-gray-600">
                    <Button
                        size="sm"
                        variant="default"
                        color="rose"
                        className="w-full sm:w-auto"
                        icon={<HiOutlineTrash />}
                        onClick={onDelete}
                        disabled={saving}
                    >
                        {t('deleteBooking')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
