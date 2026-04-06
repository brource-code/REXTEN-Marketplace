'use client'

import KnowledgeArticleRow from './KnowledgeArticleRow'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'
import { getTopicIconByModuleKey } from '@/components/knowledge/utils'
import isLastChild from '@/utils/isLastChild'
import { useTranslations } from 'next-intl'
import { HiChevronRight } from 'react-icons/hi'

const Categories = ({ data }) => {
    const t = useTranslations('business.knowledge.hub')
    const setSelectedTopic = useKnowledgeHubStore((state) => state.setSelectedTopic)
    const setQueryText = useKnowledgeHubStore((state) => state.setQueryText)

    const handleTopicClick = (topicSlug) => {
        setSelectedTopic(topicSlug)
        setQueryText('')
    }

    const hasTopics = data.categories.some((c) => c.topics?.length > 0)

    if (!hasTopics && !(data.popularArticles?.length > 0)) {
        return (
            <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400 py-10 sm:py-12">
                {t('emptyTopics')}
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-10 sm:gap-12">
            {data.categories.map((category) => (
                <div key={category.name}>
                    <h2 className="mb-4 sm:mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">
                        {category.name}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3">
                        {category.topics.map((topic) => {
                            const icon = getTopicIconByModuleKey(topic.module_key)
                            return (
                                <button
                                    key={topic.id}
                                    type="button"
                                    className="group flex w-full items-stretch gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 p-3.5 sm:p-4 text-left shadow-sm transition-all hover:border-primary/45 hover:shadow-md hover:bg-gray-50/80 dark:hover:bg-gray-800 dark:hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                                    onClick={() => handleTopicClick(topic.id)}
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-mild">
                                        <span className="text-lg leading-none [&>svg]:w-[1.15rem] [&>svg]:h-[1.15rem]">
                                            {icon}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                {topic.name}
                                            </h3>
                                            <HiChevronRight className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors mt-0.5" />
                                        </div>
                                        {topic.description ? (
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                {topic.description}
                                            </p>
                                        ) : null}
                                        <span className="text-xs font-bold text-primary mt-auto pt-1">
                                            {t('articleCount', { count: topic.articleCounts })}
                                        </span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
            {data.popularArticles?.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-10 sm:pt-12">
                    <h2 className="mb-4 sm:mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('popularTitle')}
                    </h2>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 px-3 sm:px-4">
                        {data.popularArticles.map((article, index) => (
                            <KnowledgeArticleRow
                                key={article.id}
                                id={article.id}
                                topicSlug={article.topicSlug}
                                articleSlug={article.articleSlug}
                                categorySlug={article.categorySlug}
                                title={article.title}
                                timeToRead={article.timeToRead}
                                topicIndex={index}
                                topicModuleKey={article.topicModuleKey}
                                isLastChild={!isLastChild(data.popularArticles, index)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Categories
