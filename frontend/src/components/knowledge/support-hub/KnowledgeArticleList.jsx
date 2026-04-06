'use client'

import KnowledgeArticleRow from './KnowledgeArticleRow'
import { useKnowledgeHubStore } from '@/components/knowledge/knowledgeHubStore'
import isLastChild from '@/utils/isLastChild'
import NoDataFound from '@/assets/svg/NoDataFound'
import { TbArrowNarrowLeft } from 'react-icons/tb'
import { useQuery } from '@tanstack/react-query'
import {
    searchBusinessKnowledgeArticles,
    getBusinessKnowledgeTopicBySlug,
} from '@/lib/api/business'
import { useLocale, useTranslations } from 'next-intl'
import Loading from '@/components/shared/Loading'

function estimateReadMinutes(body) {
    if (!body || typeof body !== 'string') {
        return 3
    }
    const words = body.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
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
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100"
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
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('searchResultPrefix')}{' '}
                            </span>
                            <span>{query}</span>
                        </h3>
                    </div>
                )}
                {list.length === 0 && (
                    <div className="text-center mt-20">
                        <div className="flex justify-center">
                            <NoDataFound height={280} width={280} />
                        </div>
                        <h3 className="mt-8 text-xl font-bold text-gray-900 dark:text-gray-100">{t('noArticles')}</h3>
                    </div>
                )}
                {list.map((article, index) => (
                    <KnowledgeArticleRow
                        key={article.id}
                        id={article.id}
                        topicSlug={article.topic?.slug}
                        articleSlug={article.slug}
                        categorySlug={article.topic?.title}
                        title={article.title}
                        timeToRead={estimateReadMinutes(article.body)}
                        topicIndex={index}
                        topicModuleKey={article.topic?.module_key}
                        isLastChild={!isLastChild(list, index)}
                    />
                ))}
            </div>
        )
    }

    if (topicEnabled && topicData) {
        const list = topicData.articles || []
        const topicTitle = topicData.topic?.title || topicSlug

        return (
            <div>
                <div className="mb-6">
                    <h4 className="flex items-center gap-4 text-xl font-bold text-gray-900 dark:text-gray-100">
                        <button
                            type="button"
                            className="outline-hidden rounded-full p-2 text-xl bg-white hover:bg-gray-200 hover:text-gray-800 dark:hover:text-gray-100 dark:bg-gray-800"
                            onClick={handleBack}
                        >
                            <TbArrowNarrowLeft />
                        </button>
                        {topicTitle}
                    </h4>
                </div>
                {list.length === 0 && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('topicEmpty')}</p>
                )}
                {list.map((article, index) => (
                    <KnowledgeArticleRow
                        key={article.id}
                        id={article.id}
                        topicSlug={topicData.topic?.slug}
                        articleSlug={article.slug}
                        categorySlug={topicData.topic?.title}
                        title={article.title}
                        timeToRead={3}
                        topicIndex={index}
                        topicModuleKey={topicData.topic?.module_key}
                        isLastChild={!isLastChild(list, index)}
                    />
                ))}
            </div>
        )
    }

    return null
}

export default KnowledgeArticleList
