'use client'

import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import classNames from '@/utils/classNames'
import { getTopicIconForArticle } from '@/components/knowledge/utils'
import { useTranslations } from 'next-intl'
import { HiChevronRight } from 'react-icons/hi'

const BASE = '/business/knowledge'

const KnowledgeArticleRow = ({
    isLastChild,
    topicSlug,
    articleSlug,
    categorySlug,
    title,
    timeToRead,
    topicIndex = 0,
    topicModuleKey,
    variant = 'default',
}) => {
    const t = useTranslations('business.knowledge.hub')

    const href =
        topicSlug && articleSlug
            ? `${BASE}/${encodeURIComponent(topicSlug)}/${encodeURIComponent(articleSlug)}`
            : '#'

    const slugForIcon = categorySlug || topicSlug || 'article'

    const isCompact = variant === 'compact'

    const inner = (
        <>
            <div className="flex items-center gap-3 min-w-0 sm:gap-4">
                <Avatar
                    className={classNames(
                        'bg-gray-100 dark:bg-gray-700 shrink-0',
                        isCompact && 'scale-90 sm:scale-100',
                    )}
                    size={isCompact ? 40 : 50}
                    icon={
                        <span className="heading-text">
                            {getTopicIconForArticle(slugForIcon, topicModuleKey, topicIndex)}
                        </span>
                    }
                    shape="round"
                />
                <div className="min-w-0 flex-1">
                    <h3
                        className={classNames(
                            'font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors',
                            isCompact ? 'text-sm line-clamp-2' : 'text-sm sm:text-base truncate',
                        )}
                    >
                        {title}
                    </h3>
                    <div
                        className={classNames(
                            'flex items-center gap-2 flex-wrap font-bold text-gray-500 dark:text-gray-400',
                            isCompact ? 'mt-0.5 text-xs' : 'mt-0.5 text-xs sm:text-sm',
                        )}
                    >
                        <span>{t('minRead', { n: timeToRead })}</span>
                        {!isCompact && categorySlug && (
                            <>
                                <span aria-hidden>•</span>
                                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">
                                    {categorySlug}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <HiChevronRight
                className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors"
                aria-hidden
            />
        </>
    )

    if (!topicSlug || !articleSlug) {
        return (
            <div
                className={classNames(
                    'flex items-center justify-between opacity-50 cursor-not-allowed py-4 px-2',
                    isLastChild && variant === 'default' && 'border-b border-gray-200 dark:border-gray-700',
                )}
            >
                {inner}
            </div>
        )
    }

    return (
        <Link
            href={href}
            className={classNames(
                'group flex items-center justify-between rounded-lg py-4 px-2 -mx-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
                isCompact ? 'py-3' : 'py-5 sm:py-6',
                isLastChild && variant === 'default' && 'border-b border-gray-200 dark:border-gray-700',
            )}
        >
            {inner}
        </Link>
    )
}

export default KnowledgeArticleRow
