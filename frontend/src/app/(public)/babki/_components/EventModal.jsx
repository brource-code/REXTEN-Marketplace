'use client'

import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import dayjs from 'dayjs'

const eventTypeOptions = [
    { value: 'income', label: 'Доход' },
    { value: 'expense', label: 'Расход' },
]

const accountOptions = [
    { value: 'debit', label: 'Дебет' },
    { value: 'credit', label: 'Кредит' },
    { value: 'cash', label: 'Наличные' },
]

const ownerOptions = [
    { value: 'Sergei', label: 'Сережа' },
    { value: 'Yara', label: 'Яра' },
    { value: 'Family', label: 'Семья' },
]

const categoryOptions = [
    { value: 'salary', label: 'Зарплата' },
    { value: 'rent', label: 'Аренда/Квартира' },
    { value: 'credit', label: 'Кредитка' },
    { value: 'subscription', label: 'Подписка' },
    { value: 'loan', label: 'Кредит' },
    { value: 'other', label: 'Другое' },
]

export default function EventModal({ isOpen, onClose, event, period, onSave }) {
    const [formData, setFormData] = useState({
        date: '',
        type: 'expense',
        name: '',
        amount: '',
        account: 'debit',
        owner: 'Family',
        category: 'other',
        flexible: false,
        comment: '',
    })

    useEffect(() => {
        if (event) {
            // Нормализуем дату к формату YYYY-MM-DD
            const normalizedDate = event.date ? dayjs(event.date).format('YYYY-MM-DD') : ''
            setFormData({
                date: normalizedDate,
                type: event.type || 'expense',
                name: event.name || '',
                amount: event.amount ? Math.abs(event.amount).toString() : '',
                account: event.account || 'debit',
                owner: event.owner || 'Family',
                category: event.category || 'other',
                flexible: event.isFlexible || event.flexible || false,
                comment: event.comment || event.notes || '',
            })
        } else {
            // Новое событие - устанавливаем дату на первое число выбранного месяца
            const [year, month] = period.split('-')
            const firstDay = dayjs(`${year}-${month}-01`).format('YYYY-MM-DD')
            setFormData({
                date: firstDay,
                type: 'expense',
                name: '',
                amount: '',
                account: 'debit',
                owner: 'Family',
                category: 'other',
                flexible: false,
                comment: '',
            })
        }
    }, [event, period, isOpen])

    const handleSubmit = (e) => {
        e.preventDefault()

        // Валидация
        if (!formData.date || !formData.name || !formData.amount) {
            alert('Заполните все обязательные поля')
            return
        }

        const amount = parseFloat(formData.amount)
        if (isNaN(amount) || amount <= 0) {
            alert('Сумма должна быть положительным числом')
            return
        }

        // Формируем событие
        const eventData = {
            id: event?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: formData.date,
            type: formData.type,
            name: formData.name,
            amount: formData.type === 'income' ? amount : -amount, // Доходы положительные, расходы отрицательные
            account: formData.account,
            owner: formData.owner,
            category: formData.category,
            isFlexible: formData.flexible, // Используем isFlexible для API
            flexible: formData.flexible, // Оставляем для обратной совместимости
            notes: formData.comment || '',
        }

        onSave(eventData)
        onClose()
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            width={600}
        >
            <div className="flex flex-col h-full max-h-[90vh]">
                <div className="p-6 pb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {event ? 'Редактировать событие' : 'Добавить событие'}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-6">
                    <form onSubmit={handleSubmit} className="space-y-4 pb-6">
                    {/* Дата */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Дата *
                        </label>
                        <DatePicker
                            size="sm"
                            type="date"
                            inputtable={false}
                            clearable={false}
                            placeholder="Дата"
                            value={
                                formData.date
                                    ? dayjs(formData.date, 'YYYY-MM-DD').toDate()
                                    : null
                            }
                            onChange={(d) =>
                                setFormData({
                                    ...formData,
                                    date: d ? dayjs(d).format('YYYY-MM-DD') : '',
                                })
                            }
                        />
                    </div>

                    {/* Тип */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Тип *
                        </label>
                        <Select
                            instanceId="event-type-select"
                            options={eventTypeOptions}
                            value={eventTypeOptions.find(opt => opt.value === formData.type)}
                            onChange={(option) => setFormData({ ...formData, type: option?.value || 'expense' })}
                            isClearable={false}
                        />
                    </div>

                    {/* Название */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Название *
                        </label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Например: ЗП Сережи"
                            required
                        />
                    </div>

                    {/* Сумма */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Сумма *
                        </label>
                        <Input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0"
                            step="0.01"
                            min="0"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formData.type === 'income' ? 'Доход будет положительным' : 'Расход будет отрицательным'}
                        </p>
                    </div>

                    {/* Счёт */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Счёт
                        </label>
                        <Select
                            instanceId="account-select"
                            options={accountOptions}
                            value={accountOptions.find(opt => opt.value === formData.account)}
                            onChange={(option) => setFormData({ ...formData, account: option?.value || 'debit' })}
                            isClearable={false}
                        />
                    </div>

                    {/* Владелец */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Владелец
                        </label>
                        <Select
                            instanceId="owner-select"
                            options={ownerOptions}
                            value={ownerOptions.find(opt => opt.value === formData.owner)}
                            onChange={(option) => setFormData({ ...formData, owner: option?.value || 'Family' })}
                            isClearable={false}
                        />
                    </div>

                    {/* Категория */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Категория
                        </label>
                        <Select
                            instanceId="category-select"
                            options={categoryOptions}
                            value={categoryOptions.find(opt => opt.value === formData.category)}
                            onChange={(option) => setFormData({ ...formData, category: option?.value || 'other' })}
                            isClearable={false}
                        />
                    </div>

                    {/* Гибкий платёж */}
                    <Checkbox
                        id="flexible"
                        checked={formData.flexible}
                        onChange={(v) => setFormData({ ...formData, flexible: v })}
                        checkboxClass="shrink-0 !m-0"
                        className="text-sm font-bold text-gray-500 dark:text-gray-400"
                    >
                        <span>Гибкий платёж (можно сдвигать)</span>
                    </Checkbox>

                    {/* Комментарий */}
                    <div>
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            Комментарий
                        </label>
                        <Input
                            value={formData.comment}
                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            placeholder="Дополнительная информация"
                        />
                    </div>

                        {/* Кнопки */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="plain"
                                onClick={onClose}
                            >
                                Отмена
                            </Button>
                            <Button
                                type="submit"
                                variant="solid"
                            >
                                {event ? 'Сохранить' : 'Добавить'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Dialog>
    )
}
