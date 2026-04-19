'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { formatDateLocalized } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'
import { useBusinessApiTokensQuery, useRevokeBusinessApiTokenMutation } from '@/hooks/api/useBusinessApiTokens'
import CreateTokenDialog from '../CreateTokenDialog'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

function KeyIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H3.75v-1.051c0-1.051.722-1.982 1.752-2.229l2.147-2.146a1.2 1.2 0 01.43-1.563A6 6 0 1121.75 8.25z"
            />
        </svg>
    )
}

export default function TokensTab() {
    const t = useTranslations('business.api.tokens')
    const { settings } = useBusinessStore()
    const tz = settings?.timezone || 'America/Los_Angeles'
    const locale = useLocale()
    const { hasFeature } = useSubscriptionLimits()
    const apiAllowed = hasFeature('api_access')
    const { data: tokens, isLoading, isError, refetch } = useBusinessApiTokensQuery(apiAllowed)
    const revokeMutation = useRevokeBusinessApiTokenMutation()
    const [createOpen, setCreateOpen] = useState(false)

    const onRevoke = async (id) => {
        if (!window.confirm(t('revokeConfirm'))) {
            return
        }
        try {
            await revokeMutation.mutateAsync(id)
        } catch {
            toast.push(
                <Notification type="danger" duration={4000}>
                    {t('errors.revokeFailed')}
                </Notification>,
            )
        }
    }

    if (!apiAllowed) {
        return null
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                {t('errors.loadFailed')}
            </div>
        )
    }

    const hasTokens = Boolean(tokens?.length)

    return (
        <div className="flex flex-col gap-4">
            {hasTokens ? (
                <>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="solid" size="sm" onClick={() => setCreateOpen(true)}>
                            {t('create')}
                        </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/80">
                                    <th className="text-left py-2 px-3 font-bold text-gray-500 dark:text-gray-400">{t('name')}</th>
                                    <th className="text-left py-2 px-3 font-bold text-gray-500 dark:text-gray-400">{t('prefix')}</th>
                                    <th className="text-left py-2 px-3 font-bold text-gray-500 dark:text-gray-400">{t('lastUsed')}</th>
                                    <th className="text-left py-2 px-3 font-bold text-gray-500 dark:text-gray-400">{t('expiresAt')}</th>
                                    <th className="text-right py-2 px-3 font-bold text-gray-500 dark:text-gray-400" />
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((row) => (
                                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/80 last:border-0">
                                        <td className="py-2 px-3 text-sm font-bold text-gray-900 dark:text-gray-100">{row.name}</td>
                                        <td className="py-2 px-3 text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
                                            {row.prefix || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.last_used_at ? formatDateLocalized(row.last_used_at, tz, locale) : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {row.expires_at ? formatDateLocalized(row.expires_at, tz, locale) : t('never')}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="plain"
                                                className="text-red-600 dark:text-red-400"
                                                loading={revokeMutation.isPending}
                                                onClick={() => onRevoke(row.id)}
                                            >
                                                {t('revoke')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 py-16 px-6 text-center dark:border-gray-600 dark:bg-gray-900/60">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle text-primary dark:bg-primary/15 dark:text-primary-mild">
                        <KeyIcon className="h-8 w-8" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('emptyTitle')}</h5>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('emptyHint')}</p>
                    </div>
                    <Button variant="solid" size="sm" onClick={() => setCreateOpen(true)}>
                        {t('create')}
                    </Button>
                </div>
            )}

            <CreateTokenDialog
                isOpen={createOpen}
                onClose={() => {
                    setCreateOpen(false)
                    refetch()
                }}
            />
        </div>
    )
}
