'use client'

import { useTranslations } from 'next-intl'
import { HiExclamation } from 'react-icons/hi'

/**
 * Показывает предупреждение об overlap'е с другими бронированиями
 * текущего специалиста. Не блокирует сохранение, но даёт понять контекст.
 */
export default function BookingConflictHint({ conflicts = [], specialistName }) {
    const t = useTranslations('business.schedule.drawer.conflict')
    if (!conflicts || conflicts.length === 0) return null

    return (
        <div className="mt-2 flex gap-2 items-start rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2">
            <HiExclamation className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="text-xs font-bold text-amber-800 dark:text-amber-200">
                <div>
                    {specialistName
                        ? t('withSpecialist', { name: specialistName, count: conflicts.length })
                        : t('title', { count: conflicts.length })}
                </div>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    {conflicts.slice(0, 3).map((c) => {
                        const name =
                            c.title ||
                            c?.service?.name ||
                            c?.client?.name ||
                            c.client_name ||
                            '—'
                        const time = (() => {
                            const d = new Date(c.start)
                            if (Number.isNaN(d.getTime())) return ''
                            const pad = (n) => String(n).padStart(2, '0')
                            return `${pad(d.getHours())}:${pad(d.getMinutes())}`
                        })()
                        return (
                            <li key={c.id}>
                                {time} · {name}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
