'use client'

import Tag from '@/components/ui/Tag'

const STATUS_STYLE = {
    draft: 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100',
    stale: 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100',
    optimizing: 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100',
    ready: 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100',
    in_progress: 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100',
    completed: 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100',
}

export default function RouteStatusBadge({ status, label }) {
    const className = STATUS_STYLE[status] ?? STATUS_STYLE.draft
    return (
        <Tag className={`text-xs font-bold border-0 ${className}`}>
            {label}
        </Tag>
    )
}
