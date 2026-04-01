'use client'

import { useLocation } from '@/hooks/useLocation'

interface LocationDisplayProps {
    className?: string
    showIcon?: boolean
    separator?: string
}

/**
 * Компонент отображения текущей локации
 */
export function LocationDisplay({
    className = '',
    showIcon = false,
    separator = ', ',
}: LocationDisplayProps) {
    const { state, city, getStateName } = useLocation()
    
    if (!state && !city) {
        return null
    }
    
    const parts: string[] = []
    if (city) {
        parts.push(city)
    }
    if (state) {
        parts.push(getStateName(state))
    }
    
    return (
        <span className={className}>
            {showIcon && '📍 '}
            {parts.join(separator)}
        </span>
    )
}

