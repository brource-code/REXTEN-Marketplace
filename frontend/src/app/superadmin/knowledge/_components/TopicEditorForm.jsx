'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { createAdminKnowledgeTopic, updateAdminKnowledgeTopic } from '@/lib/api/superadmin'
import { getModuleKeyFormSelectOptions } from '@/constants/knowledgeModules.constant'
import { SUPPORTED_LOCALES } from '@/constants/locale.constant'
import { UI_LANGUAGE_OPTIONS } from '@/constants/languageOptions'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const EMPTY_TRANS = () =>
    Object.fromEntries(
        SUPPORTED_LOCALES.map((loc) => [loc, { title: '', slug: '', description: '' }]),
    )

function localeLabel(loc) {
    return UI_LANGUAGE_OPTIONS.find((o) => o.value === loc)?.label ?? loc
}

/** Ответ API: детальная тема с переводами или плоская старая карточка. */
function normalizeTopicDetail(topic) {
    if (!topic) {
        return null
    }
    if (topic.translations && typeof topic.translations === 'object') {
        return topic
    }
    return {
        topic_key: topic.topic_key ?? null,
        module_key: topic.module_key,
        sort_order: topic.sort_order ?? 0,
        is_published: topic.is_published !== false,
        translations: {
            en: {
                id: topic.id,
                title: topic.title ?? '',
                slug: topic.slug ?? '',
                description: topic.description ?? '',
            },
        },
    }
}

export default function TopicEditorForm({ topic = null }) {
    const router = useRouter()
    const t = useTranslations('superadmin.knowledge')
    const queryClient = useQueryClient()
    const isEdit = !!topic

    const [topicKeyManual, setTopicKeyManual] = useState('')
    const [form, setForm] = useState({
        module_key: '',
        sort_order: 0,
        is_published: true,
        translations: EMPTY_TRANS(),
    })

    useEffect(() => {
        const detail = normalizeTopicDetail(topic)
        if (!detail) {
            return
        }
        const next = EMPTY_TRANS()
        for (const loc of SUPPORTED_LOCALES) {
            const tr = detail.translations?.[loc]
            if (tr) {
                next[loc] = {
                    title: tr.title ?? '',
                    slug: tr.slug ?? '',
                    description: tr.description ?? '',
                }
            }
        }
        setForm({
            module_key: detail.module_key ?? '',
            sort_order: detail.sort_order ?? 0,
            is_published: detail.is_published !== false,
            translations: next,
        })
        setTopicKeyManual(topic && detail.topic_key ? detail.topic_key : '')
    }, [topic])

    const toastError = (error) => {
        const msg =
            error.response?.data?.message ||
            (error.response?.data?.errors
                ? Object.values(error.response.data.errors).flat().join(', ')
                : t('loadError'))
        toast.push(
            <Notification title={t('loadError')} type="danger">
                {msg}
            </Notification>,
        )
    }

    const createMut = useMutation({
        mutationFn: () =>
            createAdminKnowledgeTopic({
                topic_key: topicKeyManual.trim() || undefined,
                module_key: form.module_key || null,
                sort_order: Number(form.sort_order) || 0,
                is_published: form.is_published,
                translations: form.translations,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topics'] })
            toast.push(
                <Notification title={t('topicCreated')} type="success">
                    {t('topicCreated')}
                </Notification>,
            )
            router.push('/superadmin/knowledge')
        },
        onError: (err) => toastError(err),
    })

    const updateMut = useMutation({
        mutationFn: () =>
            updateAdminKnowledgeTopic(topic.id, {
                module_key: form.module_key || null,
                sort_order: Number(form.sort_order) || 0,
                is_published: form.is_published,
                translations: form.translations,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topics'] })
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topic', topic.id] })
            toast.push(
                <Notification title={t('topicUpdated')} type="success">
                    {t('topicUpdated')}
                </Notification>,
            )
            router.push('/superadmin/knowledge')
        },
        onError: (err) => toastError(err),
    })

    const submit = (e) => {
        e.preventDefault()
        for (const loc of SUPPORTED_LOCALES) {
            if (!form.translations[loc]?.title?.trim()) {
                toast.push(
                    <Notification title={t('loadError')} type="danger">
                        {t('topicTranslationTitleRequired', { locale: localeLabel(loc) })}
                    </Notification>,
                )
                return
            }
        }
        if (isEdit) {
            updateMut.mutate()
        } else {
            createMut.mutate()
        }
    }

    const pending = createMut.isPending || updateMut.isPending

    const moduleOptions = useMemo(() => getModuleKeyFormSelectOptions(t), [t])
    const moduleValue =
        moduleOptions.find((o) => o.value === (form.module_key ?? '')) ?? moduleOptions[0]

    const setTranslation = (loc, field, value) => {
        setForm((prev) => ({
            ...prev,
            translations: {
                ...prev.translations,
                [loc]: { ...prev.translations[loc], [field]: value },
            },
        }))
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4 max-w-3xl">
            {!isEdit ? (
                <FormItem label={t('topicGroupKeyOptional')}>
                    <Input
                        size="sm"
                        value={topicKeyManual}
                        onChange={(e) => setTopicKeyManual(e.target.value)}
                        placeholder={t('topicGroupKeyPlaceholder')}
                    />
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                        {t('topicGroupKeyHint')}
                    </p>
                </FormItem>
            ) : null}

            <FormItem label={t('moduleSection')}>
                <Select
                    size="sm"
                    isSearchable={false}
                    value={moduleValue}
                    options={moduleOptions}
                    onChange={(opt) => setForm({ ...form, module_key: opt?.value ?? '' })}
                />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">{t('moduleSectionHint')}</p>
            </FormItem>

            <FormItem label={t('topicSort')}>
                <Input
                    size="sm"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
                />
            </FormItem>
            <FormItem label={t('topicPublished')}>
                <Switcher
                    checked={form.is_published}
                    onChange={(checked) => setForm({ ...form, is_published: checked })}
                />
            </FormItem>

            <div className="space-y-4">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('topicTranslationsHint')}</p>
                {SUPPORTED_LOCALES.map((loc) => (
                    <div
                        key={loc}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-4 space-y-3"
                    >
                        <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100">{localeLabel(loc)}</h5>
                        <FormItem label={t('topicTitle')} required>
                            <Input
                                size="sm"
                                value={form.translations[loc]?.title ?? ''}
                                onChange={(e) => setTranslation(loc, 'title', e.target.value)}
                                required
                            />
                        </FormItem>
                        <FormItem label={t('topicSlug')}>
                            <Input
                                size="sm"
                                value={form.translations[loc]?.slug ?? ''}
                                onChange={(e) => setTranslation(loc, 'slug', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label={t('topicDescription')}>
                            <Input
                                value={form.translations[loc]?.description ?? ''}
                                onChange={(e) => setTranslation(loc, 'description', e.target.value)}
                                textArea
                                rows={3}
                            />
                        </FormItem>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 pt-2">
                <Button type="button" variant="plain" onClick={() => router.back()} disabled={pending}>
                    {t('cancel')}
                </Button>
                <Button type="submit" variant="solid" loading={pending}>
                    {t('save')}
                </Button>
            </div>
        </form>
    )
}
