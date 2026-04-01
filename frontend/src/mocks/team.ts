import { TeamMember } from '@/types/marketplace'

export const getTeam = (businessCategory: string): TeamMember[] => {
    const teamByCategory: Record<string, TeamMember[]> = {
        beauty: [
            {
                id: 1,
                name: 'Мария Иванова',
                role: 'Колорист',
                description: 'Специалист по окрашиванию волос с опытом 8 лет. Работает с премиум брендами.',
                rating: 4.9,
                experience: '8 лет',
                languages: 'RU/EN',
                avatarColor: 'bg-blue-500',
            },
            {
                id: 2,
                name: 'Анна Петрова',
                role: 'Стилист',
                description: 'Мастер стрижек и укладок. Создает индивидуальные образы для каждого клиента.',
                rating: 4.8,
                experience: '6 лет',
                languages: 'RU',
                avatarColor: 'bg-pink-500',
            },
            {
                id: 3,
                name: 'Елена Смирнова',
                role: 'Мастер маникюра',
                description: 'Специалист по nail-дизайну. Работает в минималистичном и классическом стиле.',
                rating: 4.9,
                experience: '5 лет',
                languages: 'RU/EN',
                avatarColor: 'bg-purple-500',
            },
            {
                id: 4,
                name: 'Ольга Козлова',
                role: 'Барбер',
                description: 'Мастер мужских стрижек и бритья. Классические и современные техники.',
                rating: 4.7,
                experience: '7 лет',
                languages: 'RU',
                avatarColor: 'bg-green-500',
            },
        ],
        wellness: [
            {
                id: 1,
                name: 'Дмитрий Волков',
                role: 'Массажист',
                description: 'Сертифицированный специалист по лечебному и расслабляющему массажу.',
                rating: 4.9,
                experience: '10 лет',
                languages: 'RU/EN',
                avatarColor: 'bg-indigo-500',
            },
            {
                id: 2,
                name: 'Ирина Новикова',
                role: 'Йога-инструктор',
                description: 'Преподаватель хатха и виньяса йоги. Индивидуальные и групповые занятия.',
                rating: 4.8,
                experience: '5 лет',
                languages: 'RU/EN',
                avatarColor: 'bg-teal-500',
            },
        ],
        home: [
            {
                id: 1,
                name: 'Сергей Морозов',
                role: 'Клинер',
                description: 'Специалист по генеральной и поддерживающей уборке. Работает с эко-средствами.',
                rating: 4.9,
                experience: '4 года',
                languages: 'RU',
                avatarColor: 'bg-amber-500',
            },
            {
                id: 2,
                name: 'Татьяна Лебедева',
                role: 'Клинер',
                description: 'Опытный специалист по глубокой уборке. Внимание к деталям и качество.',
                rating: 4.8,
                experience: '6 лет',
                languages: 'RU',
                avatarColor: 'bg-rose-500',
            },
        ],
    }
    
    return teamByCategory[businessCategory] || [
        {
            id: 1,
            name: 'Специалист',
            role: 'Мастер',
            description: 'Опытный специалист с индивидуальным подходом к каждому клиенту.',
            rating: 4.8,
            experience: '5 лет',
            languages: 'RU',
            avatarColor: 'bg-gray-500',
        },
    ]
}

