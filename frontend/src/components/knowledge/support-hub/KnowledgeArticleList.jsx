'use client'

import KnowledgeArticleRow from './KnowledgeArticleRow'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'
import isLastChild from '@/utils/isLastChild'
import { TbArrowNarrowLeft } from 'react-icons/tb'
import { useQuery } from '@tanstack/react-query'
import { searchBusinessKnowledgeArticles, getBusinessKnowledgeTopicBySlug } from '@/lib/api/business'
import { useLocale, useTranslations } from 'next-intl'
import Loading from '@/components/shared/Loading'
import { estimateKnowledgeReadMinutes } from '@/utils/knowledgeReadMinutes'
import { getTopicIconByModuleKey } from '@/components/knowledge/utils'

function estimateReadFromSummary(article) {
    const blob = [article?.title, article?.excerpt, article?.body].filter(Boolean).join(' ')
    return estimateKnowledgeReadMinutes(blob)
}

const KnowledgeArticleList = ({ query, topicSlug }) => {
    const t = useTranslations('business.knowledge.hub')
    const locale = useLocale()
    const setQueryText = useKnowledgeHubStore((state) => state.setQueryText)
    const setSelectedTopic = useKnowledgeHubStore((state) => state.setSelectedTopic)

    const searchEnabled = Boolean(query && String(query).trim().length >= 2)
    const topicEnabled = Boolean(topicSlug)

    const { data: searchData, isLoading: searchLoading } = useQuery({
        queryKey: ['knowledge-search', query, locale],
        queryFn: () => searchBusinessKnowledgeArticles(String(query).trim(), locale),
        enabled: searchEnabled,
    })

    const { data: topicData, isLoading: topicLoading, isError: topicError } = useQuery({
        queryKey: ['knowledge-topic', topicSlug, locale],
        queryFn: () => getBusinessKnowledgeTopicBySlug(topicSlug, locale),
        enabled: topicEnabled,
    })

    const handleBack = () => {
        setQueryText('')
        setSelectedTopic('')
    }

    const loading = (searchEnabled && searchLoading) || (topicEnabled && topicLoading)

    if (topicEnabled && topicError) {
        return (
            <div>
                <button
                    type="button"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors"
                    onClick={handleBack}
                >
                    <TbArrowNarrowLeft className="text-xl" />
                    {t('back')}
                </button>
                <p className="text-sm font-bold text-red-500">{t('topicLoadError')}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loading loading />
            </div>
        )
    }

    if (searchEnabled) {
        const list = searchData || []
        return (
            <div>
                {list.length > 0 && (
                    <div className="mb-6">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('searchResultPrefix')}</p>
                        <h4 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100 break-words">
                            {query}
                        </h4>
                    </div>
                )}
                {list.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/40 px-6 py-14 text-center">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('noArticles')}</h4>
                        <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {t('searchEmptyHint')}
                        </p>
                    </div>
                )}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden bg-white/60 dark:bg-gray-800/30 px-2 sm:px-3">
                    {list.map((article, index) => (
                        <KnowledgeArticleRow
                            key={article.id}
                            topicSlug={article.topic?.slug}
                            articleSlug={article.slug}
                            categorySlug={article.topic?.title}
                            title={article.title}
                            timeToRead={estimateReadFromSummary(article)}
                            topicIndex={index}
                            topicModuleKey={article.topic?.module_key}
                            isLastChild={!isLastChild(list, index)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (topicEnabled && topicData) {
        const list = topicData.articles || []
        const topicTitle = topicData.topic?.title || topicSlug
        const topicDesc = topicData.topic?.description
        const topicIcon = getTopicIconByModuleKey(topicData.topic?.module_key)

        return (
            <div>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                    <button
                        type="button"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={handleBack}
                        aria-label={t('back')}
                    >
                        <TbArrowNarrowLeft />
                    </button>
                    <div className="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-gray-50/90 to-white dark:from-gray-800/50 dark:to-gray-900/40 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                                <span className="text-lg [&>svg]:w-[1.15rem] [&>svg]:h-[1.15rem]">{topicIcon}</span>
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{topicTitle}</h4>
                                {topicDesc ? (
                                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {topicDesc}
                                    </p>
                                ) : null}
                                <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t('topicArticleCount', { count: list.length })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {list.length === 0 && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('topicEmpty')}</p>
                )}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden bg-white/60 dark:bg-gray-800/30 px-2 sm:px-3">
                    {list.map((article, index) => (
                        <KnowledgeArticleRow
                            key={article.id}
                            topicSlug={topicData.topic?.slug}
                            articleSlug={article.slug}
                            categorySlug={topicData.topic?.title}
                            title={article.title}
                            timeToRead={estimateReadFromSummary(article)}
                            topicIndex={index}
                            topicModuleKey={topicData.topic?.module_key}
                            isLastChild={!isLastChild(list, index)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    return null
}

export default KnowledgeArticleList
