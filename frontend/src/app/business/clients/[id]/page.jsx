'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import EntityProfileHero from '@/components/shared/EntityProfileHero'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Card from '@/components/ui/Card'
import { NumericFormat } from 'react-number-format'
import { PiPhone, PiEnvelope, PiCalendar, PiClock, PiNote, PiArrowLeft, PiArrowRight, PiUser, PiMapPin, PiStar, PiTrash, PiPencil, PiCamera } from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientDetails, addClientNote, deleteClient, uploadClientAvatar } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { formatCurrency } from '@/utils/formatCurrency'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ClientEditModal from '../_components/ClientEditModal'
import ClientSummaryCard from './_components/ClientSummaryCard'
import ClientLoyaltyCard from '../_components/ClientLoyaltyCard'
import { ClientBookingDiscountRows } from '../_components/ClientBookingDiscountRows'
import BookingsFilter from './_components/BookingsFilter'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import PermissionGuard from '@/components/shared/PermissionGuard'
import { usePermission } from '@/hooks/usePermission'

const { TabNav, TabList, TabContent } = Tabs

const statusColors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function ClientDetailsPage() {
    return (
        <PermissionGuard permission="view_clients">
            <ClientDetailsPageContent />
        </PermissionGuard>
    )
}

function ClientDetailsPageContent() {
    const t = useTranslations('business.clients')
    const locale = useLocale()
    const canManageClients = usePermission('manage_clients')
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(price || 0)
    }
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const clientId = parseInt(params.id)
    const [newNote, setNewNote] = useState('')
    const [activeTab, setActiveTab] = useState('info')
    const [filters, setFilters] = useState({
        status: undefined,
        date_from: undefined,
        date_to: undefined,
        sort_by: 'booking_date',
        sort_order: 'desc',
    })
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const avatarFileInputRef = useRef(null)

    const statusLabels = {
        new: t('detailsModal.bookingStatuses.new'),
        pending: t('detailsModal.bookingStatuses.pending'),
        confirmed: t('detailsModal.bookingStatuses.confirmed'),
        completed: t('detailsModal.bookingStatuses.completed'),
        cancelled: t('detailsModal.bookingStatuses.cancelled'),
    }

    const { data: clientDetails, isLoading } = useQuery({
        queryKey: ['client-details', clientId, filters],
        queryFn: () => getClientDetails(clientId, filters),
        enabled: !!clientId,
    })

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
            const errorMessage = error?.response?.data?.message || t('detailsPage.deleteError') || 'Не удалось удалить клиента'
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
    
    // Получаем статус клиента из списка клиентов или из деталей
    const clientStatus = client?.status || clientDetails?.status || 'regular'

    const handleAddNote = () => {
        if (newNote.trim()) {
            addNoteMutation.mutate(newNote)
        }
    }

    // Вычисляем статистику по бронированиям (для отображения на вкладке Информация)
    const bookingsStats = {
        total: summary?.totalBookings || bookings.length,
        pending: bookings.filter(b => b.status === 'pending' || b.status === 'new').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: summary?.completedBookings || bookings.filter(b => b.status === 'completed').length,
        cancelled: summary?.cancelledBookings || bookings.filter(b => b.status === 'cancelled').length,
    }

    // Вычисляем общую сумму потраченную на завершенные бронирования
    const totalSpent = summary?.totalSpent || bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, booking) => {
            return sum + (parseFloat(booking.total_price || booking.price || 0))
        }, 0)

    // Вычисляем сумму отфильтрованных бронирований
    const filteredBookingsTotal = bookings.reduce((sum, booking) => {
        return sum + (parseFloat(booking.total_price || booking.price || 0))
    }, 0)

    // Статус клиента
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

    // Получаем инициалы для аватара
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
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    if (!clientDetails || !client) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="text-center py-12">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{t('detailsPage.clientNotFound') || 'Клиент не найден'}</p>
                        <div className="flex gap-2 justify-center">
                        <Button
                            variant="solid"
                            onClick={() => router.push('/business/clients')}
                        >
                                {t('detailsPage.backToList') || 'Вернуться к списку'}
                            </Button>
                            {canManageClients && clientId && (
                                <Button
                                    variant="plain"
                                    icon={<PiTrash />}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    {t('detailsPage.delete') || 'Удалить'}
                        </Button>
                            )}
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
                    <p>{t('detailsPage.deleteConfirmMessage') || 'Вы уверены, что хотите удалить этого клиента? Это действие нельзя отменить.'}</p>
                </ConfirmDialog>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    {/* Заголовок: мобилка — один ряд-тулбар; sm+ — как раньше */}
                    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <button
                                type="button"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 active:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 dark:active:bg-gray-700"
                                aria-label={t('detailsPage.back')}
                                onClick={() => router.push('/business/clients')}
                            >
                                <PiArrowLeft className="text-xl" />
                            </button>
                            <h4 className="min-w-0 flex-1 truncate text-lg font-bold leading-snug text-gray-900 dark:text-gray-100 sm:text-xl">
                                {client.name?.trim() || t('detailsPage.title')}
                            </h4>
                        </div>
                        {canManageClients && (
                            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<PiPencil />}
                                    title={t('detailsPage.edit')}
                                    className="!h-10 min-w-10 !justify-center !rounded-xl !px-0 sm:!h-auto sm:!min-h-0 sm:!min-w-0 sm:!rounded-xl sm:!px-3"
                                    onClick={() => setIsEditModalOpen(true)}
                                >
                                    <span className="hidden sm:inline">{t('detailsPage.edit')}</span>
                                </Button>
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<PiTrash />}
                                    title={t('detailsPage.delete')}
                                    className="!h-10 min-w-10 !justify-center !rounded-xl !px-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 sm:!h-auto sm:!min-h-0 sm:!min-w-0 sm:!rounded-xl sm:!px-3"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <span className="hidden sm:inline">{t('detailsPage.delete')}</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Контент с вкладками */}
                    <Tabs value={activeTab} onChange={setActiveTab}>
                        <TabList className="min-w-0 max-w-full">
                            <TabNav
                                value="info"
                                className="shrink-0 whitespace-nowrap px-3 text-sm sm:px-5 sm:text-base"
                            >
                                {t('detailsPage.tabs.info')}
                            </TabNav>
                            <TabNav
                                value="bookings"
                                className="shrink-0 whitespace-nowrap px-3 text-sm sm:px-5 sm:text-base"
                            >
                                {t('detailsPage.tabs.bookings')}
                            </TabNav>
                            <TabNav
                                value="notes"
                                className="shrink-0 whitespace-nowrap px-3 text-sm sm:px-5 sm:text-base"
                            >
                                {t('detailsPage.tabs.notes')}
                            </TabNav>
                        </TabList>
                        
                        <div className="mt-6">
                            <TabContent value="info">
                                <div className="space-y-6">
                                    {/* Основная информация */}
                                    <EntityProfileHero
                                        name={client.name || 'N/A'}
                                        avatarSrc={client.avatar || client.img}
                                        initials={getInitials(client.name)}
                                        childrenTags={
                                            <Tag className={statusColorMap[clientStatus] || statusColorMap.regular}>
                                                {statusLabelMap[clientStatus] || t('statuses.regular')}
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
                                                        {t('detailsPage.changePhoto')}
                                                    </Button>
                                                </>
                                            ) : null
                                        }
                                        childrenContact={
                                            <>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <PiEnvelope className="text-gray-400 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                        {client.email || '—'}
                                                    </span>
                                                </div>
                                                {client.phone ? (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <PiPhone className="text-gray-400 shrink-0" />
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{client.phone}</span>
                                                    </div>
                                                ) : null}
                                                {client.address ? (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <PiMapPin className="text-gray-400 shrink-0" />
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{client.address}</span>
                                                    </div>
                                                ) : null}
                                                {client.lastVisit ? (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <PiClock className="text-gray-400 shrink-0" />
                                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                            {t('detailsModal.lastVisit')}:{' '}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            {formatDate(client.lastVisit, timezone, 'short')}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </>
                                        }
                                    />

                                    {/* Статистика по бронированиям */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('detailsPage.stats.current')}</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                {bookingsStats.pending + bookingsStats.confirmed}
                                            </div>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('detailsPage.stats.completed')}</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                {bookingsStats.completed}
                                            </div>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('detailsPage.stats.cancelled')}</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                {bookingsStats.cancelled}
                                            </div>
                                        </div>

                                        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('detailsPage.stats.spent')}</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                <NumericFormat
                                                    displayType="text"
                                                    value={totalSpent}
                                                    prefix={'$'}
                                                    thousandSeparator={true}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Сводка по клиенту */}
                                    {summary && (
                                        <ClientSummaryCard 
                                            summary={summary}
                                            currency={bookings[0]?.currency || 'USD'}
                                        />
                                    )}

                                    <ClientLoyaltyCard loyalty={clientDetails?.loyalty} />
                                </div>
                            </TabContent>

                            <TabContent value="bookings">
                                <div className="space-y-3">
                                    <BookingsFilter
                                        filters={filters}
                                        onFiltersChange={setFilters}
                                        bookingsCount={bookings.length}
                                        totalAmount={filteredBookingsTotal}
                                        currency={bookings[0]?.currency || 'USD'}
                                    />

                                    {bookings.length === 0 ? (
                                        <div className="text-center py-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t('detailsPage.bookings.noBookings')}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {bookings.map((booking) => {
                                                const specialistName = booking.specialist?.name || null
                                                const additionalServices = booking.additional_services || []
                                                const basePrice = parseFloat(booking.price || 0)
                                                const additionalTotal = additionalServices.reduce((sum, item) => {
                                                    const price = parseFloat(item.pivot?.price || item.price || 0)
                                                    const quantity = parseInt(item.pivot?.quantity || item.quantity || 1)
                                                    return sum + price * quantity
                                                }, 0)
                                                const totalPrice = parseFloat(booking.total_price || (basePrice + additionalTotal))
                                                const bookingCurrency = booking.currency || 'USD'
                                                const hasDetails = (booking.execution_type === 'offsite' && booking.location) || 
                                                    booking.notes || booking.client_notes || booking.review ||
                                                    additionalServices.length > 0

                                                const openBookingInList = () => {
                                                    router.push(`/business/bookings?bookingId=${booking.id}`)
                                                }

                                                return (
                                                    <div
                                                        key={booking.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        className="group cursor-pointer rounded-xl py-4 pl-1 pr-1 first:pt-0 last:pb-0 -mx-1 outline-none transition-colors hover:bg-gray-50/90 active:bg-gray-100/80 dark:hover:bg-gray-800/40 dark:active:bg-gray-800/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                                                        aria-label={`${booking.service?.name || t('detailsPage.bookings.serviceNotSpecified')} — ${t('detailsPage.bookings.goToBooking')}`}
                                                        onClick={openBookingInList}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault()
                                                                openBookingInList()
                                                            }
                                                        }}
                                                    >
                                                        {/* Основная строка */}
                                                        <div className="flex items-start gap-3">
                                                            {/* Цветовой индикатор статуса */}
                                                            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                                                booking.status === 'completed' ? 'bg-emerald-500' :
                                                                booking.status === 'confirmed' ? 'bg-orange-500' :
                                                                booking.status === 'cancelled' ? 'bg-red-500' :
                                                                'bg-blue-500'
                                                            }`} />
                                                            
                                                            <div className="min-w-0 flex-1">
                                                                {/* Название + цена */}
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                        {booking.service?.name || t('detailsPage.bookings.serviceNotSpecified')}
                                                                    </h4>
                                                                    <div className="flex shrink-0 items-center gap-2">
                                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                            {formatCurrency(totalPrice, bookingCurrency)}
                                                                        </span>
                                                                        <span
                                                                            className="inline-flex h-7 w-7 items-center justify-center text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
                                                                            aria-hidden
                                                                        >
                                                                            <PiArrowRight className="text-base" />
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Мета-информация */}
                                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                                    <span>
                                                                        {booking.booking_date 
                                                                            ? formatDate(booking.booking_date, timezone, 'short')
                                                                            : t('detailsPage.bookings.dateNotSpecified')}
                                                                        {booking.booking_time && ` · ${booking.booking_time}`}
                                                                    </span>
                                                                    {specialistName && (
                                                                        <>
                                                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                            <span>{specialistName}</span>
                                                                        </>
                                                                    )}
                                                                    <Tag className={`!text-xs !px-1.5 !py-0 ${statusColors[booking.status] || statusColors.pending}`}>
                                                                        {statusLabels[booking.status] || booking.status}
                                                                    </Tag>
                                                                    {(booking.payment_status === 'authorized' || booking.payment_status === 'paid') && (
                                                                        <Tag className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 !text-xs !px-2 !py-0 font-bold">
                                                                            {t('detailsModal.onlinePaymentBadge')}
                                                                        </Tag>
                                                                    )}
                                                                </div>

                                                                {/* Дополнительные детали (компактно) */}
                                                                {hasDetails && (
                                                                    <div className="mt-2 space-y-1.5">
                                                                        {/* Доп. услуги */}
                                                                        {additionalServices.length > 0 && (
                                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                                <span className="font-bold">+{additionalServices.length}</span>{' '}
                                                                                {additionalServices.length === 1 ? 'доп. услуга' : 'доп. услуг'}
                                                                            </div>
                                                                        )}

                                                                        {/* Offsite адрес */}
                                                                        {booking.execution_type === 'offsite' && booking.location && (
                                                                            <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                                <PiMapPin className="mt-0.5 shrink-0" />
                                                                                <span>{booking.location.address_line1}, {booking.location.city}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Заметки (кратко) */}
                                                                        {(booking.notes || booking.client_notes) && (
                                                                            <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                                <PiNote className="mt-0.5 shrink-0" />
                                                                                <span className="line-clamp-1">
                                                                                    {booking.client_notes || booking.notes}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {/* Отзыв */}
                                                                        {booking.review && (
                                                                            <div className="flex items-center gap-1 text-xs">
                                                                                <div className="flex items-center gap-0.5">
                                                                                    {[...Array(5)].map((_, i) => (
                                                                                        <PiStar
                                                                                            key={i}
                                                                                            className={i < booking.review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                                                                            size={12}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                                {booking.review.comment && (
                                                                                    <span className="ml-1 text-gray-500 dark:text-gray-400 line-clamp-1">
                                                                                        "{booking.review.comment}"
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </TabContent>

                            <TabContent value="notes">
                                <div className="space-y-4">
                                    {canManageClients && (
                                        <FormItem label={t('detailsPage.notes.addNote')}>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    placeholder={t('detailsPage.notes.notePlaceholder')}
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
                                                    {t('detailsPage.notes.addButton')}
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}

                                    <div className="space-y-3">
                                        {notes.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                {t('detailsPage.notes.noNotes')}
                                            </div>
                                        ) : (
                                            notes.map((note) => (
                                                <Card key={note.id} className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <PiNote className="text-gray-400 mt-1" />
                                                        <div className="flex-1">
                                                            <div className="text-sm mb-1">
                                                                {note.note}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                {t('detailsPage.notes.added')} {formatDateTime(note.createdAt, null, timezone, 'short')}
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
                <p>{t('detailsPage.deleteConfirmMessage') || 'Вы уверены, что хотите удалить этого клиента? Это действие нельзя отменить.'}</p>
            </ConfirmDialog>
        </Container>
    )
}

