import dayjs from 'dayjs'

/**
 * Детерминированный расчёт cash-flow по дням месяца
 * 
 * @param {Array} events - Массив событий BudgetEvent
 * @param {number} startBalance - Стартовый остаток на начальную дату
 * @param {string} periodMonth - Месяц в формате YYYY-MM
 * @param {number} safeMinBalance - Порог безопасности
 * @param {number} startDay - День начала расчёта (1-31, по умолчанию 1)
 * @returns {Object} { dailyRows, summary }
 */
export function computeMonthlyCashflow(events, startBalance, periodMonth, safeMinBalance = 300, startDay = 1) {
    // Парсим период
    const [year, month] = periodMonth.split('-').map(Number)
    const monthStart = dayjs(`${year}-${month}-01`)
    const daysInMonth = monthStart.daysInMonth()
    
    // Валидируем startDay
    const validStartDay = Math.max(1, Math.min(startDay, daysInMonth))
    const startDate = monthStart.date(validStartDay)
    
    // Фильтруем события по выбранному месяцу И начиная с startDay
    const monthEventsRaw = events.filter(event => {
        const eventDate = dayjs(event.date)
        // Событие должно быть в нужном месяце И >= startDay
        return eventDate.year() === year && 
               eventDate.month() + 1 === month && 
               eventDate.date() >= validStartDay
    })
    
    // Удаляем дубликаты по ID (берем первое вхождение)
    const seenIds = new Set()
    const monthEvents = monthEventsRaw.filter(event => {
        if (seenIds.has(event.id)) {
            console.warn('⚠️ Duplicate event ID found:', event.id, event.name)
            return false
        }
        seenIds.add(event.id)
        return true
    })
    
    // Сортируем события по дате
    const sortedEvents = [...monthEvents].sort((a, b) => {
        return dayjs(a.date).diff(dayjs(b.date))
    })
    
    // Группируем события по дням
    // ВАЖНО: нормализуем дату к формату YYYY-MM-DD, т.к. с бэкенда может прийти ISO формат
    const eventsByDate = {}
    sortedEvents.forEach(event => {
        const dateKey = dayjs(event.date).format('YYYY-MM-DD')
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = []
        }
        eventsByDate[dateKey].push(event)
    })
    
    // Убеждаемся, что startBalance - число
    const initialBalance = Number(startBalance) || 0
    
    // Инициализируем переменные для min/max
    let minBalance = initialBalance
    let dateMinBalance = startDate.format('YYYY-MM-DD')
    let maxBalance = initialBalance
    let dateMaxBalance = startDate.format('YYYY-MM-DD')
    const lowDays = []      // 0 <= balance < safeMinBalance
    const negativeDays = [] // balance < 0
    
    // Проходим по дням месяца начиная с validStartDay
    const dailyRows = []
    let currentBalance = initialBalance
    
    for (let day = validStartDay; day <= daysInMonth; day++) {
        const currentDate = monthStart.date(day)
        const dateKey = currentDate.format('YYYY-MM-DD')
        
        // События этого дня
        const dayEvents = eventsByDate[dateKey] || []
        
        // Считаем доходы и расходы за день
        let incomeDay = 0
        let expenseDay = 0
        
        dayEvents.forEach(event => {
            const amount = Number(event.amount) || 0
            if (amount > 0) {
                incomeDay += amount
            } else if (amount < 0) {
                expenseDay += Math.abs(amount) // Храним как положительное для отображения
            }
        })
        
        // Обновляем баланс
        currentBalance = currentBalance + incomeDay - expenseDay
        
        // Определяем статус дня
        let status = 'ok'
        if (currentBalance < 0) {
            status = 'danger'
            if (!negativeDays.includes(dateKey)) {
                negativeDays.push(dateKey)
            }
        } else if (currentBalance < safeMinBalance) {
            status = 'low'
            if (!lowDays.includes(dateKey)) {
                lowDays.push(dateKey)
            }
        }
        
        // Обновляем min/max баланс
        if (currentBalance < minBalance) {
            minBalance = currentBalance
            dateMinBalance = dateKey
        }
        if (currentBalance > maxBalance) {
            maxBalance = currentBalance
            dateMaxBalance = dateKey
        }
        
        dailyRows.push({
            date: dateKey,
            income: incomeDay,
            expense: expenseDay,
            balance: currentBalance,
            events: dayEvents,
            status,
        })
    }
    
    // ВАЖНО: Считаем итоги ИЗ dailyRows
    const totalIncome = dailyRows.reduce((sum, row) => sum + row.income, 0)
    const totalExpense = dailyRows.reduce((sum, row) => sum + row.expense, 0)
    const endingBalance = dailyRows.length > 0 ? dailyRows[dailyRows.length - 1].balance : initialBalance
    const balanceChange = endingBalance - initialBalance
    
    // Находим критические периоды (последовательные дни с отрицательным балансом)
    const criticalPeriods = []
    let periodStart = null
    for (let i = 0; i < dailyRows.length; i++) {
        const row = dailyRows[i]
        if (row.status === 'danger') {
            if (!periodStart) {
                periodStart = row.date
            }
        } else {
            if (periodStart) {
                criticalPeriods.push({
                    from: periodStart,
                    to: dailyRows[i - 1].date
                })
                periodStart = null
            }
        }
    }
    // Закрываем последний период, если он не закрыт
    if (periodStart) {
        criticalPeriods.push({
            from: periodStart,
            to: dailyRows[dailyRows.length - 1].date
        })
    }
    
    // Разделяем платежи на гибкие и фиксированные (с суммами!)
    // Поддерживаем оба варианта: isFlexible (из API) и flexible (старый формат)
    const flexiblePaymentsRaw = monthEvents
        .filter(e => (e.isFlexible || e.flexible) && Number(e.amount) < 0)
        .map(e => ({ name: e.name, amount: Math.abs(Number(e.amount)) }))
    
    // Группируем по имени и суммируем
    const flexiblePaymentsMap = {}
    flexiblePaymentsRaw.forEach(p => {
        if (!flexiblePaymentsMap[p.name]) {
            flexiblePaymentsMap[p.name] = 0
        }
        flexiblePaymentsMap[p.name] += p.amount
    })
    
    const flexiblePayments = Object.entries(flexiblePaymentsMap)
        .map(([name, amount]) => `${name} (-${amount})`)
    
    // Общая сумма гибких платежей
    const totalFlexible = Object.values(flexiblePaymentsMap).reduce((sum, v) => sum + v, 0)
    
    const fixedPaymentsRaw = monthEvents
        .filter(e => !(e.isFlexible || e.flexible) && Number(e.amount) < 0)
        .map(e => ({ name: e.name, amount: Math.abs(Number(e.amount)) }))
    
    const fixedPaymentsMap = {}
    fixedPaymentsRaw.forEach(p => {
        if (!fixedPaymentsMap[p.name]) {
            fixedPaymentsMap[p.name] = 0
        }
        fixedPaymentsMap[p.name] += p.amount
    })
    
    const fixedPayments = Object.entries(fixedPaymentsMap)
        .map(([name, amount]) => `${name} (-${amount})`)
    
    // Общая сумма фиксированных платежей
    const totalFixed = Object.values(fixedPaymentsMap).reduce((sum, v) => sum + v, 0)
    
    // РАСЧЁТ СЦЕНАРИЕВ (чтобы ИИ не считал сам!)
    // Сценарий 1: Перенести ВСЕ гибкие платежи
    const balanceIfAllFlexiblePostponed = endingBalance + totalFlexible
    
    // Сценарий 2: Перенести только крупные гибкие (> 1000)
    const largeFlexible = Object.entries(flexiblePaymentsMap)
        .filter(([_, amount]) => amount >= 1000)
        .sort((a, b) => b[1] - a[1])
    const totalLargeFlexible = largeFlexible.reduce((sum, [_, amount]) => sum + amount, 0)
    const balanceIfLargeFlexiblePostponed = endingBalance + totalLargeFlexible
    
    // Топ-3 крупнейших гибких платежа
    const top3Flexible = Object.entries(flexiblePaymentsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    const totalTop3Flexible = top3Flexible.reduce((sum, [_, amount]) => sum + amount, 0)
    const balanceIfTop3Postponed = endingBalance + totalTop3Flexible
    
    const summary = {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        startBalance: initialBalance,
        endingBalance,
        balanceChange,
        minBalance,
        dateMinBalance,
        maxBalance,
        dateMaxBalance,
        lowDays,
        negativeDays,
        criticalPeriods,
        flexiblePayments,
        fixedPayments,
        daysNegative: negativeDays.length,
        // Новые поля для ИИ
        totalFlexible,
        totalFixed,
        // Готовые сценарии
        scenarios: {
            // Если перенести ВСЕ гибкие
            allFlexiblePostponed: {
                savings: totalFlexible,
                newBalance: balanceIfAllFlexiblePostponed,
            },
            // Если перенести топ-3 крупнейших
            top3Postponed: {
                payments: top3Flexible.map(([name, amount]) => `${name} (-${amount})`),
                savings: totalTop3Flexible,
                newBalance: balanceIfTop3Postponed,
            },
        },
    }
    
    return {
        dailyRows,
        summary,
    }
}
