'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { getBusinessKnowledgeArticleBySlugs } from '@/lib/api/business'
import ReactHtmlParser from 'html-react-parser'
import { TbArrowNarrowLeft } from 'react-icons/tb'

function renderBody(body) {
    if (!body) {
        return null
    }
    const looksHtml = /<[a-z][\s\S]*>/i.test(body)
    if (looksHtml) {
        /* not-prose: иначе Typography (prose) делает параграфы серыми на белом и ломает контраст в HTML статьи */
        return (
            <div className="mt-8 not-prose max-w-none text-gray-900 dark:text-gray-100 [&_img]:rounded-lg [&_video]:rounded-xl">
                {ReactHtmlParser(body)}
            </div>
        )
    }
    return (
        <div className="mt-8 text-sm font-bold whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {body}
        </div>
    )
}

export default function KnowledgeArticlePage() {
    const params = useParams()
    const router = useRouter()
    const t = useTranslations('business.knowledge.article')
    const locale = useLocale()
    const topicSlug = params?.topicSlug ? decodeURIComponent(String(params.topicSlug)) : ''
    const articleSlug = params?.articleSlug ? decodeURIComponent(String(params.articleSlug)) : ''

    const { data: article, isLoading, error } = useQuery({
        queryKey: ['knowledge-article', topicSlug, articleSlug, locale],
        queryFn: () => getBusinessKnowledgeArticleBySlugs(topicSlug, articleSlug, locale),
        enabled: Boolean(topicSlug && articleSlug),
    })

    if (isLoading) {
        return (
            <Container>
                <div className="flex justify-center py-24">
                    <Loading loading />
                </div>
            </Container>
        )
    }

    if (error || !article) {
        return (
            <Container>
                <p className="text-sm font-bold text-red-500">{t('notFound')}</p>
                <Button className="mt-4" size="sm" onClick={() => router.push('/business/knowledge')}>
                    {t('backToHub')}
                </Button>
            </Container>
        )
    }

    const updated = article.updated_at ? new Date(article.updated_at).toLocaleDateString() : ''

    return (
        <Container>
            <div className="my-6 max-w-[800px] w-full mx-auto">
                <Button
                    type="button"
                    size="sm"
                    variant="plain"
                    className="mb-6 gap-2"
                    icon={<TbArrowNarrowLeft />}
                    onClick={() => router.push('/business/knowledge')}
                >
                    {t('backToHub')}
                </Button>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                    {article.topic?.title}
                </p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{article.title}</h1>
                {updated && (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">
                        {t('updated', { date: updated })}
                    </p>
                )}
                {renderBody(article.body)}
            </div>
        </Container>
    )
}
