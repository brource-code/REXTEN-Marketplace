'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { TbPencil, TbTrash, TbFiles } from 'react-icons/tb'
import { getAdminKnowledgeTopics, deleteAdminKnowledgeTopic } from '@/lib/api/superadmin'
import { getModuleFilterSelectOptions, findModuleLabelKey } from '@/constants/knowledgeModules.constant'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

export default function SuperadminKnowledgeHubPage() {
    const router = useRouter()
    const t = useTranslations('superadmin.knowledge')
    const queryClient = useQueryClient()
    const [moduleFilter, setModuleFilter] = useState('')
    const [deleteTopic, setDeleteTopic] = useState(null)

    const { data: topics = [], isLoading, error } = useQuery({
        queryKey: ['admin-knowledge-topics'],
        queryFn: () => getAdminKnowledgeTopics(),
    })

    const moduleFilterOptions = useMemo(() => getModuleFilterSelectOptions(t), [t])

    const filtered = useMemo(() => {
        if (!moduleFilter) {
            return topics
        }
        if (moduleFilter === '__general__') {
            return topics.filter((x) => !x.module_key)
        }
        return topics.filter((x) => (x.module_key || '') === moduleFilter)
    }, [topics, moduleFilter])

    const deleteMutation = useMutation({
        mutationFn: deleteAdminKnowledgeTopic,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topics'] })
            toast.push(
                <Notification title={t('topicDeleted')} type="success">
                    {t('topicDeleted')}
                </Notification>,
            )
            setDeleteTopic(null)
        },
        onError: () => {
            toast.push(
                <Notification title={t('loadError')} type="danger">
                    {t('loadError')}
                </Notification>,
            )
        },
    })

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

    if (error) {
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
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('topicsTitle')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('topicsDescription')}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            <Button
                                variant="solid"
                                onClick={() => router.push('/superadmin/knowledge/articles/new')}
                            >
                                {t('addArticle')}
                            </Button>
                            <Button
                                variant="plain"
                                onClick={() => router.push('/superadmin/knowledge/topics/new')}
                            >
                                {t('addTopic')}
                            </Button>
                        </div>
                    </div>

                    <FormItem label={t('filterByModule')} className="mb-0 max-w-md">
                        <Select
                            size="sm"
                            isSearchable={false}
                            value={
                                moduleFilterOptions.find((o) => o.value === moduleFilter) ??
                                moduleFilterOptions[0]
                            }
                            options={moduleFilterOptions}
                            onChange={(opt) => setModuleFilter(opt?.value ?? '')}
                        />
                    </FormItem>

                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('colTitle')}
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('colModule')}
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('colSlug')}
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('colArticles')}
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('colSort')}
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('colStatus')}
                                    </th>
                                    <th className="text-right py-3 px-4 w-48" />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                                    >
                                        <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.title}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Tag className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-bold">
                                                {t(`moduleLabels.${findModuleLabelKey(row.module_key)}`)}
                                            </Tag>
                                        </td>
                                        <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.slug}
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.articles_count ?? 0}
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.sort_order}
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
                                            <div className="flex justify-end gap-2 flex-wrap">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    icon={<TbFiles />}
                                                    onClick={() => router.push(`/superadmin/knowledge/${row.id}`)}
                                                >
                                                    {t('openArticles')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    icon={<TbPencil />}
                                                    onClick={() =>
                                                        router.push(`/superadmin/knowledge/topics/${row.id}/edit`)
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    className="text-red-600"
                                                    icon={<TbTrash />}
                                                    onClick={() => setDeleteTopic(row)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AdaptiveCard>

            <ConfirmDialog
                isOpen={!!deleteTopic}
                type="danger"
                title={t('deleteTopic')}
                confirmText={t('deleteTopic')}
                cancelText={t('cancel')}
                onCancel={() => setDeleteTopic(null)}
                onConfirm={() => deleteTopic && deleteMutation.mutate(deleteTopic.id)}
            >
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('deleteTopicWarning')}</p>
            </ConfirmDialog>
        </Container>
    )
}
