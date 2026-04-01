'use client'

import { useMemo } from 'react'
import Select from '@/components/ui/Select'
import { useLocation } from '@/hooks/useLocation'

interface CitySelectProps {
    value?: string | null
    onChange?: (cityName: string | null) => void
    placeholder?: string
    className?: string
    instanceId?: string
    isClearable?: boolean
    isSearchable?: boolean
    isLoading?: boolean
}

/**
 * Компонент выбора города
 * Использует единый источник истины из LocationProvider
 * Показывается только если выбран штат
 */
export function CitySelect({
    value,
    onChange,
    placeholder = 'Город (опционально)',
    className,
    instanceId = 'city-select',
    isClearable = true,
    isSearchable = true,
    isLoading: externalLoading,
}: CitySelectProps) {
    const { state, availableCities, setCity, isLoading: contextLoading } = useLocation()
    
    const isLoading = externalLoading ?? contextLoading
    
    // Формируем опции для Select (всегда вызываем хуки в одном порядке)
    const options = useMemo(() => {
        if (!state || availableCities.length === 0) {
            return []
        }
        return availableCities.map(city => ({
            value: city.name,
            label: city.name,
        }))
    }, [availableCities, state])
    
    // Текущее значение
    const currentValue = useMemo(() => {
        if (!value || !state) return null
        const city = availableCities.find(c => c.name === value || c.id === value)
        if (!city) return null
        return {
            value: city.name,
            label: city.name,
        }
    }, [value, availableCities, state])
    
    const handleChange = (option: { value: string; label: string } | null) => {
        const newCity = option?.value || null
        setCity(newCity)
        onChange?.(newCity)
    }
    
    // Не показываем, если штат не выбран (проверка после всех хуков)
    if (!state) {
        return null
    }
    
    return (
        <Select
            instanceId={instanceId}
            placeholder={placeholder}
            options={options}
            value={currentValue}
            onChange={handleChange}
            isClearable={isClearable}
            isSearchable={isSearchable}
            isLoading={isLoading}
            className={className}
        />
    )
}

