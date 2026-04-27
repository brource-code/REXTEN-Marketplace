'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import { UI_LANGUAGE_OPTIONS } from '@/constants/languageOptions'
import KnowledgeArticleEditor from '@/components/knowledge/admin/KnowledgeArticleEditor'
import {
    createAdminKnowledgeArticle,
    updateAdminKnowledgeArticle,
} from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const EMPTY_DOC = '<p></p>'

export default function ArticleEditorForm({ topicId, article = null }) {
    const router = useRouter()
    const t = useTranslations('superadmin.knowledge')
    const uiLocale = useLocale()
    const queryClient = useQueryClient()
    const isEdit = !!article

    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [excerpt, setExcerpt] = useState('')
    const [bodyHtml, setBodyHtml] = useState(EMPTY_DOC)
    const [sortOrder, setSortOrder] = useState(0)
    const [published, setPublished] = useState(true)
    const [locale, setLocale] = useState(uiLocale)

    const localeOptions = UI_LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
    const localeValue = localeOptions.find((o) => o.value === locale) ?? localeOptions[0]

    useEffect(() => {
        if (article) {
            setTitle(article.title || '')
            setSlug(article.slug || '')
            setExcerpt(article.excerpt || '')
            setBodyHtml(article.body && article.body.trim() ? article.body : EMPTY_DOC)
            setSortOrder(article.sort_order ?? 0)
            setPublished(article.is_published !== false)
            if (article.locale) {
                setLocale(article.locale)
            }
        } else {
            setLocale(uiLocale)
        }
    }, [article, uiLocale])

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
        mutationFn: () => {
            const plain = bodyHtml.replace(/<[^>]+>/g, '').trim()
            if (!title.trim() || !plain) {
                throw new Error('validation')
            }
            return createAdminKnowledgeArticle(topicId, {
                locale,
                title: title.trim(),
                slug: slug.trim() || undefined,
                excerpt: excerpt.trim() || null,
                body: bodyHtml,
                sort_order: Number(sortOrder) || 0,
                is_published: published,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-articles', topicId] })
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topics'] })
            toast.push(
                <Notification title={t('articleCreated')} type="success">
                    {t('articleCreated')}
                </Notification>,
            )
            router.push(`/superadmin/knowledge/${topicId}`)
        },
        onError: (err) => {
            if (err.message === 'validation') {
                toast.push(
                    <Notification title={t('loadError')} type="danger">
                        {t('articleValidation')}
                    </Notification>,
                )
            } else {
                toastError(err)
            }
        },
    })

    const updateMut = useMutation({
        mutationFn: () => {
            const plain = bodyHtml.replace(/<[^>]+>/g, '').trim()
            if (!title.trim() || !plain) {
                throw new Error('validation')
            }
            return updateAdminKnowledgeArticle(article.id, {
                title: title.trim(),
                slug: slug.trim() || undefined,
                excerpt: excerpt.trim() || null,
                body: bodyHtml,
                sort_order: Number(sortOrder) || 0,
                is_published: published,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-articles', topicId] })
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-article', article.id] })
            queryClient.invalidateQueries({ queryKey: ['admin-knowledge-topics'] })
            toast.push(
                <Notification title={t('articleUpdated')} type="success">
                    {t('articleUpdated')}
                </Notification>,
            )
            router.push(`/superadmin/knowledge/${topicId}`)
        },
        onError: (err) => {
            if (err.message === 'validation') {
                toast.push(
                    <Notification title={t('loadError')} type="danger">
                        {t('articleValidation')}
                    </Notification>,
                )
            } else {
                toastError(err)
            }
        },
    })

    const submit = (e) => {
        e.preventDefault()
        if (isEdit) {
            updateMut.mutate()
        } else {
            createMut.mutate()
        }
    }

    const pending = createMut.isPending || updateMut.isPending

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <FormItem label={t('articleLocale')} required>
                {isEdit ? (
                    <Input size="sm" readOnly value={locale} className="bg-gray-50 dark:bg-gray-800/50" />
                ) : (
                    <Select
                        size="sm"
                        value={localeValue}
                        options={localeOptions}
                        onChange={(opt) => setLocale(opt?.value ?? uiLocale)}
                    />
                )}
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">{t('articleLocaleHint')}</p>
            </FormItem>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormItem label={t('articleTitle')} required>
                    <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </FormItem>
                <FormItem label={t('articleSlug')}>
                    <Input size="sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
                </FormItem>
            </div>
            <FormItem label={t('articleExcerpt')}>
                <Input
                    size="sm"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    textArea
                    rows={3}
                    placeholder={t('articleExcerptPlaceholder')}
                />
            </FormItem>
            <FormItem label={t('articleBody')}>
                <KnowledgeArticleEditor
                    key={isEdit ? `article-${article.id}` : 'article-new'}
                    content={bodyHtml}
                    placeholder={t('editorPlaceholder')}
                    onChange={({ html }) => setBodyHtml(html)}
                    minHeightClass="min-h-[480px]"
                />
            </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <FormItem label={t('articleSort')}>
                    <Input
                        size="sm"
                        type="number"
                        min={0}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    />
                </FormItem>
                <FormItem label={t('articlePublished')}>
                    <Switcher checked={published} onChange={setPublished} />
                </FormItem>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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
