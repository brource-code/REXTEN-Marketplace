import { ServiceItem } from '@/types/marketplace'

export const getServiceItems = (businessCategory: string): ServiceItem[] => {
    const servicesByCategory: Record<string, ServiceItem[]> = {
        beauty: [
            {
                id: 1,
                name: 'Стрижка и укладка',
                category: 'Салон красоты • стрижка',
                description: 'Профессиональная стрижка с укладкой от опытного мастера. Консультация по форме и стилю.',
                price: 'от $75',
                duration: '≈ 1.5 часа',
            },
            {
                id: 2,
                name: 'Окрашивание волос',
                category: 'Салон красоты • окрашивание',
                description: 'Полное окрашивание с использованием профессиональных средств. Консультация по цвету.',
                price: 'от $120',
                duration: '≈ 2.5 часа',
            },
            {
                id: 3,
                name: 'Мелирование',
                category: 'Салон красоты • окрашивание',
                description: 'Классическое или современное мелирование. Подбор оттенков под ваш цветотип.',
                price: 'от $95',
                duration: '≈ 2 часа',
            },
            {
                id: 4,
                name: 'Уход за волосами',
                category: 'Салон красоты • уход',
                description: 'Профессиональный уход с масками и сыворотками. Восстановление и питание.',
                price: 'от $55',
                duration: '≈ 1 час',
            },
        ],
        wellness: [
            {
                id: 1,
                name: 'Массаж общий',
                category: 'Массаж • общий',
                description: 'Расслабляющий массаж всего тела. Снятие напряжения и улучшение кровообращения.',
                price: 'от $90',
                duration: '≈ 1 час',
            },
            {
                id: 2,
                name: 'Массаж лечебный',
                category: 'Массаж • реабилитация',
                description: 'Лечебный массаж для восстановления после травм. Работа с проблемными зонами.',
                price: 'от $120',
                duration: '≈ 1.5 часа',
            },
        ],
        home: [
            {
                id: 1,
                name: 'Генеральная уборка',
                category: 'Клининг квартир',
                description: 'Полная уборка квартиры: пылесос, мытье полов, сантехники, кухни. Включены все комнаты.',
                price: 'от $110',
                duration: '≈ 3 часа',
            },
            {
                id: 2,
                name: 'Еженедельная уборка',
                category: 'Клининг квартир',
                description: 'Поддерживающая уборка для поддержания чистоты. Подписка доступна.',
                price: 'от $80',
                duration: '≈ 2 часа',
            },
        ],
    }
    
    return servicesByCategory[businessCategory] || [
        {
            id: 1,
            name: businessCategory || 'Основная услуга',
            category: businessCategory || 'Услуга',
            description: 'Описание услуги будет добавлено позже.',
            price: 'от $75',
            duration: '≈ 1 час',
        },
    ]
}

