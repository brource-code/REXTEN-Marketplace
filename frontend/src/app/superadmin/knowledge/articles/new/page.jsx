'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import ArticleEditorForm from '../../_components/ArticleEditorForm'
import { getAdminKnowledgeTopics } from '@/lib/api/superadmin'

function NewArticleInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const topicIdFromUrl = Number(searchParams.get('topicId'))
    const t = useTranslations('superadmin.knowledge')
    const [selectedTopicId, setSelectedTopicId] = useState(null)

    const { data: topics = [], isLoading: topicsLoading } = useQuery({
        queryKey: ['admin-knowledge-topics'],
        queryFn: () => getAdminKnowledgeTopics(),
    })

    useEffect(() => {
        if (!topics.length) {
            return
        }
        if (
            Number.isFinite(topicIdFromUrl) &&
            topicIdFromUrl > 0 &&
            topics.some((x) => x.id === topicIdFromUrl)
        ) {
            setSelectedTopicId(topicIdFromUrl)
        }
    }, [topicIdFromUrl, topics])

    const topicOptions = useMemo(
        () => topics.map((row) => ({ value: row.id, label: row.title })),
        [topics],
    )

    const selectedTopic = useMemo(
        () => topics.find((x) => x.id === selectedTopicId) ?? null,
        [topics, selectedTopicId],
    )

    const selectedOption = useMemo(
        () => topicOptions.find((o) => o.value === selectedTopicId) ?? null,
        [topicOptions, selectedTopicId],
    )

    if (topicsLoading) {
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

    if (!topics.length) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('articleNoTopicsHint')}</p>
                        <div>
                            <Button variant="solid" onClick={() => router.push('/superadmin/knowledge/topics/new')}>
                                {t('addTopic')}
                            </Button>
                        </div>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {selectedTopic
                                ? t('articlePageNewTitle', { topic: selectedTopic.title })
                                : t('articlePageNewHeading')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {selectedTopic ? t('articlePageNewSubtitle') : t('articlePagePickTopic')}
                        </p>
                    </div>

                    <FormItem label={t('articleSelectTopic')} className="mb-0 max-w-md">
                        <Select
                            size="sm"
                            value={selectedOption}
                            options={topicOptions}
                            onChange={(opt) => setSelectedTopicId(opt?.value ?? null)}
                            placeholder={t('articleSelectTopicPlaceholder')}
                            isSearchable={topics.length > 10}
                        />
                    </FormItem>

                    {selectedTopicId ? (
                        <ArticleEditorForm topicId={selectedTopicId} />
                    ) : null}
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default function NewKnowledgeArticlePage() {
    return (
        <Suspense
            fallback={
                <Container>
                    <AdaptiveCard>
                        <div className="flex items-center justify-center min-h-[400px]">
                            <Loading loading />
                        </div>
                    </AdaptiveCard>
                </Container>
            }
        >
            <NewArticleInner />
        </Suspense>
    )
}
