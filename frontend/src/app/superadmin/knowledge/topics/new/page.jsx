'use client'

import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import TopicEditorForm from '../../_components/TopicEditorForm'

export default function NewKnowledgeTopicPage() {
    const t = useTranslations('superadmin.knowledge')

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('topicPageNewTitle')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {t('topicPageNewSubtitle')}
                        </p>
                    </div>
                    <TopicEditorForm />
                </div>
            </AdaptiveCard>
        </Container>
    )
}
