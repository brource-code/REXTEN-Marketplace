'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import { FormItem } from '@/components/ui/Form'
import { UI_LANGUAGE_OPTIONS } from '@/constants/languageOptions'
import { TbPencil, TbTrash, TbArrowLeft } from 'react-icons/tb'
import {
    getAdminKnowledgeTopic,
    getAdminKnowledgeArticles,
    deleteAdminKnowledgeArticle,
} from '@/lib/api/superadmin'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

export default function SuperadminKnowledgeArticlesPage() {
    const router = useRouter()
    const params = useParams()
    const topicId = Number(params?.topicId)
    const t = useTranslations('superadmin.knowledge')
    const uiLocale = useLocale()
    const queryClient = useQueryClient()
    const [deleteArticle, setDeleteArticle] = useState(null)
    const [listLocale, setListLocale] = useState(uiLocale)

    const localeOptions = UI_LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
    const listLocaleOption = localeOptions.find((o) => o.value === listLocale) ?? localeOptions[0]

    const topicQuery = useQuery({
        queryKey: ['admin-knowledge-topic', topicId],
        queryFn: () => getAdminKnowledgeTopic(topicId),
        enabled: Number.isFinite(topicId) && topicId > 0,
    })

    const articlesQuery = useQuery({
        queryKey: ['admin-knowledge-articles', topicId, listLocale],
        queryFn: () => getAdminKnowledgeArticles(topicId, { locale: listLocale }),
        enabled: Number.isFinite(topicId) && topicId > 0,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAdminKnowledgeArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-articles', topicId] })
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topics'] })
            toast.push(
                <Notification title={t('articleDeleted')} type="success">
                    {t('articleDeleted')}
                </Notification>,
            )
            setDeleteArticle(null)
        },
        onError: () => {
            toast.push(
                <Notification title={t('loadError')} type="danger">
                    {t('loadError')}
                </Notification>,
            )
        },
    })

    if (!Number.isFinite(topicId) || topicId <= 0) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loadError')}</p>
                    <Link href="/superadmin/knowledge" className="text-sm font-bold text-primary mt-2 inline-block">
                        {t('backToTopics')}
                    </Link>
                </AdaptiveCard>
            </Container>
        )
    }

    if (topicQuery.isLoading || articlesQuery.isLoading) {
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

    if (topicQuery.error || !topicQuery.data) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-red-600">{t('loadError')}</p>
                    <Link href="/superadmin/knowledge" className="text-sm font-bold text-primary mt-2 inline-block">
                        {t('backToTopics')}
                    </Link>
                </AdaptiveCard>
            </Container>
        )
    }

    const topic = topicQuery.data
    const articles = articlesQuery.data ?? []

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <Link
                                href="/superadmin/knowledge"
                                className="inline-flex items-center gap-1 text-sm font-bold text-primary mb-2"
                            >
                                <TbArrowLeft className="text-lg" />
                                {t('backToTopics')}
                            </Link>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('articlesTitle', { topic: topic.title })}
                            </h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('articlesDescription')}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between w-full md:w-auto">
                            <FormItem label={t('articlesLanguageFilter')} className="mb-0 min-w-[200px]">
                                <Select
                                    size="sm"
                                    value={listLocaleOption}
                                    options={localeOptions}
                                    onChange={(opt) => setListLocale(opt?.value ?? uiLocale)}
                                />
                            </FormItem>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="sm"
                                    onClick={() => router.push(`/superadmin/knowledge/topics/${topicId}/edit`)}
                                >
                                    {t('editTopicShort')}
                                </Button>
                                <Button
                                    variant="solid"
                                    onClick={() =>
                                        router.push(`/superadmin/knowledge/articles/new?topicId=${topicId}`)
                                    }
                                >
                                    {t('addArticle')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {articles.length === 0 ? (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('emptyArticles')}</p>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400 w-28">
                                            {t('colLocale')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('colTitle')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('colExcerpt')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('colSlug')}
                                        </th>
                                        <th className="text-right py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('colSort')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('colStatus')}
                                        </th>
                                        <th className="text-right py-3 px-4 w-28" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {articles.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                                        >
                                            <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                {row.locale || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.title}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {row.excerpt || '—'}
                                            </td>
                                            <td className="text-sm font-bold text-gray-900 dark:text-gray-100 py-3 px-4">
                                                {row.slug}
                                            </td>
                                            <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {row.sort_order ?? 0}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Tag
                                                    className={
                                                        row.is_published
                                                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100'
                                                            : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                                                    }
                                                >
                                                    {row.is_published ? t('published') : t('draft')}
                                                </Tag>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="plain"
                                                        icon={<TbPencil />}
                                                        onClick={() =>
                                                            router.push(
                                                                `/superadmin/knowledge/articles/${row.id}/edit`,
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="plain"
                                                        className="text-red-600"
                                                        icon={<TbTrash />}
                                                        onClick={() => setDeleteArticle(row)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </AdaptiveCard>

            <ConfirmDialog
                isOpen={!!deleteArticle}
                type="danger"
                title={t('deleteArticle')}
                confirmText={t('deleteArticle')}
                cancelText={t('cancel')}
                onCancel={() => setDeleteArticle(null)}
                onConfirm={() => deleteArticle && deleteMutation.mutate(deleteArticle.id)}
            />
        </Container>
    )
}
