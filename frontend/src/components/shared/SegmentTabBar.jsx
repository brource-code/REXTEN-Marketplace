'use client'

import Segment from '@/components/ui/Segment'
import classNames from '@/utils/classNames'

/**
 * Горизонтальные «табы» на базе Segment — тот же визуал, что мобильные отчёты расписания
 * (серая плашка, активный пункт с заливкой, прокрутка на узком экране).
 *
 * @param {string} value
 * @param {(next: string) => void} onChange
 * @param {{ value: string, label: import('react').ReactNode, disabled?: boolean }[]} items
 * @param {string} [className] — доп. классы на корень Segment
 * @param {string} [itemClassName] — переопределить классы пунктов (по умолчанию как в отчётах)
 */
export default function SegmentTabBar({
    value,
    onChange,
    items,
    className,
    itemClassName = 'shrink-0 rounded-lg px-2.5 text-xs font-bold sm:px-3 sm:text-sm',
}) {
    return (
        <Segment
            value={value}
            onChange={onChange}
            className={classNames(
                'inline-flex w-full min-w-0 max-w-full overflow-x-auto rounded-xl p-1',
                className,
            )}
        >
            {items.map((item) => (
                <Segment.Item
                    key={item.value}
                    value={item.value}
                    className={itemClassName}
                    disabled={item.disabled}
                >
                    {item.label}
                </Segment.Item>
            ))}
        </Segment>
    )
}
