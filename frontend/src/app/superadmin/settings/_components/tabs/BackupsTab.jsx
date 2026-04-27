'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Tag from '@/components/ui/Tag'
import {
    createPlatformBackup,
    deletePlatformBackup,
    downloadPartnerSourceArchive,
    downloadPlatformBackup,
    getPlatformBackups,
} from '@/lib/api/superadmin'
import { PiArchive, PiArrowClockwise, PiDownloadSimple, PiPackage, PiTrash } from 'react-icons/pi'
import { formatSuperadminDateTime } from '@/utils/dateTime'

function formatMb(bytes) {
    if (!bytes || bytes <= 0) return '—'
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function backupStatusLabel(status, t) {
    switch (status) {
        case 'queued':
            return t('table.statusQueued')
        case 'processing':
            return t('table.statusProcessing')
        case 'completed':
            return t('table.statusCompleted')
        case 'failed':
            return t('table.statusFailedRun')
        default:
            return status || '—'
    }
}

export default function BackupsTab() {
    const t = useTranslations('superadmin.backups')
    const queryClient = useQueryClient()
    const [deleteId, setDeleteId] = useState(null)
    const [partnerExporting, setPartnerExporting] = useState(false)

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['admin-platform-backups'],
        queryFn: getPlatformBackups,
        refetchInterval: (query) => {
            const rows = query.state.data?.data ?? []
            const busy = rows.some((r) => r.status === 'queued' || r.status === 'processing')
            return busy ? 4000 : false
        },
    })

    const createMutation = useMutation({
        mutationFn: createPlatformBackup,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['admin-platform-backups'] })
            toast.push(
                <Notification title={t('createQueued')} type="success">
                    {res.filename} — {t('createQueuedHint')}
                </Notification>,
            )
        },
        onError: (err) => {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                t('createError')
            const status = err?.response?.status
            const isConflict = status === 409
            const isConfig = status === 503
            toast.push(
                <Notification
                    title={isConflict ? t('conflictTitle') : isConfig ? t('s3NotReadyTitle') : t('createError')}
                    type={isConflict || isConfig ? 'warning' : 'danger'}
                >
                    {typeof msg === 'string' ? msg : t('createError')}
                </Notification>,
            )
        },
    })

    const handlePartnerExport = async () => {
        setPartnerExporting(true)
        try {
            await downloadPartnerSourceArchive()
            toast.push(<Notification title={t('partnerExportSuccess')} type="success" />)
        } catch (e) {
            const msg = e instanceof Error ? e.message : t('partnerExportError')
            toast.push(
                <Notification title={t('partnerExportError')} type="danger">
                    {msg}
                </Notification>,
            )
        } finally {
            setPartnerExporting(false)
        }
    }

    const deleteMutation = useMutation({
        mutationFn: deletePlatformBackup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-platform-backups'] })
            toast.push(
                <Notification title={t('deleteSuccess')} type="success">
                    {t('deleteSuccess')}
                </Notification>,
            )
            setDeleteId(null)
        },
        onError: () => {
            toast.push(
                <Notification title={t('deleteError')} type="danger">
                    {t('deleteError')}
                </Notification>,
            )
        },
    })

    const rows = data?.data ?? []
    const cfg = data?.config

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[320px]">
                <Loading loading />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <PiArchive className="text-xl" />
                        {t('title')}
                    </h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
                        {t('description')}
                    </p>
                    {!cfg?.s3Configured ? (
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-2 max-w-3xl">
                            {t('s3RequiredHint')}
                        </p>
                    ) : null}
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-2">{t('hintDocs')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="solid"
                        type="button"
                        loading={createMutation.isPending}
                        disabled={createMutation.isPending || !cfg?.s3Configured}
                        onClick={() => createMutation.mutate()}
                    >
                        {createMutation.isPending ? t('creating') : t('create')}
                    </Button>
                    <Button
                        variant="plain"
                        type="button"
                        icon={<PiArrowClockwise />}
                        loading={isFetching && !isLoading}
                        onClick={() => refetch()}
                    >
                        {t('refresh')}
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex gap-3">
                        <PiPackage className="text-xl shrink-0 text-gray-700 dark:text-gray-200 mt-0.5" />
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {t('partnerExportTitle')}
                            </div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                                {t('partnerExportHint')}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="solid"
                        type="button"
                        loading={partnerExporting}
                        disabled={partnerExporting}
                        icon={<PiDownloadSimple />}
                        className="shrink-0"
                        onClick={handlePartnerExport}
                    >
                        {partnerExporting ? t('partnerExportBuilding') : t('partnerExport')}
                    </Button>
                </div>
            </div>

            {cfg && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{t('config.title')}</div>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('config.projectRoot')}: </span>
                            <span className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all">
                                {cfg.projectRoot || '—'}
                            </span>
                        </div>
                        <div>
                            {t('config.docker')}:{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                                {cfg.dockerEnabled ? t('config.dockerOn') : t('config.dockerOff')}
                            </span>
                        </div>
                        <div className="sm:col-span-2">
                            {t('config.s3')}:{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                                {cfg.s3Enabled === false
                                    ? t('config.s3FlagOff')
                                    : cfg.s3Configured
                                      ? t('config.s3On')
                                      : t('config.s3Off')}
                            </span>
                            {cfg.s3Enabled && cfg.s3Bucket ? (
                                <span className="text-gray-900 dark:text-gray-100 font-mono text-xs ml-1">
                                    ({cfg.s3Bucket})
                                </span>
                            ) : null}
                        </div>
                        <div className="sm:col-span-2">
                            {t('config.s3Keep')}:{' '}
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {typeof cfg.s3KeepBackups === 'number' ? cfg.s3KeepBackups : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {rows.length === 0 ? (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('empty')}</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-left">
                            <tr>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.file')}
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.size')}
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.created')}
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.trigger')}
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.status')}
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.s3')}
                                </th>
                                <th className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('table.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-t border-gray-200 dark:border-gray-700"
                                >
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[220px] break-all">
                                        {row.filename}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        {formatMb(row.sizeBytes)}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        {row.createdAt ? formatSuperadminDateTime(row.createdAt) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Tag className="text-xs font-bold">
                                            {row.trigger === 'scheduled'
                                                ? t('table.triggerScheduled')
                                                : t('table.triggerManual')}
                                        </Tag>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Tag className="text-xs font-bold">
                                            {backupStatusLabel(row.status, t)}
                                        </Tag>
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.s3Ok ? (
                                            <Tag className="bg-emerald-100 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100">
                                                OK
                                            </Tag>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="plain"
                                                type="button"
                                                disabled={row.status !== 'completed' || !row.s3Ok}
                                                icon={<PiDownloadSimple />}
                                                onClick={() =>
                                                    downloadPlatformBackup(row.id, row.filename).catch(() => {
                                                        toast.push(
                                                            <Notification title={t('downloadError')} type="danger" />,
                                                        )
                                                    })
                                                }
                                            >
                                                {t('table.download')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="plain"
                                                type="button"
                                                className="text-red-600 dark:text-red-400"
                                                icon={<PiTrash />}
                                                onClick={() => setDeleteId(row.id)}
                                            >
                                                {t('table.delete')}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                isOpen={deleteId != null}
                type="danger"
                title={t('table.delete')}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                cancelText={t('cancel')}
                confirmText={t('table.delete')}
            >
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('deleteConfirmS3')}</p>
            </ConfirmDialog>
        </div>
    )
}
