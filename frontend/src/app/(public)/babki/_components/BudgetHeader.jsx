'use client'

import { useState, useEffect } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { PiCalculator } from 'react-icons/pi'
import dayjs from 'dayjs'

export default function BudgetHeader({ period, onPeriodChange, startBalance, onStartBalanceChange, safeMinBalance, onSafeMinBalanceChange, startDay, onStartDayChange, onRecalculate }) {
    // Локальное состояние для полей ввода (чтобы разрешить пустую строку при вводе)
    const [startBalanceInput, setStartBalanceInput] = useState(String(startBalance ?? 0))
    const [safeMinBalanceInput, setSafeMinBalanceInput] = useState(String(safeMinBalance ?? 300))
    
    // Синхронизируем с пропсами
    useEffect(() => {
        setStartBalanceInput(String(startBalance ?? 0))
    }, [startBalance])
    
    useEffect(() => {
        setSafeMinBalanceInput(String(safeMinBalance ?? 300))
    }, [safeMinBalance])
    
    // Генерируем опции для дней месяца
    const daysInMonth = dayjs(`${period}-01`).daysInMonth()
    const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
        value: i + 1,
        label: `${i + 1}`
    }))
    // Генерируем опции месяцев (последние 12 месяцев + будущие)
    const monthOptions = []
    const currentDate = dayjs()
    
    for (let i = -6; i <= 6; i++) {
        const date = currentDate.add(i, 'month')
        const value = date.format('YYYY-MM')
        const label = date.format('MMMM YYYY')
        monthOptions.push({ value, label })
    }

    return (
        <div className="space-y-3 md:space-y-4">
            <div>
                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
                    Семейный бюджет
                </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Выбор месяца */}
                <div>
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                        Месяц
                    </label>
                    <Select
                        instanceId="period-select"
                        options={monthOptions}
                        value={monthOptions.find(opt => opt.value === period) || monthOptions.find(opt => opt.value === currentDate.format('YYYY-MM'))}
                        onChange={(option) => onPeriodChange(option?.value || currentDate.format('YYYY-MM'))}
                        isClearable={false}
                        isSearchable={false}
                    />
                </div>

                {/* Начальный день */}
                <div>
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                        С какого числа
                    </label>
                    <Select
                        instanceId="start-day-select"
                        options={dayOptions}
                        value={dayOptions.find(opt => opt.value === (startDay || 1)) || dayOptions[0]}
                        onChange={(option) => onStartDayChange(option?.value || 1)}
                        isClearable={false}
                        isSearchable={false}
                    />
                </div>

                {/* Стартовый остаток */}
                <div>
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                        Остаток на {startDay || 1}-е
                    </label>
                    <Input
                        type="number"
                        value={startBalanceInput}
                        onChange={(e) => {
                            const val = e.target.value
                            setStartBalanceInput(val) // Обновляем локальное состояние сразу
                            
                            // Применяем значение только если оно валидное
                            if (val === '' || val === '-') {
                                // Разрешаем пустую строку или минус (начало ввода отрицательного числа)
                                onStartBalanceChange(0)
                            } else {
                                const num = parseFloat(val)
                                if (!isNaN(num)) {
                                    onStartBalanceChange(num)
                                }
                            }
                        }}
                        onBlur={(e) => {
                            // При потере фокуса нормализуем значение
                            const val = e.target.value
                            if (val === '' || val === '-') {
                                setStartBalanceInput('0')
                                onStartBalanceChange(0)
                            }
                        }}
                        placeholder="0"
                        step="0.01"
                    />
                </div>

                {/* Порог безопасности */}
                <div>
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                        Порог безопасности
                    </label>
                    <Input
                        type="number"
                        value={safeMinBalanceInput}
                        onChange={(e) => {
                            const val = e.target.value
                            setSafeMinBalanceInput(val)
                            
                            if (val === '' || val === '-') {
                                onSafeMinBalanceChange(0)
                            } else {
                                const num = parseFloat(val)
                                if (!isNaN(num)) {
                                    onSafeMinBalanceChange(num)
                                }
                            }
                        }}
                        onBlur={(e) => {
                            const val = e.target.value
                            if (val === '' || val === '-') {
                                setSafeMinBalanceInput('300')
                                onSafeMinBalanceChange(300)
                            }
                        }}
                        placeholder="300"
                        step="0.01"
                    />
                </div>
            </div>
            
            {/* Кнопка пересчёта */}
            {onRecalculate && (
                <div className="flex justify-end">
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<PiCalculator />}
                        onClick={onRecalculate}
                        className="w-full md:w-auto"
                    >
                        <span className="hidden sm:inline">Пересчитать</span>
                        <span className="sm:hidden">Пересчёт</span>
                    </Button>
                </div>
            )}
        </div>
    )
}
