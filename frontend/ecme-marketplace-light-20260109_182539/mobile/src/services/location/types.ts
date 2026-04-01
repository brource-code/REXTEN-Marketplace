// Типы для Location Service (React Native)

export interface State {
    id: string
    name: string
    code?: string
    fullName?: string
    citiesCount?: number
    servicesCount?: number
}

export interface City {
    id?: string
    name: string
    stateId: string
    stateName?: string
    servicesCount?: number
}

export interface LocationSearchResult {
    states: State[]
    cities: City[]
}

export interface LocationValidationResult {
    valid: boolean
    data: {
        state: {
            id: string
            name: string
        }
        city: {
            id: string
            name: string
        } | null
    } | null
}

export interface LocationApiResponse<T> {
    success: boolean
    data: T
    meta?: {
        total?: number
        state?: string
        cached?: boolean
        cacheExpiresAt?: string
    }
}

