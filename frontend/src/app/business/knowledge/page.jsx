'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import TopSection from '@/components/knowledge/support-hub/TopSection'
import BodySection from '@/components/knowledge/support-hub/BodySection'
import { getBusinessKnowledgeTopics, getBusinessKnowledgePopularArticles } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Container from '@/components/shared/Container'

export default function BusinessKnowledgePage() {
    const t = useTranslations('business.knowledge.hub')
    const tPage = useTranslations('business.knowledge')
    const locale = useLocale()

    const { data, isLoading, error } = useQuery({
        queryKey: ['knowledge-hub-index', locale],
        queryFn: async () => {
            const [topics, popular] = await Promise.all([
                getBusinessKnowledgeTopics({ locale }),
                getBusinessKnowledgePopularArticles(8, locale),
            ])
            return { topics, popular }
        },
    })

    const shell = (children) => (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4 min-h-[40vh]">{children}</div>
            </AdaptiveCard>
        </Container>
    )

    if (isLoading) {
        return shell(
            <>
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tPage('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{tPage('description')}</p>
                </div>
                <TopSection />
                <div className="flex justify-center py-16">
                    <Loading loading />
                </div>
            </>,
        )
    }

    if (error) {
        return shell(
            <>
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tPage('title')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{tPage('description')}</p>
                </div>
                <TopSection />
                <p className="text-sm font-bold text-red-500">{t('loadError')}</p>
            </>,
        )
    }

    const topics = data?.topics ?? []
    const popularRaw = data?.popular ?? []

    const hubData = {
        categories: [
            {
                name: t('topicsSectionTitle'),
                topics: topics.map((topic) => ({
                    id: topic.slug,
                    name: topic.title,
                    description: topic.description || '',
                    articleCounts: topic.articles_count ?? 0,
                    module_key: topic.module_key ?? '',
                })),
            },
        ],
        popularArticles: popularRaw
            .map((article) => ({
                id: article.id,
                topicSlug: article.topic?.slug,
                articleSlug: article.slug,
                categorySlug: article.topic?.title,
                title: article.title,
                timeToRead: 3,
                topicModuleKey: article.topic?.module_key,
            }))
            .filter((row) => row.topicSlug && row.articleSlug),
    }

    return shell(
        <>
            <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tPage('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{tPage('description')}</p>
            </div>
            <TopSection />
            <BodySection data={hubData} />
        </>,
    )
}
