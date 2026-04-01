'use client'
import { useCallback, useMemo } from 'react'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { NumericFormat } from 'react-number-format'
import { PiCalendar, PiUser, PiClock } from 'react-icons/pi'
import { useQuery } from '@tanstack/react-query'
import { getRecentBookings } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import { useTranslations } from 'next-intl'
import { formatDate, formatTime } from '@/utils/dateTime'
import useBusinessStore from '@/store/businessStore'

const { Tr, Td, TBody, THead, Th } = Table

const bookingStatusColor = {
    new: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    pending: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
}

const BookingColumn = ({ row }) => {
    const router = useRouter()

    const handleView = useCallback(() => {
        router.push(`/business/bookings?bookingId=${row.id}`)
    }, [row, router])

    return (
        <span
            className="cursor-pointer select-none text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary"
            onClick={handleView}
        >
            #{row.id}
        </span>
    )
}

const RecentBookings = () => {
    const router = useRouter()
    const t = useTranslations('business.dashboard.recentBookings')
    const tSchedule = useTranslations('business.schedule.statuses')
    const tCommon = useTranslations('business.common')
    const { settings } = useBusinessStore()
    const timezone = settings?.timezone || 'America/Los_Angeles'

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['business-recent-bookings'],
        queryFn: () => getRecentBookings(5),
    })

    const getStatusLabel = (status) => {
        const statusMap = {
            new: tSchedule('new'),
            pending: tSchedule('pending'),
            confirmed: tSchedule('confirmed'),
            completed: tSchedule('completed'),
            cancelled: tSchedule('cancelled'),
        }
        return statusMap[status] || tSchedule('new')
    }

    const columns = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: t('columns.booking'),
                cell: (props) => <BookingColumn row={props.row.original} />,
            },
            {
                accessorKey: 'date',
                header: t('columns.dateTime'),
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div className="flex items-center gap-2 text-sm">
                            <PiCalendar className="text-gray-400 shrink-0" />
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{formatDate(row.date, timezone, 'short')}</span>
                            <PiClock className="text-gray-400 shrink-0 ml-2" />
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{formatTime(row.time, timezone)}</span>
                        </div>
                    )
                },
            },
            {
                accessorKey: 'customer',
                header: t('columns.client'),
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div className="flex items-center gap-2 text-sm">
                            <PiUser className="text-gray-400 shrink-0" />
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{row.customer}</span>
                        </div>
                    )
                },
            },
            {
                accessorKey: 'service',
                header: t('columns.service'),
                cell: (props) => {
                    const row = props.row.original
                    const executionType = row.execution_type || 'onsite'
                    return (
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {row.service}
                            {executionType === 'offsite' && (
                                <span className="ml-2 text-xs text-gray-500">🚗 {tCommon('offsite')}</span>
                            )}
                        </span>
                    )
                },
            },
            {
                accessorKey: 'status',
                header: t('columns.status'),
                cell: (props) => {
                    const { status } = props.row.original
                    const currentStatus = status || 'new'
                    return (
                        <Tag className={bookingStatusColor[currentStatus] || bookingStatusColor.new}>
                            {getStatusLabel(currentStatus)}
                        </Tag>
                    )
                },
            },
            {
                accessorKey: 'amount',
                header: t('columns.amount'),
                cell: (props) => {
                    const { amount } = props.row.original
                    return (
                        <NumericFormat
                            className="text-sm font-bold text-gray-900 dark:text-gray-100"
                            displayType="text"
                            value={amount}
                            prefix={'$'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
        ],
        [timezone, t, tSchedule, tCommon],
    )

    const table = useReactTable({
        data: bookings,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <Button
                    size="sm"
                    onClick={() => router.push('/business/bookings')}
                >
                    {t('viewAll')}
                </Button>
            </div>
            {bookings.length === 0 ? (
                <div className="text-center py-12 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('noBookings')}
                </div>
            ) : (
                <>
                    {/* Десктопная версия - таблица */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <THead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <Tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <Th
                                                    key={header.id}
                                                    colSpan={header.colSpan}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                </Th>
                                            )
                                        })}
                                    </Tr>
                                ))}
                            </THead>
                            <TBody>
                                {table.getRowModel().rows.map((row) => {
                                    return (
                                        <Tr key={row.id}>
                                            {row.getVisibleCells().map((cell) => {
                                                return (
                                                    <Td key={cell.id}>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </Td>
                                                )
                                            })}
                                        </Tr>
                                    )
                                })}
                            </TBody>
                        </Table>
                    </div>

                    {/* Мобильная версия - карточки */}
                    <div className="md:hidden space-y-3">
                        {bookings.map((booking) => {
                            const currentStatus = booking.status || 'new'

                            return (
                                <div
                                    key={booking.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                #{booking.id}
                                            </span>
                                            <Tag className={bookingStatusColor[currentStatus] || bookingStatusColor.new}>
                                                {getStatusLabel(currentStatus)}
                                            </Tag>
                                        </div>
                                        <NumericFormat
                                            className="text-sm font-bold text-gray-900 dark:text-gray-100"
                                            displayType="text"
                                            value={booking.amount}
                                            prefix={'$'}
                                            thousandSeparator={true}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <PiCalendar className="text-gray-400 shrink-0" />
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{formatDate(booking.date, timezone, 'short')}</span>
                                            <PiClock className="text-gray-400 shrink-0 ml-1" />
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{formatTime(booking.time, timezone)}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <PiUser className="text-gray-400 shrink-0" />
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate">{booking.customer}</span>
                                        </div>

                                        <div className="text-sm">
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('mobile.service')}: </span>
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate">
                                                {booking.service}
                                                {(booking.execution_type || 'onsite') === 'offsite' && (
                                                    <span className="ml-2 text-xs text-gray-500">🚗 {tCommon('offsite')}</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </Card>
    )
}

export default RecentBookings

