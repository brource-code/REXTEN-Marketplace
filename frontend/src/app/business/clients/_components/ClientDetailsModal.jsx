'use client'
import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Tabs from '@/components/ui/Tabs'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import { NumericFormat } from 'react-number-format'
import { PiPhone, PiEnvelope, PiCalendar, PiClock, PiNote, PiTrash, PiPencil, PiCamera, PiMapPin } from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientDetails, addClientNote, deleteClient, uploadClientAvatar } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ClientLoyaltyCard from './ClientLoyaltyCard'
import { ClientBookingDiscountRows } from './ClientBookingDiscountRows'
import EntityProfileHero from '@/components/shared/EntityProfileHero'
import ClientEditModal from './ClientEditModal'
import { usePermission } from '@/hooks/usePermission'

const { TabNav, TabList, TabContent } = Tabs

const statusColors = {
    regular: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    permanent: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    vip: 'bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-orange-100',
}

const ClientDetailsModal = ({ isOpen, onClose, client, onClientDeleted }) => {
    const t = useTranslations('business.clients.detailsModal')
    const tPage = useTranslations('business.clients.detailsPage')
    const tStatuses = useTranslations('business.clients.statuses')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    const canManageClients = usePermission('manage_clients')
    const [newNote, setNewNote] = useState('')
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const avatarFileInputRef = useRef(null)

    const { data: clientDetails, isLoading } = useQuery({
        queryKey: ['client-details', client?.id],
        queryFn: () => getClientDetails(client.id),
        enabled: !!client?.id && isOpen,
    })

    const addNoteMutation = useMutation({
        mutationFn: (note) => addClientNote(client.id, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-details', client.id] })
            setNewNote('')
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('noteSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('noteError')}
                </Notification>,
            )
        },
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: (file) => uploadClientAvatar(client.id, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-details', client.id] })
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('avatarUploadSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('avatarUploadError')}
                </Notification>,
            )
        },
    })

    const deleteClientMutation = useMutation({
        mutationFn: () => deleteClient(client.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-clients'] })
            queryClient.invalidateQueries({ queryKey: ['client-details', client.id] })
            setIsDeleteDialogOpen(false)
            onClose()
            if (onClientDeleted) {
                onClientDeleted()
            }
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('deleteSuccess') || 'Клиент успешно удален'}
                </Notification>,
            )
        },
        onError: (error) => {
            const errorMessage = error?.response?.data?.message || t('deleteError') || 'Не удалось удалить клиента'
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    if (!client) return null

    const bookings = clientDetails?.bookings || []
    const orders = clientDetails?.orders || []
    const notes = clientDetails?.notes || []

    const handleAddNote = () => {
        if (newNote.trim()) {
            addNoteMutation.mutate(newNote)
        }
    }

    const onAvatarFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadAvatarMutation.mutate(file)
        }
        e.target.value = ''
    }

    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    if (isLoading) {
        return (
            <Dialog isOpen={isOpen} onClose={onClose} width={900}>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </Dialog>
        )
    }

    const totalSpent = orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)

    const detail = clientDetails?.client || {}
    const displayName = detail.name || client.name
    const clientStatus = detail.status || client.status || 'regular'
    const statusLabelMap = {
        regular: tStatuses('regular'),
        permanent: tStatuses('permanent'),
        vip: tStatuses('vip'),
    }

    const editClientPayload = {
        id: client.id,
        name: displayName,
        email: detail.email || client.email,
        phone: detail.phone || client.phone,
        address: detail.address || client.address,
        status: clientStatus,
    }

    return (
        <>
        <Dialog isOpen={isOpen} onClose={onClose} width={900}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {tPage('subtitle')}
                        </p>
                    </div>
                    {canManageClients && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                                variant="plain"
                                size="sm"
                                icon={<PiPencil />}
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                {t('edit')}
                            </Button>
                            <Button
                                variant="plain"
                                size="sm"
                                icon={<PiTrash />}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                {t('delete') || 'Удалить'}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <Tabs defaultValue="info">
                        <TabList>
                            <TabNav value="info">{t('tabs.info')}</TabNav>
                            <TabNav value="bookings">{t('tabs.bookings')}</TabNav>
                            <TabNav value="orders">{t('tabs.orders')}</TabNav>
                            <TabNav value="notes">{t('tabs.notes')}</TabNav>
                        </TabList>

                        <div className="mt-4">
                            <TabContent value="info">
                                <EntityProfileHero
                                    name={displayName || 'N/A'}
                                    avatarSrc={detail.avatar || detail.img || client.img}
                                    initials={getInitials(displayName)}
                                    childrenTags={
                                        <Tag className={statusColors[clientStatus] || statusColors.regular}>
                                            {statusLabelMap[clientStatus] || tStatuses('regular')}
                                        </Tag>
                                    }
                                    childrenActions={
                                        canManageClients ? (
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
                                                    variant="plain"
                                                    size="sm"
                                                    icon={<PiCamera />}
                                                    loading={uploadAvatarMutation.isPending}
                                                    onClick={() => avatarFileInputRef.current?.click()}
                                                >
                                                    {t('changePhoto')}
                                                </Button>
                                            </>
                                        ) : null
                                    }
                                    childrenContact={
                                        <>
                                            <div className="flex items-center gap-2 text-sm">
                                                <PiEnvelope className="text-gray-400 shrink-0" />
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {detail.email || client.email || '—'}
                                                </span>
                                            </div>
                                            {(detail.phone || client.phone) ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiPhone className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {detail.phone || client.phone}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {(detail.address || client.address) ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiMapPin className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {detail.address || client.address}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <div className="flex items-center gap-2 text-sm">
                                                <PiCalendar className="text-gray-400 shrink-0" />
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('bookingsCount')}: </span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{bookings.length}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('spent')}:</span>
                                                <NumericFormat
                                                    displayType="text"
                                                    value={totalSpent}
                                                    prefix={'$'}
                                                    thousandSeparator={true}
                                                    className="text-sm font-bold text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            {client.lastVisit && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiClock className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                        {t('lastVisit')}:{' '}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {formatDate(client.lastVisit, timezone, 'short')}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    }
                                />
                                <div className="mt-6">
                                    <ClientLoyaltyCard loyalty={clientDetails?.loyalty} />
                                </div>
                            </TabContent>

                            <TabContent value="bookings">
                                <div className="space-y-4">
                                    {bookings.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noBookings')}</p>
                                        </div>
                                    ) : (
                                        bookings.map((booking) => (
                                            <Card key={booking.id} className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                            {booking.service?.name || t('serviceNotSpecified')}
                                                        </div>
                                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                            {booking.booking_date
                                                                ? formatDate(booking.booking_date, timezone, 'short')
                                                                : t('dateNotSpecified')}
                                                            {booking.booking_time && ` ${booking.booking_time}`}
                                                        </div>
                                                        {booking.specialist && (
                                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                                {t('specialist')}: {booking.specialist.profile?.first_name} {booking.specialist.profile?.last_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right ml-4 min-w-[140px]">
                                                        <NumericFormat
                                                            displayType="text"
                                                            value={booking.total_price || booking.price || 0}
                                                            prefix={'$'}
                                                            thousandSeparator={true}
                                                            className="text-sm font-bold text-gray-900 dark:text-gray-100"
                                                        />
                                                        {Number(booking.discount_amount) > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                                                <ClientBookingDiscountRows
                                                                    booking={booking}
                                                                    currency={booking.currency || 'USD'}
                                                                />
                                                            </div>
                                                        )}
                                                        <Badge
                                                            className={
                                                                booking.status === 'completed' || booking.status === 'confirmed'
                                                                    ? 'bg-emerald-500 mt-2'
                                                                    : booking.status === 'cancelled'
                                                                    ? 'bg-red-500 mt-2'
                                                                    : 'bg-gray-500 mt-2'
                                                            }
                                                        >
                                                            {t(`bookingStatuses.${booking.status || 'unknown'}`)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </TabContent>

                            <TabContent value="orders">
                                <div className="space-y-4">
                                    {orders.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noOrders')}</p>
                                        </div>
                                    ) : (
                                        orders.map((order) => (
                                            <Card key={order.id} className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                            {t('order')} <span className="text-gray-900 dark:text-gray-100">#{order.order_number || order.id}</span>
                                                        </div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            {order.created_at
                                                                ? formatDateTime(order.created_at, null, timezone, 'short')
                                                                : t('dateNotSpecified')}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <NumericFormat
                                                            displayType="text"
                                                            value={order.total || 0}
                                                            prefix={'$'}
                                                            thousandSeparator={true}
                                                            className="text-sm font-bold text-gray-900 dark:text-gray-100"
                                                        />
                                                        <Badge
                                                            className={
                                                                order.payment_status === 'paid'
                                                                    ? 'bg-emerald-500 mt-2'
                                                                    : order.status === 'completed'
                                                                    ? 'bg-blue-500 mt-2'
                                                                    : 'bg-gray-500 mt-2'
                                                            }
                                                        >
                                                            {order.payment_status === 'paid'
                                                                ? t('orderStatuses.paid')
                                                                : order.status === 'completed'
                                                                    ? t('orderStatuses.completed')
                                                                    : t('orderStatuses.processing')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </TabContent>

                            <TabContent value="notes">
                                <div className="space-y-4">
                                    <FormItem label={t('addNote')}>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder={t('notePlaceholder')}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddNote()
                                                    }
                                                }}
                                                disabled={addNoteMutation.isPending}
                                            />
                                            <Button
                                                variant="solid"
                                                onClick={handleAddNote}
                                                loading={addNoteMutation.isPending}
                                            >
                                                {t('addButton')}
                                            </Button>
                                        </div>
                                    </FormItem>

                                    <div className="space-y-3">
                                        {notes.length === 0 ? (
                                            <div className="text-center py-8">
                                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noNotes')}</p>
                                            </div>
                                        ) : (
                                            notes.map((note) => (
                                                <Card key={note.id} className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <PiNote className="text-gray-400 mt-1" />
                                                        <div className="flex-1">
                                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                                                {note.note}
                                                            </div>
                                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                                {t('added')} <span className="text-gray-900 dark:text-gray-100">{formatDateTime(note.createdAt, null, timezone, 'short')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </TabContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </Dialog>

        <ClientEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            client={editClientPayload}
        />

        <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            type="danger"
            title={t('deleteConfirmTitle') || 'Удалить клиента?'}
            onCancel={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => deleteClientMutation.mutate()}
            confirmText={t('deleteConfirm') || 'Удалить'}
            cancelText={tCommon('cancel') || 'Отмена'}
            loading={deleteClientMutation.isPending}
        >
            <p>{t('deleteConfirmMessage') || 'Вы уверены, что хотите удалить этого клиента? Это действие нельзя отменить.'}</p>
        </ConfirmDialog>
        </>
    )
}

export default ClientDetailsModal
