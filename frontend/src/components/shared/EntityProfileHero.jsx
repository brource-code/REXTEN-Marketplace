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
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="min-w-0 text-center sm:text-left">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                                {name}
                            </h4>
                            {childrenTags ? (
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                                    {childrenTags}
                                </div>
                            ) : null}
                        </div>
                        {childrenActions ? (
                            <div className="flex flex-wrap justify-center sm:justify-end gap-2 shrink-0">
                                {childrenActions}
                            </div>
                        ) : null}
                    </div>
                    {childrenContact ? (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2.5">
                            {childrenContact}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
