'use client'

import { useLocation } from './useLocation'

/**
 * Хук для работы только с состоянием локации (без данных из API)
 * Удобен для компонентов, которым не нужны списки штатов/городов
 */
export function useLocationState() {
    const { state, city, setState, setCity, setLocation, reset } = useLocation()
    
    return {
        state,
        city,
        setState,
        setCity,
        setLocation,
        reset,
    }
}

