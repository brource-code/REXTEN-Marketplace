'use client'

import { useLocationContext } from '@/contexts/LocationContext'

/**
 * Основной хук для работы с локацией
 * Использует единый источник истины из LocationProvider
 */
export function useLocation() {
    return useLocationContext()
}

