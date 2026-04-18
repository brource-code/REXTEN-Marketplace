'use client'

import Tag from '@/components/ui/Tag'
import { PiVan } from 'react-icons/pi'

/** Плашка «выездное исполнение» (execution_type === offsite). */
export default function OffsiteExecutionBadge({ label }) {
    return (
        <Tag
            className="inline-flex items-center gap-1 !text-xs !px-2 !py-0.5 font-bold !bg-slate-100 !text-slate-800 border border-slate-200/90 dark:!bg-slate-700/90 dark:!text-slate-100 dark:border-slate-600"
        >
            <PiVan className="shrink-0 !text-slate-600 dark:!text-slate-300" size={14} aria-hidden />
            <span>{label}</span>
        </Tag>
    )
}
