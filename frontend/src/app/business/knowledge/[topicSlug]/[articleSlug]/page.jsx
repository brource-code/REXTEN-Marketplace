'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useRef } from 'react'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { getBusinessKnowledgeArticleBySlugs } from '@/lib/api/business'
import { formatDate } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import ReactHtmlParser from 'html-react-parser'
import { TbArrowNarrowLeft } from 'react-icons/tb'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import KnowledgeArticleOutline from './_components/KnowledgeArticleOutline'
import { estimateKnowledgeReadMinutes } from '@/utils/knowledgeReadMinutes'

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
    const tHub = useTranslations('business.knowledge.hub')
    const locale = useLocale()
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const bodyRef = useRef(null)
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

    const updated = article.updated_at ? formatDate(article.updated_at, businessTz, 'short') : ''
    const readMin = estimateKnowledgeReadMinutes(article.body)
    const excerpt = article.excerpt?.trim()

    return (
        <Container>
            <div className="my-6 w-full max-w-[1100px] mx-auto">
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

                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
                    <article className="min-w-0 flex-1">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-800/40 dark:to-gray-900/50 p-5 sm:p-4">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                {article.topic?.title}
                            </p>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
                                {article.title}
                            </h1>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {updated ? <span>{t('updated', { date: updated })}</span> : null}
                                {updated ? <span aria-hidden>·</span> : null}
                                <span className="text-gray-900 dark:text-gray-100">
                                    {tHub('minRead', { n: readMin })}
                                </span>
                            </div>
                            {excerpt ? (
                                <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-600 pt-4">
                                    {excerpt}
                                </p>
                            ) : null}
                        </div>

                        <div ref={bodyRef}>{renderBody(article.body)}</div>
                    </article>

                    <aside className="w-full shrink-0 lg:w-[260px] lg:sticky lg:top-6 flex flex-col gap-4">
                        <KnowledgeArticleOutline containerRef={bodyRef} bodyHtml={article.body} />
                        <Card className="border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('supportTitle')}</h4>
                            <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                                {t('supportBody')}
                            </p>
                            <Link
                                href="/business/support"
                                className="mt-3 inline-flex text-sm font-bold text-primary hover:text-primary-deep hover:underline"
                            >
                                {t('supportCta')}
                            </Link>
                        </Card>
                    </aside>
                </div>
            </div>
        </Container>
    )
}
