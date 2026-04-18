'use client'
import { useState, useMemo, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBusinessProfile, getScheduleSlots } from '@/lib/api/business'
import {
    PiCalendarPlus,
    PiUserPlus,
    PiGear,
    PiClock,
    PiArrowSquareOut,
} from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import { usePermission } from '@/hooks/usePermission'
import { useBusinessScheduleSlotModalController } from '@/hooks/useBusinessScheduleSlotModalController'
import ClientCreateModal from '@/app/business/clients/_components/ClientCreateModal'
import ScheduleSlotModal from '@/app/business/schedule/_components/ScheduleSlotModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const QuickActions = () => {
    const router = useRouter()
    const t = useTranslations('business.dashboard.quickActions')
    const tScheduleRoot = useTranslations('business.schedule')

    const canManageClients = usePermission('manage_clients')
    const canManageSchedule = usePermission('manage_schedule')

    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const queryClient = useQueryClient()

    const { refetch: refetchSlots } = useQuery({
        queryKey: ['business-schedule-slots'],
        queryFn: getScheduleSlots,
    })

    const {
        dialogOpen,
        setDialogOpen,
        selectedSlot,
        setSelectedSlot,
        isDeleteDialogOpen,
        handleSubmit,
        handleDelete,
        handleConfirmDelete,
        cancelDelete,
        closeModal,
    } = useBusinessScheduleSlotModalController({ refetchSlots })

    const { data: profile } = useQuery({
        queryKey: ['business-profile'],
        queryFn: getBusinessProfile,
    })

    const openNewBooking = useCallback(() => {
        if (!canManageSchedule) {
            router.push('/business/schedule')
            return
        }
        setSelectedSlot({ type: 'NEW' })
        setDialogOpen(true)
    }, [canManageSchedule, router, setSelectedSlot, setDialogOpen])

    const openAddClient = useCallback(() => {
        if (!canManageClients) {
            router.push('/business/clients')
            return
        }
        setIsClientModalOpen(true)
    }, [canManageClients, router])

    const actions = useMemo(
        () => [
            {
                title: t('newBooking'),
                description: t('newBookingDesc'),
                icon: <PiCalendarPlus className="text-2xl" />,
                color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
                onClick: openNewBooking,
            },
            {
                title: t('addClient'),
                description: t('addClientDesc'),
                icon: <PiUserPlus className="text-2xl" />,
                color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                onClick: openAddClient,
            },
            {
                title: t('settings'),
                description: t('settingsDesc'),
                icon: <PiGear className="text-2xl" />,
                color: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
                onClick: () => router.push('/business/settings'),
            },
            {
                title: t('schedule'),
                description: t('scheduleDesc'),
                icon: <PiClock className="text-2xl" />,
                color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
                onClick: () => router.push('/business/schedule'),
            },
        ],
        [t, router, openNewBooking, openAddClient],
    )

    const businessSlug =
        profile?.slug || profile?.name?.toLowerCase().replace(/\s+/g, '-') || 'my-business'

    return (
        <>
            <Card className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <Link
                        href={`/marketplace/company/${businessSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                    >
                        <Button variant="outline" size="sm" icon={<PiArrowSquareOut />}>
                            <span className="hidden sm:inline">{t('viewProfile')}</span>
                            <span className="sm:hidden">{t('profile')}</span>
                        </Button>
                    </Link>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-1 gap-3">
                    {actions.map((action, index) => (
                        <button
                            key={action.title}
                            type="button"
                            data-tour={index === 0 ? 'btn-primary' : undefined}
                            onClick={action.onClick}
                            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left w-full"
                        >
                            <div
                                className={`flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 ${action.color}`}
                            >
                                {action.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    {action.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {action.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            <ClientCreateModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
            />

            <ScheduleSlotModal
                key={selectedSlot?.id ? `slot-${selectedSlot.id}` : 'slot-new'}
                isOpen={dialogOpen}
                onClose={closeModal}
                slot={selectedSlot}
                onSave={canManageSchedule ? handleSubmit : null}
                onDelete={
                    canManageSchedule && selectedSlot?.id
                        ? () => handleDelete(selectedSlot.id)
                        : null
                }
                readOnly={!canManageSchedule}
                onPaymentUpdated={async () => {
                    const result = await refetchSlots()
                    const list = result.data ?? queryClient.getQueryData(['business-schedule-slots']) ?? []
                    const id = selectedSlot?.id
                    if (!id) return
                    const upd = list.find((s) => String(s.id) === String(id))
                    if (upd) {
                        setSelectedSlot({ ...upd, type: 'EDIT' })
                    }
                }}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title={tScheduleRoot('deleteConfirm.title')}
                onCancel={cancelDelete}
                onConfirm={handleConfirmDelete}
                confirmText={tScheduleRoot('deleteConfirm.confirm')}
                cancelText={tScheduleRoot('deleteConfirm.cancel')}
            >
                <p>{tScheduleRoot('deleteConfirm.message')}</p>
            </ConfirmDialog>
        </>
    )
}

export default QuickActions
