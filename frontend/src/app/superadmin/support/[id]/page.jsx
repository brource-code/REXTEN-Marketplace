'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Loading from '@/components/shared/Loading'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import { getAdminSupportTicket, updateAdminSupportTicket } from '@/lib/api/superadmin'
import { formatDateTime } from '@/utils/dateTime'
import toast from '@/components/ui/toast'
import { PiArrowLeft } from 'react-icons/pi'

const STATUS_KEYS = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']

function MetaRow({ label, value }) {
    return (
        <div className="py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{label}</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 break-all">{value ?? '—'}</div>
        </div>
    )
}

export default function SuperadminSupportDetailPage() {
    const t = useTranslations('superadmin.support')
    const router = useRouter()
    const params = useParams()
    const id = Number(params?.id)
    const queryClient = useQueryClient()

    const [note, setNote] = useState('')
    const [publicReply, setPublicReply] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-support-ticket', id],
        queryFn: () => getAdminSupportTicket(id),
        enabled: Number.isFinite(id),
    })

    useEffect(() => {
        if (data?.adminInternalNote !== undefined) {
            setNote(data.adminInternalNote || '')
        }
        if (data?.adminPublicReply !== undefined) {
            setPublicReply(data.adminPublicReply || '')
        }
    }, [data?.id, data?.adminInternalNote, data?.adminPublicReply])

    const statusOptions = useMemo(
        () => STATUS_KEYS.map((k) => ({ value: k, label: t(`status.${k}`) })),
        [t],
    )

    const mutation = useMutation({
        mutationFn: (payload) => updateAdminSupportTicket(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', id] })
            queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
            queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
            toast.push(
                <Notification title={t('savedTitle')} type="success">
                    {t('saved')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={t('errorTitle')} type="danger">
                    {t('saveError')}
                </Notification>,
            )
        },
    })

    const statusColor = (s) => {
        if (s === 'resolved' || s === 'closed') return 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
        if (s === 'in_progress') return 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
        if (s === 'waiting_customer') return 'bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100'
        return 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
    }

    const categoryTagClass =
        'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'

    if (!Number.isFinite(id)) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-red-500">{t('invalidId')}</p>
                </AdaptiveCard>
            </Container>
        )
    }

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex justify-center py-20">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (error || !data) {
        return (
            <Container>
                <AdaptiveCard>
                    <p className="text-sm font-bold text-red-500">{t('loadError')}</p>
                </AdaptiveCard>
            </Container>
        )
    }

    const company = data.company || {}
    const owner = data.companyOwner || {}
    const sub = data.submitter || {}
    const profile = sub.profile || {}

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <Button
                            variant="plain"
                            icon={<PiArrowLeft />}
                            onClick={() => router.push('/superadmin/support')}
                        >
                            {t('detailBack')}
                        </Button>
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('detailHeading', { id: data.id })}
                            </h4>
                            <Tag className={categoryTagClass}>{t(`categories.${data.category}`)}</Tag>
                            <Tag className={statusColor(data.status)}>{t(`status.${data.status}`)}</Tag>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('ticketSection')}</h4>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{data.subject}</p>
                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('description')}</div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap mb-4">
                            {data.body}
                        </p>
                        {data.areaSection && <MetaRow label={t('areaSection')} value={data.areaSection} />}
                        {data.pagePath && <MetaRow label={t('pagePath')} value={data.pagePath} />}
                        <MetaRow
                            label={t('created')}
                            value={formatDateTime(data.createdAt, null, 'America/Los_Angeles', 'long')}
                        />
                        {data.attachments?.length > 0 && (
                            <div className="mt-4">
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {t('attachments')}
                                </div>
                                <ul className="space-y-1">
                                    {data.attachments.map((a) => (
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
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('companySection')}</h4>
                            <MetaRow label={t('companyName')} value={company.name} />
                            <MetaRow label={t('companyId')} value={company.id != null ? String(company.id) : null} />
                            <MetaRow label={t('companySlug')} value={company.slug} />
                            <MetaRow label={t('companyEmail')} value={company.email} />
                            <MetaRow label={t('companyPhone')} value={company.phone} />
                            <MetaRow label={t('companyStatus')} value={company.status} />
                            <MetaRow label={t('timezone')} value={company.timezone} />
                            <MetaRow label={t('cityState')} value={[company.city, company.state].filter(Boolean).join(', ')} />
                            {company.id != null && (
                                <div className="mt-3">
                                    <Link
                                        href={`/superadmin/companies/${company.id}`}
                                        className="text-sm font-bold text-primary underline"
                                    >
                                        {t('openCompany')}
                                    </Link>
                                </div>
                            )}
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-4">{t('ownerSection')}</h4>
                            <MetaRow label={t('ownerName')} value={owner.name} />
                            <MetaRow label={t('ownerEmail')} value={owner.email} />
                            <MetaRow label={t('ownerLocale')} value={owner.locale} />
                        </div>

                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('submitterSection')}</h4>
                            <MetaRow label={t('submitterId')} value={sub.id != null ? String(sub.id) : null} />
                            <MetaRow label={t('submitterEmail')} value={sub.email} />
                            <MetaRow label={t('submitterRole')} value={sub.role} />
                            <MetaRow label={t('submitterLocale')} value={sub.locale} />
                            <MetaRow
                                label={t('lastLogin')}
                                value={
                                    sub.lastLoginAt
                                        ? formatDateTime(sub.lastLoginAt, null, 'America/Los_Angeles', 'long')
                                        : null
                                }
                            />
                            <MetaRow label={t('emailVerified')} value={sub.emailVerifiedAt ? t('yes') : t('no')} />
                            <MetaRow label={t('isActive')} value={sub.isActive ? t('yes') : t('no')} />
                            <MetaRow label={t('isBlocked')} value={sub.isBlocked ? t('yes') : t('no')} />
                            <MetaRow label={t('profileName')} value={profile.fullName} />
                            <MetaRow label={t('profilePhone')} value={profile.phone} />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('clientMetaSection')}</h4>
                        <pre className="text-xs font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto max-h-[280px]">
                            {JSON.stringify(data.clientMeta, null, 2)}
                        </pre>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('adminActions')}</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {t('statusLabel')}
                                </label>
                                <Select
                                    value={statusOptions.find((o) => o.value === data.status)}
                                    onChange={(option) => {
                                        const next = option?.value
                                        if (next && next !== data.status) {
                                            mutation.mutate({ status: next, publicReply })
                                        }
                                    }}
                                    options={statusOptions}
                                    isSearchable={false}
                                    isDisabled={mutation.isPending}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {t('publicReply')}
                                </label>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {t('publicReplyHint')}
                                </p>
                                <textarea
                                    className="w-full min-h-[100px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                                    value={publicReply}
                                    onChange={(e) => setPublicReply(e.target.value)}
                                    placeholder={t('publicReplyPlaceholder')}
                                />
                                <Button
                                    className="mt-2"
                                    variant="solid"
                                    loading={mutation.isPending}
                                    onClick={() => mutation.mutate({ publicReply })}
                                >
                                    {t('savePublicReply')}
                                </Button>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {t('internalNote')}
                                </label>
                                <textarea
                                    className="w-full min-h-[100px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={t('internalNotePlaceholder')}
                                />
                                <Button
                                    className="mt-2"
                                    variant="solid"
                                    loading={mutation.isPending}
                                    onClick={() => mutation.mutate({ adminInternalNote: note })}
                                >
                                    {t('saveNote')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}
