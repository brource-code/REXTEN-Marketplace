'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import { computeMonthlyCashflow } from '@/utils/familyBudget/computeMonthlyCashflow'
import { getDemoDataForMonth, getFlexiblePayments } from '@/utils/familyBudget/seedData'
import BudgetHeader from './_components/BudgetHeader'
import EventsList from './_components/EventsList'
import EventModal from './_components/EventModal'
import DailyBalanceTable from './_components/DailyBalanceTable'
import MonthlySummary from './_components/MonthlySummary'
import AIAnalysisBlock from './_components/AIAnalysisBlock'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/store'
import FamilyBudgetService from '@/services/FamilyBudgetService'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

export default function FamilyBudgetPage() {
    const router = useRouter()
    const { isAuthenticated, checkAuth } = useAuthStore()
    
    // Состояние
    const [period, setPeriod] = useState(dayjs().format('YYYY-MM'))
    const [startDay, setStartDay] = useState(1)
    const [startBalance, setStartBalance] = useState(0)
    const [safeMinBalance, setSafeMinBalance] = useState(300)
    const [events, setEvents] = useState([])
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState(null)
    
    // Состояние загрузки и ошибок
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)
    const [isUserAuthenticated, setIsUserAuthenticated] = useState(false)

    // Проверяем авторизацию при монтировании
    useEffect(() => {
        const hasAuth = checkAuth()
        setIsUserAuthenticated(hasAuth)
        
        if (!hasAuth) {
            // Если не авторизован - редирект на логин
            router.push('/sign-in?redirect=/babki')
            return
        }
        
        // Загружаем данные с сервера
        loadDataFromServer()
    }, [])

    // Загрузка данных с сервера
    const loadDataFromServer = async () => {
        setIsLoading(true)
        setError(null)
        
        try {
            const response = await FamilyBudgetService.getData()
            
            if (response.success) {
                // Загружаем настройки
                if (response.settings) {
                    setPeriod(response.settings.period || dayjs().format('YYYY-MM'))
                    setStartDay(response.settings.start_day || 1)
                    setStartBalance(Number(response.settings.start_balance) || 0)
                    setSafeMinBalance(Number(response.settings.safe_min_balance) || 300)
                }
                
                // Загружаем события и преобразуем формат (бэкенд хранит amount >= 0, для UI нужен знак: расход < 0)
                if (response.events && Array.isArray(response.events)) {
                    const transformedEvents = response.events.map(event => {
                        const numAmount = Number(event.amount) || 0
                        const signedAmount = event.type === 'expense' ? -Math.abs(numAmount) : numAmount
                        return {
                            id: event.id,
                            name: event.name,
                            amount: signedAmount,
                            type: event.type,
                            date: event.date,
                            recurrence: event.recurrence || 'once',
                            isFlexible: event.is_flexible || false,
                            category: event.category,
                            notes: event.notes,
                        }
                    })
                    setEvents(transformedEvents)
                }
            }
        } catch (err) {
            console.error('Error loading budget data:', err)
            setError('Не удалось загрузить данные. Попробуйте обновить страницу.')
        } finally {
            setIsLoading(false)
        }
    }

    // Сохранение настроек на сервер (с debounce)
    const saveSettingsToServer = useCallback(async (newSettings) => {
        if (!isUserAuthenticated) return
        
        try {
            await FamilyBudgetService.updateSettings(newSettings)
        } catch (err) {
            console.error('Error saving settings:', err)
        }
    }, [isUserAuthenticated])

    // Обработчики изменения настроек
    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod)
        saveSettingsToServer({ period: newPeriod })
    }

    const handleStartDayChange = (newStartDay) => {
        setStartDay(newStartDay)
        saveSettingsToServer({ start_day: newStartDay })
    }

    const handleStartBalanceChange = (newBalance) => {
        setStartBalance(newBalance)
        saveSettingsToServer({ start_balance: newBalance })
    }

    const handleSafeMinBalanceChange = (newBalance) => {
        setSafeMinBalance(newBalance)
        saveSettingsToServer({ safe_min_balance: newBalance })
    }

    // Состояние для принудительного пересчёта
    const [recalculateKey, setRecalculateKey] = useState(0)
    
    // Вычисляем cash-flow
    const { dailyRows, summary } = useMemo(() => {
        return computeMonthlyCashflow(events, startBalance, period, safeMinBalance, startDay)
    }, [events, startBalance, period, safeMinBalance, startDay, recalculateKey])

    // Получаем гибкие платежи
    const flexiblePayments = useMemo(() => {
        return getFlexiblePayments(events)
    }, [events])

    // Функция для принудительного пересчёта
    const handleRecalculate = () => {
        setRecalculateKey(prev => prev + 1)
    }

    // Обработчики событий
    const handleAddEvent = () => {
        setEditingEvent(null)
        setIsEventModalOpen(true)
    }

    const handleEditEvent = (event) => {
        setEditingEvent(event)
        setIsEventModalOpen(true)
    }

    const handleSaveEvent = async (eventData) => {
        setIsSaving(true)
        
        try {
            // Преобразуем формат для API (бэкенд требует amount >= 0)
            const apiEventData = {
                name: eventData.name,
                amount: Math.abs(Number(eventData.amount)) || 0,
                type: eventData.type,
                date: eventData.date,
                recurrence: eventData.recurrence || 'once',
                is_flexible: eventData.isFlexible || false,
                category: eventData.category || null,
                notes: eventData.notes || null,
            }

            if (editingEvent && editingEvent.id) {
                // Обновляем существующее событие
                const response = await FamilyBudgetService.updateEvent(editingEvent.id, apiEventData)
                if (response.success) {
                    const numAmount = Number(response.event.amount) || 0
                    const signedAmount = response.event.type === 'expense' ? -Math.abs(numAmount) : numAmount
                    const updatedEvent = {
                        id: response.event.id,
                        name: response.event.name,
                        amount: signedAmount,
                        type: response.event.type,
                        date: response.event.date,
                        recurrence: response.event.recurrence || 'once',
                        isFlexible: response.event.is_flexible || false,
                        category: response.event.category,
                        notes: response.event.notes,
                    }
                    setEvents(events.map(e => e.id === editingEvent.id ? updatedEvent : e))
                }
            } else {
                // Создаём новое событие
                const response = await FamilyBudgetService.createEvent(apiEventData)
                if (response.success) {
                    const numAmount = Number(response.event.amount) || 0
                    const signedAmount = response.event.type === 'expense' ? -Math.abs(numAmount) : numAmount
                    const newEvent = {
                        id: response.event.id,
                        name: response.event.name,
                        amount: signedAmount,
                        type: response.event.type,
                        date: response.event.date,
                        recurrence: response.event.recurrence || 'once',
                        isFlexible: response.event.is_flexible || false,
                        category: response.event.category,
                        notes: response.event.notes,
                    }
                    setEvents([...events, newEvent])
                }
            }
        } catch (err) {
            console.error('Error saving event:', err)
            setError('Не удалось сохранить событие')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteEvent = async (eventId) => {
        try {
            await FamilyBudgetService.deleteEvent(eventId)
            setEvents(events.filter(e => e.id !== eventId))
        } catch (err) {
            console.error('Error deleting event:', err)
            setError('Не удалось удалить событие')
        }
    }

    const handleLoadDemo = async () => {
        const periodLabel = dayjs(`${period}-01`).format('MMMM YYYY')
        const startDayLabel = startDay > 1 ? ` (с ${startDay}-го числа)` : ''
        if (confirm(`Загрузить demo данные для ${periodLabel}${startDayLabel}? Текущие данные будут заменены.`)) {
            setIsSaving(true)
            
            try {
                // Генерируем demo данные для текущего выбранного месяца
                const demoEvents = getDemoDataForMonth(period)
                
                // Фильтруем события: оставляем только >= startDay
                const filteredEvents = demoEvents.filter(event => {
                    const eventDay = dayjs(event.date).date()
                    return eventDay >= startDay
                })
                
                // Преобразуем формат для API (бэкенд требует amount >= 0, тип income/expense передаётся отдельно)
                const apiEvents = filteredEvents.map(event => ({
                    name: event.name,
                    amount: Math.abs(Number(event.amount)) || 0,
                    type: event.type,
                    date: event.date,
                    recurrence: event.recurrence || 'once',
                    is_flexible: event.isFlexible ?? event.flexible ?? false,
                    category: event.category || null,
                    notes: event.notes || null,
                }))
                
                // Синхронизируем с сервером
                const response = await FamilyBudgetService.syncEvents(apiEvents)
                
                if (response.success) {
                    // Преобразуем обратно для локального состояния (бэкенд возвращает amount >= 0, для UI нужен знак)
                    const transformedEvents = response.events.map(event => {
                        const numAmount = Number(event.amount) || 0
                        const signedAmount = event.type === 'expense' ? -Math.abs(numAmount) : numAmount
                        return {
                            id: event.id,
                            name: event.name,
                            amount: signedAmount,
                            type: event.type,
                            date: event.date,
                            recurrence: event.recurrence || 'once',
                            isFlexible: event.is_flexible || false,
                            category: event.category,
                            notes: event.notes,
                        }
                    })
                    setEvents(transformedEvents)
                }
            } catch (err) {
                console.error('Error loading demo data:', err)
                setError('Не удалось загрузить demo данные')
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleClearAll = async () => {
        if (confirm('Очистить все данные? Это удалит все события.')) {
            setIsSaving(true)
            
            try {
                await FamilyBudgetService.clearAll()
                setEvents([])
                setPeriod(dayjs().format('YYYY-MM'))
                setStartDay(1)
                setStartBalance(0)
                setSafeMinBalance(300)
            } catch (err) {
                console.error('Error clearing data:', err)
                setError('Не удалось очистить данные')
            } finally {
                setIsSaving(false)
            }
        }
    }

    // Показываем загрузку
    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка данных...</p>
                        </div>
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="space-y-4 md:space-y-6">
                    {/* Ошибка */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <p className="text-red-600 dark:text-red-400">{error}</p>
                            <button 
                                onClick={() => setError(null)}
                                className="text-sm text-red-500 hover:text-red-700 mt-2"
                            >
                                Закрыть
                            </button>
                        </div>
                    )}

                    {/* Шапка с параметрами */}
                    <BudgetHeader
                        period={period}
                        onPeriodChange={handlePeriodChange}
                        startDay={startDay}
                        onStartDayChange={handleStartDayChange}
                        startBalance={startBalance}
                        onStartBalanceChange={handleStartBalanceChange}
                        safeMinBalance={safeMinBalance}
                        onSafeMinBalanceChange={handleSafeMinBalanceChange}
                        onRecalculate={handleRecalculate}
                    />

                    {/* Кнопки управления данными */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAll}
                            disabled={isSaving}
                            className="w-full sm:w-auto"
                        >
                            <span className="hidden sm:inline">Очистить данные</span>
                            <span className="sm:hidden">Очистить</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLoadDemo}
                            disabled={isSaving}
                            className="w-full sm:w-auto"
                        >
                            <span className="hidden sm:inline">Загрузить demo данные</span>
                            <span className="sm:hidden">Demo данные</span>
                        </Button>
                    </div>

                    {/* Список событий */}
                    <EventsList
                        events={events}
                        period={period}
                        onAdd={handleAddEvent}
                        onEdit={handleEditEvent}
                        onDelete={handleDeleteEvent}
                    />

                    {/* Итоги месяца */}
                    <MonthlySummary summary={summary} startDay={startDay} />

                    {/* Таблица баланса по дням */}
                    <DailyBalanceTable dailyRows={dailyRows} />

                    {/* ИИ-анализ */}
                    <AIAnalysisBlock
                        period={period}
                        safeMinBalance={safeMinBalance}
                        summary={summary}
                    />

                    {/* Модалка события */}
                    <EventModal
                        isOpen={isEventModalOpen}
                        onClose={() => {
                            setIsEventModalOpen(false)
                            setEditingEvent(null)
                        }}
                        event={editingEvent}
                        period={period}
                        onSave={handleSaveEvent}
                    />
                    
                    {/* Индикатор сохранения */}
                    {isSaving && (
                        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Сохранение...</span>
                        </div>
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}
