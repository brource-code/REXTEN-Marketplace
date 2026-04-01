'use client'

import { createContext, useContext } from 'react'
import { State, City, LocationState } from '@/services/location/types'

export interface LocationContextValue {
    // Состояние
    state: string | null
    city: string | null
    availableStates: State[]
    availableCities: City[]
    
    // Действия
    setState: (stateId: string | null) => void
    setCity: (cityName: string | null) => void
    setLocation: (stateId: string | null, cityName: string | null) => void
    reset: () => void
    
    // Утилиты
    getStateName: (stateId: string | null) => string
    getCityName: (cityName: string | null) => string
    isValidLocation: (stateId: string, cityName?: string) => boolean
    
    // Метаданные
    isLoading: boolean
    error: Error | null
}

export const LocationContext = createContext<LocationContextValue | undefined>(undefined)

export function useLocationContext() {
    const context = useContext(LocationContext)
    if (!context) {
        throw new Error('useLocationContext must be used within LocationProvider')
    }
    return context
}

