'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { HINT_CLS } from '@/components/business/booking/shared/bookingTypography'
import { TIME_FORMAT_12H, formatTime } from '@/utils/timeFormat'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function formatLabel(t, dateStr, timeStr, format) {
    const displayTime = formatTime(timeStr, format) || timeStr

    const todayStr = (() => {
        const d = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })()
    const tomorrowStr = (() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })()

    if (dateStr === todayStr) return `${t('today')} ${displayTime}`
    if (dateStr === tomorrowStr) return `${t('tomorrow')} ${displayTime}`

    const date = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(date.getTime())) return `${dateStr} ${displayTime}`
    const day = t(`dayShort.${DAY_NAMES[date.getDay()]}`, { defaultValue: '' })
    return `${day} ${displayTime}`
}

/**
 * Рендерит кнопки-чипы с ближайшими свободными окнами.
 * onPick({ date, time }) подставляет в форму.
 */
export default function BookingTimeSuggestions({
    suggestions = [],
    onPick,
    hint,
    format = TIME_FORMAT_12H,
}) {
    const t = useTranslations('business.schedule.drawer.suggestions')

    if (!suggestions || suggestions.length === 0) {
        return null
    }

    return (
        <div className="mt-2 flex flex-wrap items-center gap-2">
            {hint && <span className={HINT_CLS}>{hint}</span>}
            {suggestions.map((s) => (
                <Button
                    key={`${s.date}_${s.time}`}
                    type="button"
                    size="xs"
                    variant="default"
                    onClick={() => onPick?.(s)}
                >
                    {formatLabel(t, s.date, s.time, format)}
                </Button>
            ))}
        </div>
    )
}
