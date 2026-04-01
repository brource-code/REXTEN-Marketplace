// Типы для marketplace данных
// Скопированы из основного проекта для совместимости

export interface Service {
    id: string
    name: string
    category: string
    city: string
    state: string
    location: string
    priceLabel: string
    priceValue: number
    rating: number
    reviewsCount: number
    tags: string[]
    imageUrl: string
    group: string
    description: string
    path: string
    isFeatured?: boolean
}

export interface ServiceItem {
    id: number | string
    name: string
    category: string
    description: string
    price: string
    duration?: string
    service_type?: 'onsite' | 'offsite' | 'hybrid'
}

export interface ScheduleDay {
    id: number
    dayName: string
    dayNumber: number
    month: number
    fullDate: string
    date?: string // Дополнительное поле для API
}

export interface TimeSlot {
    time: string
    available: boolean
    end_time?: string // Дополнительное поле для API
}

export interface Review {
    id: number
    name: string
    rating: number
    date: string
    text: string
    service?: string
    master?: string
    userName?: string // Дополнительные поля из API
    comment?: string
    serviceName?: string
    specialistName?: string
    response?: string
    responseDate?: string
}

export interface TeamMember {
    id: number
    name: string
    role: string
    description: string
    rating: number
    experience: string
    languages: string
    avatarColor?: string
    avatarUrl?: string
}

export interface ServiceProfile {
    service: Service
    servicesList: ServiceItem[]
    schedule: {
        days: ScheduleDay[]
        slots: Record<number, TimeSlot[]>
    }
    reviews: Review[]
    team: TeamMember[]
    portfolio?: PortfolioItem[]
}

export interface Category {
    id: string
    name: string
    description: string
}

export interface State {
    id: string
    name: string
}

export interface PortfolioItem {
    id: number
    title: string
    tag: string
    imageUrl: string
}

