'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import DatePicker from '@/components/ui/DatePicker'
import { TIME_RANGES, TIME_RANGE_OPTIONS } from '@/constants/timeRanges'

/**
 * Unified Time Range Filter Component
 * Используется в Dashboard, Billing, Business Events, Analytics
 * 
 * @param {Object} props
 * @param {string} props.value - Текущий выбранный период
 * @param {Function} props.onChange - Callback при изменении периода (range, dates)
 * @param {string} props.className - Дополнительные CSS классы
 */
const TimeRangeFilter = ({ value = TIME_RANGES.LAST_30_DAYS, onChange, className = '' }) => {
    const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
    const [customDates, setCustomDates] = useState({
        from: null,
        to: null,
    })

    // Используем только основные периоды для кнопок
    const ranges = [
        { value: TIME_RANGES.LAST_7_DAYS, label: '7 дней' },
        { value: TIME_RANGES.LAST_30_DAYS, label: '30 дней' },
        { value: TIME_RANGES.LAST_90_DAYS, label: '90 дней' },
        { value: TIME_RANGES.CUSTOM, label: 'Выбрать период' },
    ]

    const handleRangeClick = (rangeValue) => {
        if (rangeValue === TIME_RANGES.CUSTOM) {
            setIsCustomDialogOpen(true)
        } else {
            onChange(rangeValue, null)
        }
    }

    const handleCustomApply = () => {
        if (customDates.from && customDates.to) {
            onChange(TIME_RANGES.CUSTOM, {
                from: customDates.from,
                to: customDates.to,
            })
            setIsCustomDialogOpen(false)
        }
    }

    const handleCustomCancel = () => {
        setIsCustomDialogOpen(false)
        setCustomDates({ from: null, to: null })
    }

    return (
        <>
            <div className={`flex items-center gap-2 ${className}`}>
                {ranges.map((range) => (
                    <Button
                        key={range.value}
                        size="sm"
                        variant={value === range.value ? 'solid' : 'plain'}
                        onClick={() => handleRangeClick(range.value)}
                    >
                        {range.label}
                    </Button>
                ))}
            </div>

            {/* Custom Date Range Dialog */}
            <Dialog
                isOpen={isCustomDialogOpen}
                onClose={handleCustomCancel}
                width={500}
            >
                <h5 className="mb-4">Выберите период</h5>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                            Дата начала
                        </label>
                        <DatePicker
                            value={customDates.from}
                            onChange={(date) => setCustomDates({ ...customDates, from: date })}
                            placeholder="Выберите дату начала"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                            Дата окончания
                        </label>
                        <DatePicker
                            value={customDates.to}
                            onChange={(date) => setCustomDates({ ...customDates, to: date })}
                            placeholder="Выберите дату окончания"
                            minDate={customDates.from}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={handleCustomCancel}>
                        Отмена
                    </Button>
                    <Button
                        variant="solid"
                        onClick={handleCustomApply}
                        disabled={!customDates.from || !customDates.to}
                    >
                        Применить
                    </Button>
                </div>
            </Dialog>
        </>
    )
}

export default TimeRangeFilter
