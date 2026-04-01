'use client'

import { useState, useMemo } from 'react'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { PiPlus, PiPencil, PiTrash } from 'react-icons/pi'
import dayjs from 'dayjs'

export default function EventsList({ events, period, onAdd, onEdit, onDelete }) {
    // Фильтруем события по выбранному месяцу
    const monthEvents = useMemo(() => {
        const [year, month] = period.split('-').map(Number)
        return events.filter(event => {
            const eventDate = dayjs(event.date)
            return eventDate.year() === year && eventDate.month() + 1 === month
        }).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
    }, [events, period])

    const formatAmount = (amount) => {
        const sign = amount >= 0 ? '+' : ''
        return `${sign}${amount.toFixed(2)}`
    }

    const getAmountColor = (amount) => {
        if (amount > 0) return 'text-green-600 dark:text-green-400'
        return 'text-red-600 dark:text-red-400'
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                    События
                </h4>
                <Button
                    variant="solid"
                    size="sm"
                    icon={<PiPlus />}
                    onClick={onAdd}
                    className="w-full sm:w-auto"
                >
                    <span className="hidden sm:inline">Добавить событие</span>
                    <span className="sm:hidden">Добавить</span>
                </Button>
            </div>

            {monthEvents.length === 0 ? (
                <div className="text-center py-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                    Нет событий для этого месяца. Добавьте первое событие.
                </div>
            ) : (
                <>
                    {/* Десктопная версия - таблица */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <thead>
                                <tr>
                                    <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Дата</th>
                                    <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Тип</th>
                                    <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Название</th>
                                    <th className="text-right text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Сумма</th>
                                    <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Счёт</th>
                                    <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Владелец</th>
                                    <th className="text-left text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Категория</th>
                                    <th className="text-center text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Гибкий</th>
                                    <th className="text-right text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthEvents.map((event) => (
                                    <tr key={event.id}>
                                        <td className="text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {dayjs(event.date).format('DD.MM.YYYY')}
                                        </td>
                                        <td className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {event.type === 'income' ? 'Доход' : 'Расход'}
                                        </td>
                                        <td className="text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {event.name}
                                        </td>
                                        <td className={`text-right text-xs md:text-sm font-bold ${getAmountColor(event.amount)}`}>
                                            {formatAmount(event.amount)}
                                        </td>
                                        <td className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {event.account || '-'}
                                        </td>
                                        <td className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {event.owner || '-'}
                                        </td>
                                        <td className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {event.category || '-'}
                                        </td>
                                        <td className="text-center">
                                            {(event.isFlexible || event.flexible) ? (
                                                <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                                                    Да
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
                                                    Нет
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="plain"
                                                    size="xs"
                                                    icon={<PiPencil />}
                                                    onClick={() => onEdit(event)}
                                                />
                                                <Button
                                                    variant="plain"
                                                    size="xs"
                                                    icon={<PiTrash />}
                                                    onClick={() => {
                                                        if (confirm('Удалить это событие?')) {
                                                            onDelete(event.id)
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {/* Мобильная версия - карточки */}
                    <div className="md:hidden space-y-2">
                        {monthEvents.map((event) => (
                            <div
                                key={event.id}
                                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                                            {event.name}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {dayjs(event.date).format('DD.MM.YYYY')} • {event.type === 'income' ? 'Доход' : 'Расход'}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold ${getAmountColor(event.amount)}`}>
                                        {formatAmount(event.amount)}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex gap-2 flex-wrap">
                                        {event.account && (
                                            <span className="text-gray-500 dark:text-gray-400">{event.account}</span>
                                        )}
                                        {event.owner && (
                                            <span className="text-gray-500 dark:text-gray-400">• {event.owner}</span>
                                        )}
                                        {event.category && (
                                            <span className="text-gray-500 dark:text-gray-400">• {event.category}</span>
                                        )}
                                    </div>
                                    {(event.isFlexible || event.flexible) ? (
                                        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                                            Гибкий
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <Button
                                        variant="plain"
                                        size="xs"
                                        icon={<PiPencil />}
                                        onClick={() => onEdit(event)}
                                    />
                                    <Button
                                        variant="plain"
                                        size="xs"
                                        icon={<PiTrash />}
                                        onClick={() => {
                                            if (confirm('Удалить это событие?')) {
                                                onDelete(event.id)
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
