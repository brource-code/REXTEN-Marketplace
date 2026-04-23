'use client'

import Avatar from '@/components/ui/Avatar'
import classNames from '@/utils/classNames'

/**
 * Единый блок: аватар, имя, теги, опциональные действия, контакты.
 */
export default function EntityProfileHero({
    name,
    avatarSrc,
    avatarSize = 96,
    initials,
    childrenTags,
    childrenContact,
    childrenActions,
    /** В узких контейнерах (модалки) не ставить имя и кнопки в одну строку по lg viewport */
    stackActionsBelowTitle = false,
    /** Имя уже в шапке страницы — оставляем аватар, теги, действия и контакты */
    omitTitle = false,
    className,
}) {
    return (
        <div
            className={classNames(
                'rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/40 p-5 sm:p-6',
                className,
            )}
        >
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
                <div className="relative shrink-0 flex justify-center sm:justify-start">
                    <Avatar
                        size={avatarSize}
                        shape="circle"
                        className="ring-2 ring-white dark:ring-gray-900 shadow-md"
                        src={avatarSrc || undefined}
                    >
                        {initials}
                    </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                    <div
                        className={classNames(
                            'flex gap-3',
                            stackActionsBelowTitle
                                ? 'flex-col items-stretch sm:items-start'
                                : 'flex-col lg:flex-row lg:items-start lg:justify-between',
                        )}
                    >
                        <div className="min-w-0 text-center sm:text-left">
                            {!omitTitle ? (
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {name}
                                </h4>
                            ) : null}
                            {childrenTags ? (
                                <div
                                    className={classNames(
                                        'flex flex-wrap justify-center sm:justify-start gap-2',
                                        omitTitle ? 'mt-0' : 'mt-2',
                                    )}
                                >
                                    {childrenTags}
                                </div>
                            ) : null}
                        </div>
                        {childrenActions ? (
                            <div
                                className={classNames(
                                    'flex flex-wrap gap-2 shrink-0 min-w-0',
                                    stackActionsBelowTitle
                                        ? 'justify-start w-full sm:w-auto'
                                        : 'justify-center sm:justify-end',
                                )}
                            >
                                {childrenActions}
                            </div>
                        ) : null}
                    </div>
                    {childrenContact ? (
                        <div
                            className={classNames(
                                'border-t border-gray-200 dark:border-gray-600 space-y-2.5',
                                omitTitle ? 'mt-3 pt-3' : 'mt-4 pt-4',
                            )}
                        >
                            {childrenContact}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
