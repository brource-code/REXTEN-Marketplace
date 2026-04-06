'use client'

import Avatar from '@/components/ui/Avatar'
import classNames from '@/utils/classNames'
import { useRouter } from 'next/navigation'
import { getTopicIconForArticle } from '@/components/knowledge/utils'
import { useTranslations } from 'next-intl'

const BASE = '/business/knowledge'

const KnowledgeArticleRow = ({
    id,
    isLastChild,
    topicSlug,
    articleSlug,
    categorySlug,
    title,
    timeToRead,
    topicIndex = 0,
    topicModuleKey,
}) => {
    const router = useRouter()
    const t = useTranslations('business.knowledge.hub')

    const handleArticleClick = () => {
        if (topicSlug && articleSlug) {
            router.push(`${BASE}/${encodeURIComponent(topicSlug)}/${encodeURIComponent(articleSlug)}`)
        }
    }

    const slugForIcon = categorySlug || topicSlug || 'article'

    return (
        <div
            className={classNames(
                'flex items-center justify-between py-6 border-gray-200 dark:border-gray-700 group cursor-pointer',
                isLastChild && 'border-b',
            )}
            role="button"
            onClick={handleArticleClick}
        >
            <div className="flex items-center gap-4 min-w-0">
                <Avatar
                    className="bg-gray-100 dark:bg-gray-700 shrink-0"
                    size={50}
                    icon={
                        <span className="heading-text">
                            {getTopicIconForArticle(slugForIcon, topicModuleKey, topicIndex)}
                        </span>
                    }
                    shape="round"
                />
                <div className="min-w-0">
                    <h6 className="font-bold group-hover:text-primary text-gray-900 dark:text-gray-100 truncate">
                        {title}
                    </h6>
                    <div className="flex items-center gap-2 flex-wrap text-sm font-bold text-gray-500 dark:text-gray-400">
                        <span>
                            {t('minRead', { n: timeToRead })}
                        </span>
                        {categorySlug && (
                            <>
                                <span>•</span>
                                <span className="text-gray-900 dark:text-gray-100">{categorySlug}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KnowledgeArticleRow
