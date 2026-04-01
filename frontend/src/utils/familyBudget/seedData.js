import dayjs from 'dayjs'

/**
 * Demo данные для января 2026
 * Основано на реальных событиях из задания
 */

export const january2026Events = [
    // 01.02.26 кредит за Crown - 710
    {
        id: '1',
        date: '2026-01-02',
        type: 'expense',
        name: 'Кредит за Crown',
        amount: -710,
        account: 'credit',
        owner: 'Family',
        category: 'loan',
        flexible: false,
        comment: '',
    },
    
    // 01.03.26 бенефиты +1025
    {
        id: '2',
        date: '2026-01-03',
        type: 'income',
        name: 'Бенефиты',
        amount: 1025,
        account: 'debit',
        owner: 'Family',
        category: 'salary',
        flexible: false,
        comment: '',
    },
    
    // 01.03.26 зп Сережи +1100
    {
        id: '3',
        date: '2026-01-03',
        type: 'income',
        name: 'ЗП Сережи',
        amount: 1100,
        account: 'debit',
        owner: 'Sergei',
        category: 'salary',
        flexible: false,
        comment: '',
    },
    
    // 01.03.26 кредитка Кэпитал Ярослава -1610
    {
        id: '4',
        date: '2026-01-03',
        type: 'expense',
        name: 'Кредитка Кэпитал Ярослава',
        amount: -1610,
        account: 'credit',
        owner: 'Yara',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.05.26 страховка -518 (списывается с кредитки Кэпитал Сережи)
    {
        id: '5',
        date: '2026-01-05',
        type: 'expense',
        name: 'Страховка',
        amount: -518,
        account: 'credit',
        owner: 'Sergei',
        category: 'subscription',
        flexible: false,
        comment: 'Списывается с кредитки Кэпитал Сережи',
    },
    
    // 01.06.26 зп Яра +950 (+250+15 должны за прошлую неделю)
    {
        id: '6',
        date: '2026-01-06',
        type: 'income',
        name: 'ЗП Яра',
        amount: 950,
        account: 'debit',
        owner: 'Yara',
        category: 'salary',
        flexible: false,
        comment: '+250+15 должны за прошлую неделю',
    },
    
    // 01.08.26 кредитка Чейз старый -170
    {
        id: '7',
        date: '2026-01-08',
        type: 'expense',
        name: 'Кредитка Чейз старый',
        amount: -170,
        account: 'credit',
        owner: 'Family',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.08.26 кредитка Пейпал -1050
    {
        id: '8',
        date: '2026-01-08',
        type: 'expense',
        name: 'Кредитка Пейпал',
        amount: -1050,
        account: 'credit',
        owner: 'Family',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.09.26 кредитка Бофа старая -2882
    {
        id: '9',
        date: '2026-01-09',
        type: 'expense',
        name: 'Кредитка Бофа старая',
        amount: -2882,
        account: 'credit',
        owner: 'Family',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.10.26 доп расходы -138
    {
        id: '10',
        date: '2026-01-10',
        type: 'expense',
        name: 'Доп расходы',
        amount: -138,
        account: 'debit',
        owner: 'Family',
        category: 'other',
        flexible: false,
        comment: 'Связь, Amazon prime и обслуживание банка',
    },
    
    // 01.10.26 кредитка credit one -154
    {
        id: '11',
        date: '2026-01-10',
        type: 'expense',
        name: 'Кредитка Credit One',
        amount: -154,
        account: 'credit',
        owner: 'Family',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.13.26 зп Яра +1430
    {
        id: '12',
        date: '2026-01-13',
        type: 'income',
        name: 'ЗП Яра',
        amount: 1430,
        account: 'debit',
        owner: 'Yara',
        category: 'salary',
        flexible: false,
        comment: '',
    },
    
    // 01.14.26 кредитка Кэпитал Sergei -1479
    {
        id: '13',
        date: '2026-01-14',
        type: 'expense',
        name: 'Кредитка Кэпитал Sergei',
        amount: -1479,
        account: 'credit',
        owner: 'Sergei',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.15.26 кредитка Бофа новая -644
    {
        id: '14',
        date: '2026-01-15',
        type: 'expense',
        name: 'Кредитка Бофа новая',
        amount: -644,
        account: 'credit',
        owner: 'Family',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.17.26 зп Сережи +1100
    {
        id: '15',
        date: '2026-01-17',
        type: 'income',
        name: 'ЗП Сережи',
        amount: 1100,
        account: 'debit',
        owner: 'Sergei',
        category: 'salary',
        flexible: false,
        comment: '',
    },
    
    // 01.18.26 кредит за RAV4 -919
    {
        id: '16',
        date: '2026-01-18',
        type: 'expense',
        name: 'Кредит за RAV4',
        amount: -919,
        account: 'credit',
        owner: 'Family',
        category: 'loan',
        flexible: false,
        comment: '',
    },
    
    // 01.20.26 зп Яра +1170
    {
        id: '17',
        date: '2026-01-20',
        type: 'income',
        name: 'ЗП Яра',
        amount: 1170,
        account: 'debit',
        owner: 'Yara',
        category: 'salary',
        flexible: false,
        comment: '',
    },
    
    // 01.23.26 кредитка Чейз новый -2597
    {
        id: '18',
        date: '2026-01-23',
        type: 'expense',
        name: 'Кредитка Чейз новый',
        amount: -2597,
        account: 'credit',
        owner: 'Family',
        category: 'credit',
        flexible: true,
        comment: '',
    },
    
    // 01.27.26 зп Яра +1430
    {
        id: '19',
        date: '2026-01-27',
        type: 'income',
        name: 'ЗП Яра',
        amount: 1430,
        account: 'debit',
        owner: 'Yara',
        category: 'salary',
        flexible: false,
        comment: '',
    },
    
    // 01.27.26 ноут -89
    {
        id: '20',
        date: '2026-01-27',
        type: 'expense',
        name: 'Ноут',
        amount: -89,
        account: 'debit',
        owner: 'Family',
        category: 'other',
        flexible: false,
        comment: '',
    },
    
    // 01.27.26 интернет -62
    {
        id: '21',
        date: '2026-01-27',
        type: 'expense',
        name: 'Интернет',
        amount: -62,
        account: 'debit',
        owner: 'Family',
        category: 'subscription',
        flexible: false,
        comment: '',
    },
    
    // 01.28.26 кредит за пересадку -438 (списывается с кредитки чейз новый, можно считать в следующий платеж)
    {
        id: '22',
        date: '2026-01-28',
        type: 'expense',
        name: 'Кредит за пересадку',
        amount: -438,
        account: 'credit',
        owner: 'Family',
        category: 'loan',
        flexible: true,
        comment: 'Списывается с кредитки чейз новый, можно считать в следующий платеж',
    },
    
    // 01.28.26 за мой телефон -84 (дебет Кэпитал)
    {
        id: '23',
        date: '2026-01-28',
        type: 'expense',
        name: 'Мой телефон',
        amount: -84,
        account: 'debit',
        owner: 'Sergei',
        category: 'subscription',
        flexible: false,
        comment: 'Дебет Кэпитал',
    },
    
    // 01.30.26 Квартира -2350 (+газ, вода и электричество раз в 2 месяца, интернет)
    {
        id: '24',
        date: '2026-01-30',
        type: 'expense',
        name: 'Квартира',
        amount: -2350,
        account: 'debit',
        owner: 'Family',
        category: 'rent',
        flexible: false,
        comment: '+газ, вода и электричество раз в 2 месяца, интернет',
    },
]

/**
 * Получить список гибких платежей из событий
 */
export function getFlexiblePayments(events) {
    return events
        .filter(event => (event.isFlexible || event.flexible) && event.type === 'expense')
        .map(event => event.name)
        .filter((name, index, self) => self.indexOf(name) === index) // уникальные
}

/**
 * Адаптировать demo данные января 2026 под любой месяц
 * @param {string} targetMonth - Месяц в формате YYYY-MM
 * @returns {Array} Массив событий, адаптированных под указанный месяц
 */
export function getDemoDataForMonth(targetMonth) {
    // Парсим целевой месяц
    const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number)
    const targetDate = dayjs(`${targetYear}-${targetMonthNum}-01`)
    
    // Адаптируем каждое событие
    return january2026Events.map(event => {
        // Парсим дату события из базового месяца (январь 2026)
        const eventDate = dayjs(event.date)
        
        // Вычисляем день месяца (1-31)
        const dayOfMonth = eventDate.date()
        
        // Создаем новую дату в целевом месяце
        // Проверяем, что день существует в целевом месяце (например, 31 февраля)
        const daysInTargetMonth = targetDate.daysInMonth()
        const newDay = Math.min(dayOfMonth, daysInTargetMonth)
        
        const newDate = targetDate.date(newDay)
        
        // Возвращаем событие с новой датой
        return {
            ...event,
            date: newDate.format('YYYY-MM-DD'),
        }
    })
}
