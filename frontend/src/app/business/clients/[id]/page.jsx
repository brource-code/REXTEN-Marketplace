'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'
import {
    PiPhone,
    PiEnvelope,
    PiClock,
    PiNote,
    PiMapPin,
    PiTrash,
    PiPencil,
    PiCamera,
    PiXCircle,
    PiCurrencyDollar,
    PiCheckCircle,
} from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientDetails, addClientNote, deleteClient, uploadClientAvatar } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ClientEditModal from '../_components/ClientEditModal'
import ClientSummaryCard from './_components/ClientSummaryCard'
import ClientLoyaltyCard from '../_components/ClientLoyaltyCard'
import BookingsFilter from './_components/BookingsFilter'
import ClientBookingsTabList from './_components/ClientBookingsTabList'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermission } from '@/hooks/usePermission'
import classNames from '@/utils/classNames'

export default function ClientDetailsPage() {
    return (
        <PermissionGuard permission="view_clients">
            <ClientDetailsPageContent />
        </PermissionGuard>
    )
}

function ClientStatCard({ title, value, prefix, icon: Icon, color }) {
    return (
        <Card>
            <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="mb-0.5 break-words text-[10px] font-bold text-gray-500 dark:text-gray-400 sm:mb-1 sm:truncate sm:text-sm">
                        {title}
                    </div>
                    <div className="break-words text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100 sm:truncate sm:text-sm md:text-lg">
                        {prefix ? (
                            <NumericFormat
                                displayType="text"
                                value={value}
                                prefix={prefix}
                                thousandSeparator
                                decimalScale={2}
                            />
                        ) : (
                            value
                        )}
                    </div>
                </div>
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${color}`}
                >
                    <Icon className="text-base sm:text-xl" aria-hidden />
                </div>
            </div>
        </Card>
    )
}

function ClientDetailsPageContent() {
    const t = useTranslations('business.clients')
    const canManageClients = usePermission('manage_clients')
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'

    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const clientId = parseInt(params.id)
    const [newNote, setNewNote] = useState('')
    const [activeTab, setActiveTab] = useState('info')
    const [filters, setFilters] = useState({
        status: undefined,
        sort_by: 'booking_date',
        sort_order: 'desc',
    })
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const avatarFileInputRef = useRef(null)

    const { data: clientDetails, isLoading } = useQuery({
        queryKey: ['client-details', clientId, filters],
        queryFn: () => getClientDetails(clientId, filters),
        enabled: !!clientId,
    })

    useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const id = window.setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 120)
        return () => window.clearTimeout(id)
    }, [activeTab])

    const addNoteMutation = useMutation({
        mutationFn: (note) => addClientNote(clientId, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] })
            setNewNote('')
            toast.push(
                <Notification title={t('detailsPage.notifications.success')} type="success">
                    {t('detailsModal.noteSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={t('detailsPage.notifications.error')} type="danger">
                    {t('detailsModal.noteError')}
                </Notification>,
            )
        },
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: (file) => uploadClientAvatar(clientId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] })
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            toast.push(
                <Notification title={t('detailsPage.notifications.success')} type="success">
                    {t('detailsPage.avatarUploadSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={t('detailsPage.notifications.error')} type="danger">
                    {t('detailsPage.avatarUploadError')}
                </Notification>,
            )
        },
    })

    const deleteClientMutation = useMutation({
        mutationFn: () => deleteClient(clientId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            queryClient.invalidateQueries({ queryKey: ['client-details', clientId] })
            setIsDeleteDialogOpen(false)
            toast.push(
                <Notification title={t('detailsPage.notifications.success')} type="success">
                    {t('detailsPage.deleteSuccess') || 'Клиент успешно удален'}
                </Notification>,
            )
            router.push('/business/clients')
        },
        onError: (error) => {
            const errorMessage =
                error?.response?.data?.message || t('detailsPage.deleteError') || 'Не удалось удалить клиента'
            toast.push(
                <Notification title={t('detailsPage.notifications.error')} type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    const bookings = clientDetails?.bookings || []
    const notes = clientDetails?.notes || []
    const summary = clientDetails?.summary
    const client = clientDetails?.client || clientDetails

    const clientStatus = client?.status || clientDetails?.status || 'regular'

    const handleAddNote = () => {
        if (newNote.trim()) {
            addNoteMutation.mutate(newNote)
        }
    }

    const bookingsStats = {
        pending: bookings.filter((b) => b.status === 'pending' || b.status === 'new').length,
        confirmed: bookings.filter((b) => b.status === 'confirmed').length,
        completed: summary?.completedBookings || bookings.filter((b) => b.status === 'completed').length,
        cancelled: summary?.cancelledBookings || bookings.filter((b) => b.status === 'cancelled').length,
    }

    const totalSpentFromBookings = bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, booking) => sum + parseFloat(booking.total_price || booking.price || 0), 0)
    const totalSpentRaw = summary?.totalSpent != null ? summary.totalSpent : totalSpentFromBookings
    const totalSpent = Number.isFinite(Number(totalSpentRaw)) ? Number(totalSpentRaw) : 0

    const filteredBookingsTotal = bookings.reduce(
        (sum, booking) => sum + parseFloat(booking.total_price || booking.price || 0),
        0,
    )

    const statusColorMap = {
        regular: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
        permanent: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
        vip: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
    }
    const statusLabelMap = {
        regular: t('statuses.regular'),
        permanent: t('statuses.permanent'),
        vip: t('statuses.vip'),
    }

    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    const onAvatarFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadAvatarMutation.mutate(file)
        }
        e.target.value = ''
    }

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex max-w-full flex-col gap-4 overflow-x-hidden">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('detailsPage.title')}
                            </h4>
                            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('detailsPage.subtitle')}
                            </p>
                        </div>
                        <div className="flex min-h-[320px] items-center justify-center py-12">
                            <Loading loading />
                        </div>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (!clientDetails || !client) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex max-w-full flex-col gap-4 overflow-x-hidden py-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('detailsPage.title')}
                            </h4>
                            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('detailsPage.subtitle')}
                            </p>
                        </div>
                        <div className="py-10 text-center">
                            <p className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('detailsPage.clientNotFound') || 'Клиент не найден'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button variant="solid" onClick={() => router.push('/business/clients')}>
                                    {t('detailsPage.backToList') || 'Вернуться к списку'}
                                </Button>
                                {canManageClients && clientId && (
                                    <Button
                                        variant="outline"
                                        icon={<PiTrash />}
                                        className="border-red-200 text-red-600 hover:border-red-300 dark:border-red-900/50 dark:text-red-400"
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                    >
                                        {t('detailsPage.delete') || 'Удалить'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </AdaptiveCard>

                <ConfirmDialog
                    isOpen={isDeleteDialogOpen}
                    type="danger"
                    title={t('detailsPage.deleteConfirmTitle') || 'Удалить клиента?'}
                    onCancel={() => setIsDeleteDialogOpen(false)}
                    onConfirm={() => deleteClientMutation.mutate()}
                    confirmText={t('detailsPage.deleteConfirm') || 'Удалить'}
                    cancelText={t('detailsPage.cancel') || 'Отмена'}
                    loading={deleteClientMutation.isPending}
                >
                    <p>
                        {t('detailsPage.deleteConfirmMessage') ||
                            'Вы уверены, что хотите удалить этого клиента? Это действие нельзя отменить.'}
                    </p>
                </ConfirmDialog>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex max-w-full flex-col gap-4 overflow-x-hidden">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">
                                {client.name?.trim() || t('detailsPage.title')}
                            </h4>
                            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('detailsPage.subtitle')}
                            </p>
                        </div>
                        {canManageClients && (
                            <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<PiPencil />}
                                    onClick={() => setIsEditModalOpen(true)}
                                >
                                    {t('detailsPage.edit')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<PiTrash />}
                                    className="border-red-200 text-red-600 hover:border-red-300 dark:border-red-900/50 dark:text-red-400"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    {t('detailsPage.delete')}
                                </Button>
                            </div>
                        )}
                    </div>

                    <SegmentTabBar
                        value={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { value: 'info', label: t('detailsPage.tabs.info') },
                            { value: 'bookings', label: t('detailsPage.tabs.bookings') },
                            { value: 'notes', label: t('detailsPage.tabs.notes') },
                        ]}
                    />

                    <div className="mt-4">
                        <div className={classNames(activeTab !== 'info' && 'hidden')}>
                            <div className="space-y-4">
                            <Card>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                    <div className="flex flex-col items-center gap-3 sm:items-start">
                                        <Avatar
                                            size={88}
                                            shape="circle"
                                            className="ring-2 ring-gray-100 dark:ring-gray-800"
                                            src={client.avatar || client.img || undefined}
                                        >
                                            {getInitials(client.name)}
                                        </Avatar>
                                        {canManageClients ? (
                                            <>
                                                <input
                                                    ref={avatarFileInputRef}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                                    className="hidden"
                                                    onChange={onAvatarFileChange}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<PiCamera />}
                                                    loading={uploadAvatarMutation.isPending}
                                                    onClick={() => avatarFileInputRef.current?.click()}
                                                >
                                                    {t('detailsPage.changePhoto')}
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                                            <Tag className={statusColorMap[clientStatus] || statusColorMap.regular}>
                                                {statusLabelMap[clientStatus] || t('statuses.regular')}
                                            </Tag>
                                        </div>
                                        <div className="space-y-2.5 border-t border-gray-200 pt-3 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <PiEnvelope className="shrink-0 text-gray-400" aria-hidden />
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {client.email || '—'}
                                                </span>
                                            </div>
                                            {client.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <PiPhone className="shrink-0 text-gray-400" aria-hidden />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {client.phone}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {client.address ? (
                                                <div className="flex items-center gap-2">
                                                    <PiMapPin className="shrink-0 text-gray-400" aria-hidden />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {client.address}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {client.lastVisit ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <PiClock className="shrink-0 text-gray-400" aria-hidden />
                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                        {t('detailsModal.lastVisit')}:
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {formatDate(client.lastVisit, timezone, 'short')}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div>
                                <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-base">
                                    {t('detailsPage.statsSectionTitle')}
                                </h4>
                                <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-3">
                                    <ClientStatCard
                                        title={t('detailsPage.stats.current')}
                                        value={bookingsStats.pending + bookingsStats.confirmed}
                                        icon={PiClock}
                                        color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                    />
                                    <ClientStatCard
                                        title={t('detailsPage.stats.completed')}
                                        value={bookingsStats.completed}
                                        icon={PiCheckCircle}
                                        color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    />
                                    <ClientStatCard
                                        title={t('detailsPage.stats.cancelled')}
                                        value={bookingsStats.cancelled}
                                        icon={PiXCircle}
                                        color="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                    />
                                    <ClientStatCard
                                        title={t('detailsPage.stats.spent')}
                                        value={totalSpent}
                                        prefix="$"
                                        icon={PiCurrencyDollar}
                                        color="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                    />
                                </div>
                            </div>

                            {summary ? (
                                <ClientSummaryCard summary={summary} currency={bookings[0]?.currency || 'USD'} />
                            ) : null}

                            <ClientLoyaltyCard loyalty={clientDetails?.loyalty} />
                            </div>
                        </div>

                        <div className={classNames(activeTab !== 'bookings' && 'hidden')}>
                            <div className="space-y-4">
                                    <Card>
                                        <div className="flex flex-col gap-4">
                                            <BookingsFilter
                                                filters={filters}
                                                onFiltersChange={setFilters}
                                                bookingsCount={bookings.length}
                                                totalAmount={filteredBookingsTotal}
                                                currency={bookings[0]?.currency || 'USD'}
                                            />
                                        </div>
                                    </Card>
                                    <ClientBookingsTabList
                                        clientId={clientId}
                                        bookings={bookings}
                                        timezone={timezone}
                                    />
                            </div>
                        </div>

                        <div className={classNames(activeTab !== 'notes' && 'hidden')}>
                            <div className="space-y-4">
                            {canManageClients ? (
                                <Card>
                                    <div className="flex flex-col gap-4">
                                        <FormItem label={t('detailsPage.notes.addNote')}>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <Input
                                                    className="flex-1"
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    placeholder={t('detailsPage.notes.notePlaceholder')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddNote()
                                                        }
                                                    }}
                                                    disabled={addNoteMutation.isPending}
                                                />
                                                <Button
                                                    variant="solid"
                                                    className="shrink-0 sm:self-end"
                                                    onClick={handleAddNote}
                                                    loading={addNoteMutation.isPending}
                                                >
                                                    {t('detailsPage.notes.addButton')}
                                                </Button>
                                            </div>
                                        </FormItem>
                                    </div>
                                </Card>
                            ) : null}

                            <div className="space-y-3">
                                {notes.length === 0 ? (
                                    <Card>
                                        <div className="py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('detailsPage.notes.noNotes')}
                                        </div>
                                    </Card>
                                ) : (
                                    notes.map((note) => (
                                        <Card key={note.id}>
                                            <div className="flex items-start gap-3">
                                                <PiNote
                                                    className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500"
                                                    aria-hidden
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {note.note}
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                        {t('detailsPage.notes.added')}{' '}
                                                        {formatDateTime(note.createdAt, null, timezone, 'short')}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AdaptiveCard>

            <ClientEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                client={
                    client
                        ? {
                              id: client.id,
                              name: client.name,
                              email: client.email,
                              phone: client.phone,
                              address: client.address,
                              status: clientStatus,
                          }
                        : null
                }
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={t('detailsPage.deleteConfirmTitle') || 'Удалить клиента?'}
                onCancel={() => setIsDeleteDialogOpen(false)}
                onConfirm={() => deleteClientMutation.mutate()}
                confirmText={t('detailsPage.deleteConfirm') || 'Удалить'}
                cancelText={t('detailsPage.cancel') || 'Отмена'}
                loading={deleteClientMutation.isPending}
            >
                <p>
                    {t('detailsPage.deleteConfirmMessage') ||
                        'Вы уверены, что хотите удалить этого клиента? Это действие нельзя отменить.'}
                </p>
            </ConfirmDialog>
        </Container>
    )
}
