'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import TopicEditorForm from '../../../_components/TopicEditorForm'
import { getAdminKnowledgeTopic } from '@/lib/api/superadmin'

export default function EditKnowledgeTopicPage() {
    const params = useParams()
    const id = Number(params?.id)
    const t = useTranslations('superadmin.knowledge')

    const { data: topic, isLoading, error } = useQuery({
        queryKey: ['admin-knowledge-topic', id],
        queryFn: () => getAdminKnowledgeTopic(id),
        enabled: Number.isFinite(id) && id > 0,
    })

    if (!Number.isFinite(id) || id <= 0) {
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

    if (error || !topic) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-red-600">{t('loadError')}</p>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('topicPageEditTitle')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('topicPageEditSubtitle')}
                        </p>
                    </div>
                    <TopicEditorForm topic={topic} />
                </div>
            </AdaptiveCard>
        </Container>
    )
}
