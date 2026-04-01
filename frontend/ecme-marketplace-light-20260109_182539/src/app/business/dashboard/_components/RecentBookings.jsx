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

const { Tr, Td, TBody, THead, Th } = Table

const bookingStatusColor = {
    new: 'bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100',
    pending: 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
}

const bookingStatusLabels = {
    new: 'Новый',
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
}

const BookingColumn = ({ row }) => {
    const router = useRouter()

    const handleView = useCallback(() => {
        // router.push(`/business/bookings/${row.id}`)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row])

    return (
        <span
            className="cursor-pointer select-none font-semibold text-gray-900 dark:text-gray-100 hover:text-primary"
            onClick={handleView}
        >
            #{row.id}
        </span>
    )
}

const RecentBookings = () => {
    const router = useRouter()

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['business-recent-bookings'],
        queryFn: () => getRecentBookings(5),
    })

    const columns = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'Бронирование',
                cell: (props) => <BookingColumn row={props.row.original} />,
            },
            {
                accessorKey: 'date',
                header: 'Дата и время',
                cell: (props) => {
                    const row = props.row.original
                    // Форматируем дату без учета таймзоны
                    const formatDate = (dateString) => {
                        if (!dateString) return 'N/A'
                        const dateParts = dateString.split('-')
                        if (dateParts.length === 3) {
                            const localDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                            return localDate.toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })
                        }
                        return dateString
                    }
                    // Форматируем время (убираем секунды если есть)
                    const formatTime = (timeString) => {
                        if (!timeString) return '00:00'
                        return timeString.substring(0, 5) // Берем только часы и минуты
                    }
                    return (
                        <div className="flex items-center gap-2 text-sm">
                            <PiCalendar className="text-gray-400 shrink-0" />
                            <span className="text-gray-900 dark:text-gray-100">{formatDate(row.date)}</span>
                            <PiClock className="text-gray-400 shrink-0 ml-2" />
                            <span className="text-gray-900 dark:text-gray-100">{formatTime(row.time)}</span>
                        </div>
                    )
                },
            },
            {
                accessorKey: 'customer',
                header: 'Клиент',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div className="flex items-center gap-2 text-sm">
                            <PiUser className="text-gray-400 shrink-0" />
                            <span className="text-gray-900 dark:text-gray-100">{row.customer}</span>
                        </div>
                    )
                },
            },
            {
                accessorKey: 'service',
                header: 'Услуга',
                cell: (props) => {
                    return (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                            {props.row.original.service}
                        </span>
                    )
                },
            },
            {
                accessorKey: 'status',
                header: 'Статус',
                cell: (props) => {
                    const { status } = props.row.original
                    const currentStatus = status || 'new'
                    return (
                        <Tag className={bookingStatusColor[currentStatus] || bookingStatusColor.new}>
                            {bookingStatusLabels[currentStatus] || 'Новый'}
                        </Tag>
                    )
                },
            },
            {
                accessorKey: 'amount',
                header: 'Сумма',
                cell: (props) => {
                    const { amount } = props.row.original
                    return (
                        <NumericFormat
                            className="font-semibold text-gray-900 dark:text-gray-100"
                            displayType="text"
                            value={amount}
                            prefix={'$'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
        ],
        [],
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
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Последние бронирования</h4>
                <Button
                    size="sm"
                    onClick={() => router.push('/business/schedule')}
                >
                    Все бронирования
                </Button>
            </div>
            {bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    Нет бронирований
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
                            
                            // Форматируем дату
                            const formatDate = (dateString) => {
                                if (!dateString) return 'N/A'
                                const dateParts = dateString.split('-')
                                if (dateParts.length === 3) {
                                    const localDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                                    return localDate.toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })
                                }
                                return dateString
                            }
                            
                            // Форматируем время
                            const formatTime = (timeString) => {
                                if (!timeString) return '00:00'
                                return timeString.substring(0, 5)
                            }

                            return (
                                <div
                                    key={booking.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                #{booking.id}
                                            </span>
                                            <Tag className={bookingStatusColor[currentStatus] || bookingStatusColor.new}>
                                                {bookingStatusLabels[currentStatus] || 'Новый'}
                                            </Tag>
                                        </div>
                                        <NumericFormat
                                            className="text-base font-semibold text-gray-900 dark:text-gray-100"
                                            displayType="text"
                                            value={booking.amount}
                                            prefix={'$'}
                                            thousandSeparator={true}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <PiCalendar className="text-gray-400 shrink-0" />
                                            <span className="text-gray-900 dark:text-gray-100">{formatDate(booking.date)}</span>
                                            <PiClock className="text-gray-400 shrink-0 ml-1" />
                                            <span className="text-gray-900 dark:text-gray-100">{formatTime(booking.time)}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <PiUser className="text-gray-400 shrink-0" />
                                            <span className="text-gray-900 dark:text-gray-100 truncate">{booking.customer}</span>
                                        </div>

                                        <div className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Услуга: </span>
                                            <span className="text-gray-900 dark:text-gray-100 truncate">{booking.service}</span>
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

