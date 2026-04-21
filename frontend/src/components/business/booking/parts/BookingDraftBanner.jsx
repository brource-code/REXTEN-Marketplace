'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { HiOutlineDocumentDuplicate } from 'react-icons/hi'

function formatTime(ts) {
    if (!ts) return ''
    try {
        const d = new Date(ts)
        const pad = (n) => String(n).padStart(2, '0')
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch (_e) {
        return ''
    }
}

/**
 * Баннер о восстановленном черновике (время сохранения + сброс).
 * Данные формы уже подставлены из draft при открытии мастера.
 */
export default function BookingDraftBanner({
    visible,
    savedAt,
    onDiscard,
}) {
    const t = useTranslations('business.schedule.wizard.draftBanner')
    if (!visible) return null

    return (
        <div className="mb-3 rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 flex items-center gap-3">
            <HiOutlineDocumentDuplicate className="h-5 w-5 text-blue-600 dark:text-blue-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    {t('title', { time: formatTime(savedAt) })}
                </div>
                <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {t('subtitleRestored')}
                </div>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button size="xs" variant="default" onClick={onDiscard}>
                    {t('discard')}
                </Button>
            </div>
        </div>
    )
}
