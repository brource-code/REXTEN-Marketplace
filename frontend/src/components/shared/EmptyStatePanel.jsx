'use client'

import classNames from '@/utils/classNames'

/**
 * Единый блок пустого состояния (как вкладка API / токены): рамка-пунктир, иконка в квадрате, заголовок и подсказка.
 */
export default function EmptyStatePanel({ icon: Icon, title, hint, children, className }) {
    return (
        <div
            className={classNames(
                'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 py-16 px-6 text-center dark:border-gray-600',
                className,
            )}
        >
            {Icon ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle text-primary dark:bg-primary/15 dark:text-primary-mild">
                    <Icon className="h-8 w-8" aria-hidden />
                </div>
            ) : null}
            <div className="max-w-md space-y-2">
                <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h5>
                {hint ? (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{hint}</p>
                ) : null}
            </div>
            {children}
        </div>
    )
}
