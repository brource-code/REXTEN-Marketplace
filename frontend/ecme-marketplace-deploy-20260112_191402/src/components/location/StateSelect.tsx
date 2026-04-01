'use client'

import { useMemo } from 'react'
import Select from '@/components/ui/Select'
import { useLocation } from '@/hooks/useLocation'

interface StateSelectProps {
    value?: string | null
    onChange?: (stateId: string | null) => void
    placeholder?: string
    className?: string
    instanceId?: string
    isClearable?: boolean
    isLoading?: boolean
}

/**
 * Компонент выбора штата
 * Использует единый источник истины из LocationProvider
 */
export function StateSelect({
    value,
    onChange,
    placeholder = 'Выберите штат',
    className,
    instanceId = 'state-select',
    isClearable = true,
    isLoading: externalLoading,
}: StateSelectProps) {
    const { availableStates, setState, isLoading: contextLoading, getStateName } = useLocation()
    
    const isLoading = externalLoading ?? contextLoading
    
    // Формируем опции для Select
    const options = useMemo(() => {
        return availableStates.map(state => ({
            value: state.id,
            label: state.name,
        }))
    }, [availableStates])
    
    // Текущее значение
    const currentValue = useMemo(() => {
        if (!value) return null
        const state = availableStates.find(s => s.id === value || s.name === value)
        if (!state) return null
        return {
            value: state.id,
            label: state.name,
        }
    }, [value, availableStates])
    
    const handleChange = (option: { value: string; label: string } | null) => {
        const newState = option?.value || null
        setState(newState)
        onChange?.(newState)
    }
    
    return (
        <Select
            instanceId={instanceId}
            placeholder={placeholder}
            options={options}
            value={currentValue}
            onChange={handleChange}
            isClearable={isClearable}
            isLoading={isLoading}
            className={className}
        />
    )
}

