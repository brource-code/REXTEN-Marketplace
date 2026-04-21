'use client'

import { useTranslations } from 'next-intl'

export default function WizardStepper({ step }) {
    const t = useTranslations('business.schedule.wizard.steps')
    const items = [
        { id: 1, label: t('clientService') },
        { id: 2, label: t('timeAssignment') },
    ]
    return (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {items.map((item, idx) => {
                const isActive = step === item.id
                const isDone = step > item.id
                return (
                    <li key={item.id} className="flex items-center gap-2">
                        <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : isDone
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            {item.id}
                        </span>
                        <span
                            className={`text-sm font-bold ${
                                isActive || isDone
                                    ? 'text-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {item.label}
                        </span>
                        {idx < items.length - 1 && (
                            <span className="mx-1 h-px w-6 bg-gray-300 dark:bg-gray-600" />
                        )}
                    </li>
                )
            })}
        </ol>
    )
}
