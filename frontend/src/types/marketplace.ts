// Типы для marketplace данных

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
    cancellationFreeHours?: number
    cancellationLateFeePercent?: number
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
}

export interface TimeSlot {
    time: string
    available: boolean
}

export interface Review {
    id: number
    name: string
    rating: number
    date: string
    text: string
    service?: string
    master?: string
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
    portfolio?: Array<{
        id: string
        imageUrl: string
        images?: string[]
        title: string
        description?: string
        tag?: string
    }>
    // Настройки маркетплейса компании
    allowBooking?: boolean
    showReviews?: boolean
    showPortfolio?: boolean
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
    id: number | string
    title: string
    description?: string
    tag?: string
    imageUrl?: string // Для обратной совместимости
    images?: string[] // Массив изображений
}

