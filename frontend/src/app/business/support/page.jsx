'use client'

import { useCallback, useMemo, useState, Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Dialog from '@/components/ui/Dialog'
import Loading from '@/components/shared/Loading'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import { PiHeadset } from 'react-icons/pi'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import {
    createBusinessSupportTicket,
    getBusinessSupportTicket,
    getBusinessSupportTickets,
} from '@/lib/api/business'
import { formatDateTime } from '@/utils/dateTime'
import toast from '@/components/ui/toast'
import useBusinessStore from '@/store/businessStore'

const CATEGORY_KEYS = ['bug', 'question', 'feature', 'billing', 'other']
const AREA_PRESET_KEYS = [
    'dashboard',
    'schedule',
    'bookings',
    'clients',
    'advertisements',
    'reviews',
    'billing',
    'settings',
    'knowledge',
    'other',
]

const MAX_FILES = 5

export default function BusinessSupportPage() {
    return (
        <Suspense
            fallback={
                <Container>
                    <AdaptiveCard>
                        <div className="flex justify-center py-20">
                            <Loading loading />
                        </div>
                    </AdaptiveCard>
                </Container>
            }
        >
            <BusinessSupportPageInner />
        </Suspense>
    )
}

function BusinessSupportPageInner() {
    const t = useTranslations('business.support')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const fileInputRef = useRef(null)

    const [subject, setSubject] = useState('')
    const [category, setCategory] = useState('bug')
    const [areaPreset, setAreaPreset] = useState('schedule')
    const [pagePath, setPagePath] = useState('')
    const [body, setBody] = useState('')
    const [files, setFiles] = useState([])

    const [detailId, setDetailId] = useState(null)
    const [detailOpen, setDetailOpen] = useState(false)

    const { data: listData, isLoading: listLoading } = useQuery({
        queryKey: ['business-support-tickets'],
        queryFn: () => getBusinessSupportTickets({ page: 1, pageSize: 50 }),
    })

    const { data: detailData, isLoading: detailLoading } = useQuery({
        queryKey: ['business-support-ticket', detailId],
        queryFn: () => getBusinessSupportTicket(detailId),
        enabled: detailId != null && detailOpen,
    })

    const createMutation = useMutation({
        mutationFn: (fd) => createBusinessSupportTicket(fd),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['business-support-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['business-notifications'] })
            setSubject('')
            setBody('')
            setPagePath('')
            setFiles([])
            toast.push(
                <Notification title={t('successTitle')} type="success">
                    {t('success', { id: data.id })}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={t('errorTitle')} type="danger">
                    {t('error')}
                </Notification>,
            )
        },
    })

    const ticketParam = searchParams.get('ticket')
    useEffect(() => {
        const id = ticketParam ? parseInt(ticketParam, 10) : NaN
        if (!Number.isFinite(id)) return
        setDetailId(id)
        setDetailOpen(true)
    }, [ticketParam])

    const areaSectionValue = useMemo(() => t(`areaPresets.${areaPreset}`), [areaPreset, t])

    const buildClientMeta = useCallback(() => {
        if (typeof window === 'undefined') return {}
        return {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent,
            referrer: document.referrer || null,
        }
    }, [])

    const addFilesFromList = (list) => {
        const arr = Array.from(list || []).filter(Boolean)
        setFiles((prev) => {
            const next = [...prev]
            for (const f of arr) {
                if (next.length >= MAX_FILES) break
                next.push(f)
            }
            return next
        })
    }

    const onSubmit = (e) => {
        e.preventDefault()
        if (!subject.trim() || !body.trim()) {
            toast.push(
                <Notification title={t('errorTitle')} type="warning">
                    {t('validationRequired')}
                </Notification>,
            )
            return
        }
        const fd = new FormData()
        fd.append('subject', subject.trim())
        fd.append('category', category)
        fd.append('area_section', areaSectionValue)
        if (pagePath.trim()) fd.append('page_path', pagePath.trim())
        fd.append('body', body.trim())
        fd.append('client_meta', JSON.stringify(buildClientMeta()))
        files.forEach((f) => fd.append('attachments[]', f))

        createMutation.mutate(fd)
    }

    const onFileInputChange = (e) => {
        addFilesFromList(e.target.files)
        e.target.value = ''
    }

    const removeFile = (idx) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx))
    }

    const openDetail = (id) => {
        setDetailId(id)
        setDetailOpen(true)
    }

    const categoryOptions = useMemo(
        () => CATEGORY_KEYS.map((k) => ({ value: k, label: t(`categories.${k}`) })),
        [t],
    )
    const areaOptions = useMemo(
        () => AREA_PRESET_KEYS.map((k) => ({ value: k, label: t(`areaPresets.${k}`) })),
        [t],
    )

    const statusColor = (s) => {
        if (s === 'resolved' || s === 'closed') return 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
        if (s === 'in_progress') return 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
        if (s === 'waiting_customer') return 'bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100'
        return 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
    }

    const categoryTagClass =
        'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('description')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('subject')}
                            </label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('subjectPlaceholder')}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t('category')}
                                </label>
                                <Select
                                    value={categoryOptions.find((o) => o.value === category)}
                                    onChange={(option) => setCategory(option?.value || 'bug')}
                                    options={categoryOptions}
                                    isSearchable={false}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                    {t('areaSection')}
                                </label>
                                <Select
                                    value={areaOptions.find((o) => o.value === areaPreset)}
                                    onChange={(option) => setAreaPreset(option?.value || 'schedule')}
                                    options={areaOptions}
                                    isSearchable={false}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('pagePath')}
                            </label>
                            <Input
                                value={pagePath}
                                onChange={(e) => setPagePath(e.target.value)}
                                placeholder={t('pagePathPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('body')}
                            </label>
                            <textarea
                                className="w-full min-h-[140px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder={t('bodyPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 block">
                                {t('attachments')}
                            </label>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">{t('attachmentsHint')}</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
                                onChange={onFileInputChange}
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={files.length >= MAX_FILES}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {t('addFiles')}
                                </Button>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {t('attachmentsCount', { current: files.length, max: MAX_FILES })}
                                </span>
                            </div>
                            {files.length > 0 && (
                                <ul className="mt-3 space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
                                    {files.map((f, i) => (
                                        <li
                                            key={`${f.name}-${i}-${f.size}`}
                                            className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800/50"
                                        >
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                {f.name}
                                            </span>
                                            <button
                                                type="button"
                                                className="shrink-0 text-sm font-bold text-primary hover:underline"
                                                onClick={() => removeFile(i)}
                                            >
                                                {t('removeFile')}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <Button type="submit" variant="solid" loading={createMutation.isPending}>
                            {createMutation.isPending ? t('submitting') : t('submit')}
                        </Button>
                    </form>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('listTitle')}</h4>
                        {listLoading ? (
                            <div className="flex justify-center py-12">
                                <Loading loading />
                            </div>
                        ) : !listData?.data?.length ? (
                            <EmptyStatePanel
                                icon={PiHeadset}
                                title={t('emptyTitle')}
                                hint={t('emptyHint')}
                            />
                        ) : (
                            <>
                                <div className="md:hidden space-y-4">
                                    {listData.data.map((row) => (
                                        <div
                                            key={row.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openDetail(row.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    openDetail(row.id)
                                                }
                                            }}
                                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1 min-w-0">
                                                    {row.subject}
                                                </h4>
                                                <Tag className={statusColor(row.status)}>{t(`status.${row.status}`)}</Tag>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
                                                <span className="text-gray-900 dark:text-gray-100">#{row.id}</span>
                                                <span className="text-gray-900 dark:text-gray-100">
                                                    {formatDateTime(row.createdAt, null, businessTz, 'short')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.id')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.subject')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.status')}
                                                </th>
                                                <th className="py-2 pr-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                    {t('columns.created')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {listData.data.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                    onClick={() => openDetail(row.id)}
                                                >
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        #{row.id}
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[240px] truncate">
                                                        {row.subject}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <Tag className={statusColor(row.status)}>
                                                            {t(`status.${row.status}`)}
                                                        </Tag>
                                                    </td>
                                                    <td className="py-3 pr-4 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                        {formatDateTime(row.createdAt, null, businessTz, 'short')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </AdaptiveCard>

            <Dialog
                isOpen={detailOpen}
                width={560}
                onClose={() => {
                    setDetailOpen(false)
                    setDetailId(null)
                }}
            >
                <div className="p-6 max-h-[85vh] overflow-y-auto">
                    {detailLoading || !detailData ? (
                        <div className="flex justify-center py-16">
                            <Loading loading />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
                                    {detailData.subject}
                                </h4>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">
                                    {t('detailMetaLine', {
                                        id: detailData.id,
                                        date: formatDateTime(
                                            detailData.createdAt,
                                            null,
                                            businessTz,
                                            'long',
                                        ),
                                    })}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Tag className={statusColor(detailData.status)}>{t(`status.${detailData.status}`)}</Tag>
                                <Tag className={categoryTagClass}>{t(`categories.${detailData.category}`)}</Tag>
                            </div>
                            {(detailData.areaSection || detailData.pagePath) && (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                                    {detailData.areaSection && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('areaSection')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {detailData.areaSection}
                                            </div>
                                        </div>
                                    )}
                                    {detailData.pagePath && (
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('pagePath')}
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 break-all">
                                                {detailData.pagePath}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{t('body')}</div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                    {detailData.body}
                                </p>
                            </div>
                            {detailData.adminPublicReply ? (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('adminReply')}
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                        {detailData.adminPublicReply}
                                    </p>
                                </div>
                            ) : null}
                            {detailData.attachments?.length > 0 && (
                                <div>
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('attachments')}
                                    </div>
                                    <ul className="space-y-2">
                                        {detailData.attachments.map((a) => (
                                            <li key={a.id}>
                                                <a
                                                    href={a.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-bold text-primary underline"
                                                >
                                                    {a.originalName}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="pt-2">
                                <Button
                                    variant="solid"
                                    onClick={() => {
                                        setDetailOpen(false)
                                        setDetailId(null)
                                    }}
                                >
                                    {t('close')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>
        </Container>
    )
}
