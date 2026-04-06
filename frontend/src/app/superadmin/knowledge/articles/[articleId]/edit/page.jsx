'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import ArticleEditorForm from '../../../_components/ArticleEditorForm'
import { getAdminKnowledgeArticle } from '@/lib/api/superadmin'

export default function EditKnowledgeArticlePage() {
    const params = useParams()
    const articleId = Number(params?.articleId)
    const t = useTranslations('superadmin.knowledge')

    const { data: article, isLoading, error } = useQuery({
        queryKey: ['admin-knowledge-article', articleId],
        queryFn: () => getAdminKnowledgeArticle(articleId),
        enabled: Number.isFinite(articleId) && articleId > 0,
    })

    if (!Number.isFinite(articleId) || articleId <= 0) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-red-600">{t('loadError')}</p>
                </AdaptiveCard>
            </Container>
        )
    }

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (error || !article) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-red-600">{t('loadError')}</p>
                </AdaptiveCard>
            </Container>
        )
    }

    const topicId = article.knowledge_topic_id

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('articlePageEditTitle')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('articlePageEditSubtitle')}
                        </p>
                    </div>
                    <ArticleEditorForm topicId={topicId} article={article} />
                </div>
            </AdaptiveCard>
        </Container>
    )
}
