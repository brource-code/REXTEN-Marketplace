import { PortfolioItem } from '@/types/marketplace'

export const getPortfolio = (businessCategory: string): PortfolioItem[] => {
    const portfolioByCategory: Record<string, PortfolioItem[]> = {
        beauty: [
            {
                id: 1,
                title: 'Окрашивание + укладка',
                tag: 'Цвет и уход',
                imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 2,
                title: 'Укладка на мероприятие',
                tag: 'Свадебный образ',
                imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a13737?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 3,
                title: 'Мелирование',
                tag: 'Окрашивание',
                imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 4,
                title: 'Стрижка и укладка',
                tag: 'Классика',
                imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a8a7463b0?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 5,
                title: 'Маникюр премиум',
                tag: 'Nail-дизайн',
                imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 6,
                title: 'Мужская стрижка',
                tag: 'Барбер',
                imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
            },
        ],
        wellness: [
            {
                id: 1,
                title: 'Массаж общий',
                tag: 'Релаксация',
                imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 2,
                title: 'Лечебный массаж',
                tag: 'Реабилитация',
                imageUrl: 'https://images.unsplash.com/photo-1523419409543-0c1df022bddb?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 3,
                title: 'Йога-сессия',
                tag: 'Групповое занятие',
                imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
            },
        ],
        home: [
            {
                id: 1,
                title: 'Генеральная уборка',
                tag: 'Клининг',
                imageUrl: 'https://images.unsplash.com/photo-1489278353717-ebfbb99c6f85?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 2,
                title: 'Уход за газоном',
                tag: 'Ландшафт',
                imageUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 3,
                title: 'Детейлинг авто',
                tag: 'Автосервис',
                imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
            },
        ],
        auto: [
            {
                id: 1,
                title: 'Техобслуживание',
                tag: 'СТО',
                imageUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 2,
                title: 'Ремонт двигателя',
                tag: 'Механика',
                imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
            },
        ],
        education: [
            {
                id: 1,
                title: 'Подготовка к SAT',
                tag: 'Обучение',
                imageUrl: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 2,
                title: 'Музыкальный урок',
                tag: 'Музыка',
                imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80',
            },
        ],
        events: [
            {
                id: 1,
                title: 'Свадебная организация',
                tag: 'События',
                imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
            },
            {
                id: 2,
                title: 'Фотосессия',
                tag: 'Фото',
                imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
            },
        ],
    }

    return portfolioByCategory[businessCategory] || [
        {
            id: 1,
            title: 'Пример работы',
            tag: 'Услуга',
            imageUrl: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
        },
        {
            id: 2,
            title: 'Пример работы 2',
            tag: 'Услуга',
            imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
        },
    ]
}

