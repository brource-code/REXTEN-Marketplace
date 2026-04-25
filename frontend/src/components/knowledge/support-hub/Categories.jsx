'use client'

import KnowledgeArticleRow from './KnowledgeArticleRow'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'
import { getTopicIconByModuleKey } from '@/components/knowledge/utils'
import isLastChild from '@/utils/isLastChild'
import { useTranslations } from 'next-intl'
import { HiChevronRight } from 'react-icons/hi'
import Card from '@/components/ui/Card'

const Categories = ({ data }) => {
    const t = useTranslations('business.knowledge.hub')
    const setSelectedTopic = useKnowledgeHubStore((state) => state.setSelectedTopic)
    const setQueryText = useKnowledgeHubStore((state) => state.setQueryText)

    const handleTopicClick = (topicSlug) => {
        setSelectedTopic(topicSlug)
        setQueryText('')
    }

    const hasTopics = data.categories.some((c) => c.topics?.length > 0)
    const hasPopular = data.popularArticles?.length > 0

    if (!hasTopics && !hasPopular) {
        return (
            <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400 py-10 sm:py-12">
                {t('emptyTopics')}
            </p>
        )
    }

    const topicsBlock = data.categories.map((category) => (
        <div key={category.name}>
            <h4 className="mb-3 sm:mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">{category.name}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.topics.map((topic) => {
                    const icon = getTopicIconByModuleKey(topic.module_key)
                    return (
                        <button
                            key={topic.id}
                            type="button"
                            className="group flex w-full items-stretch gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/70 p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:bg-gray-50/90 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                            onClick={() => handleTopicClick(topic.id)}
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-mild">
                                <span className="text-xl leading-none [&>svg]:w-[1.25rem] [&>svg]:h-[1.25rem]">
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
    ))

    const popularAside = hasPopular && (
        <aside className="w-full shrink-0 xl:w-[min(100%,320px)] xl:sticky xl:top-4 xl:self-start">
            <Card className="border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
                <div className="mb-3">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('popularTitle')}</h4>
                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">{t('popularAsideHint')}</p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 -mx-2">
                    {data.popularArticles.map((article, index) => (
                        <KnowledgeArticleRow
                            key={article.id}
                            topicSlug={article.topicSlug}
                            articleSlug={article.articleSlug}
                            categorySlug={article.categorySlug}
                            title={article.title}
                            timeToRead={article.timeToRead}
                            topicIndex={index}
                            topicModuleKey={article.topicModuleKey}
                            isLastChild={false}
                            variant="compact"
                        />
                    ))}
                </div>
            </Card>
        </aside>
    )

    return (
        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-8">
            <div className="min-w-0 flex-1 flex flex-col gap-10">{topicsBlock}</div>
            {popularAside}
        </div>
    )
}

export default Categories
