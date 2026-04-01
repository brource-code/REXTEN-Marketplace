'use client'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { PiRepeat, PiCalendar, PiClock, PiUser, PiTrash, PiPencil, PiArrowsClockwise } from 'react-icons/pi'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDate, formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'
import {
    getRecurringBookings,
    deleteRecurringBooking,
    regenerateRecurringBooking
} from '@/lib/api/business'
import { useTranslations, useLocale } from 'next-intl'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Loading from '@/components/shared/Loading'

const statusColor = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const bookingStatusColor = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const RecurringBookingsList = ({ onEdit }) => {
    const intlLocale = useLocale()
    const t = useTranslations('business.schedule.recurring')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [chainToDelete, setChainToDelete] = useState(null)

    const { data: chains = [], isLoading } = useQuery({
        queryKey: ['recurring-bookings'],
        queryFn: () => getRecurringBookings(),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteRecurringBooking,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('deleted')}
                </Notification>,
            )
            setDeleteDialogOpen(false)
            setChainToDelete(null)
        },
        onError: (error) => {
            const errorMessage = error?.response?.data?.message || error?.message || t('deleteError')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    const regenerateMutation = useMutation({
        mutationFn: regenerateRecurringBooking,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('regenerated')}
                </Notification>,
            )
        },
        onError: (error) => {
            const errorMessage = error?.response?.data?.message || error?.message || t('regenerateError')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {errorMessage}
                </Notification>,
            )
        },
    })

    const handleDelete = (chain) => {
        setChainToDelete(chain)
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (chainToDelete) {
            deleteMutation.mutate(chainToDelete.id)
        }
    }

    const handleRegenerate = (chainId) => {
        regenerateMutation.mutate(chainId)
    }

    const getFrequencyLabel = (chain) => {
        switch (chain.frequency) {
            case 'daily':
                return t('frequencies.daily')
            case 'every_n_days':
                return chain.interval_days ? `${t('frequencies.every_n_days')} (${chain.interval_days})` : t('frequencies.every_n_days')
            case 'weekly':
                return t('frequencies.weekly')
            case 'biweekly':
                return t('frequencies.biweekly')
            case 'every_2_weeks':
                return t('frequencies.every_2_weeks')
            case 'every_3_weeks':
                return t('frequencies.every_3_weeks')
            case 'monthly':
                return t('frequencies.monthly')
            case 'bimonthly':
                return t('frequencies.bimonthly')
            case 'every_2_months':
                return t('frequencies.every_2_months')
            case 'every_3_months':
                return t('frequencies.every_3_months')
            default:
                return chain.frequency
        }
    }

    const getFrequencyDetails = (chain) => {
        switch (chain.frequency) {
            case 'daily':
                return t('frequencies.daily')
            case 'every_n_days':
                return chain.interval_days ? `${chain.interval_days} ${t('day')}` : '-'
            case 'weekly':
            case 'biweekly':
            case 'every_2_weeks':
            case 'every_3_weeks':
                if (chain.days_of_week && chain.days_of_week.length > 0) {
                    const dayNames = [
                        t('days.sunday'),
                        t('days.monday'),
                        t('days.tuesday'),
                        t('days.wednesday'),
                        t('days.thursday'),
                        t('days.friday'),
                        t('days.saturday'),
                    ]
                    return chain.days_of_week.map(day => dayNames[day]).join(', ')
                }
                return '-'
            case 'monthly':
            case 'every_2_months':
            case 'every_3_months':
                return chain.day_of_month ? `${chain.day_of_month} ${t('day')}` : '-'
            case 'bimonthly':
                if (chain.days_of_month && chain.days_of_month.length === 2) {
                    return `${chain.days_of_month[0]} ${t('and')} ${chain.days_of_month[1]}`
                }
                return '-'
            default:
                return '-'
        }
    }

    const formatPeriod = (chain) => {
        const start = formatDate(chain.start_date, timezone, 'short')
        if (chain.end_date) {
            return `${start} - ${formatDate(chain.end_date, timezone, 'short')}`
        }
        return `${start} ${t('indefinitely')}`
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading={true} />
            </div>
        )
    }

    if (chains.length === 0) {
        return (
            <div className="text-center py-12">
                <PiRepeat className="mx-auto text-4xl text-gray-400 mb-4" />
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {t('noChains')}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('noChainsDescription')}
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {chains.map((chain) => (
                    <div
                        key={chain.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                    >
                        {/* Заголовок: Название услуги + Статус */}
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {chain.service?.name || t('service')}
                                    </span>
                                    <Tag className={statusColor[chain.status] || statusColor.active}>
                                        {t(`statuses.${chain.status}`)}
                                    </Tag>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {getFrequencyLabel(chain)}
                                </span>
                            </div>
                            {/* Кнопки действий */}
                            <div className="flex items-center gap-1">
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<PiPencil />}
                                    onClick={() => onEdit(chain)}
                                />
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<PiArrowsClockwise />}
                                    onClick={() => handleRegenerate(chain.id)}
                                    loading={regenerateMutation.isPending && regenerateMutation.variables === chain.id}
                                />
                                <Button
                                    size="xs"
                                    variant="plain"
                                    color="red"
                                    icon={<PiTrash />}
                                    onClick={() => handleDelete(chain)}
                                />
                            </div>
                        </div>

                        {/* Детали в 2 колонки */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('client')}</div>
                                <div className="flex items-center gap-1.5">
                                    <PiUser className="text-gray-400 shrink-0 text-sm" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {chain.client_name || t('notSpecified')}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('time')}</div>
                                <div className="flex items-center gap-1.5">
                                    <PiClock className="text-gray-400 shrink-0 text-sm" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {formatTime(chain.booking_time, timezone, intlLocale)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('frequencyDetails')}</div>
                                <div className="flex items-center gap-1.5">
                                    <PiRepeat className="text-gray-400 shrink-0 text-sm" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                        {getFrequencyDetails(chain)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('period')}</div>
                                <div className="flex items-center gap-1.5">
                                    <PiCalendar className="text-gray-400 shrink-0 text-sm" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {formatPeriod(chain)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ближайшие бронирования */}
                        {chain.upcoming_bookings && chain.upcoming_bookings.length > 0 && (
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {t('upcomingBookings')}:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {chain.upcoming_bookings.slice(0, 5).map((booking) => (
                                        <Tag
                                            key={booking.id}
                                            className={bookingStatusColor[booking.status] || bookingStatusColor.new}
                                        >
                                            {formatDate(booking.booking_date, timezone, 'numeric')}
                                        </Tag>
                                    ))}
                                    {chain.upcoming_bookings.length > 5 && (
                                        <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                            +{chain.upcoming_bookings.length - 5}
                                        </Tag>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmDialog
                isOpen={deleteDialogOpen}
                type="danger"
                title={t('deleteConfirm.title')}
                onCancel={() => {
                    setDeleteDialogOpen(false)
                    setChainToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText={t('deleteConfirm.confirm')}
                cancelText={t('deleteConfirm.cancel')}
            >
                <p>{t('deleteConfirm.message')}</p>
            </ConfirmDialog>
        </>
    )
}

export default RecurringBookingsList
