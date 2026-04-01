'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessProfile, completeOnboarding } from '@/lib/api/business'
import useBusinessStore from '@/store/businessStore'

const OnboardingContext = createContext(null)

export const useOnboarding = () => {
    const context = useContext(OnboardingContext)
    if (!context) {
        throw new Error('useOnboarding must be used within OnboardingProvider')
    }
    return context
}

export const OnboardingProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false)
    const queryClient = useQueryClient()
    const setBusiness = useBusinessStore((s) => s.setBusiness)
    const setPermissions = useBusinessStore((s) => s.setPermissions)
    const setIsOwner = useBusinessStore((s) => s.setIsOwner)

    // Загружаем профиль бизнеса для проверки onboarding_completed
    const { data: profile, isLoading } = useQuery({
        queryKey: ['business-profile'],
        queryFn: getBusinessProfile,
        staleTime: 5 * 60 * 1000, // 5 минут
    })

    // Мутация для завершения онбординга
    const completeOnboardingMutation = useMutation({
        mutationFn: completeOnboarding,
        onSuccess: () => {
            // Инвалидируем профиль, чтобы обновить данные
            queryClient.invalidateQueries({ queryKey: ['business-profile'] })
            setIsOpen(false)
        },
    })

    // Устанавливаем данные бизнеса и права в store
    useEffect(() => {
        if (!isLoading && profile) {
            // Устанавливаем businessId и права
            if (profile.id) {
                setBusiness(profile, profile.is_owner || false, profile.permissions || [])
            }
            // Также устанавливаем отдельно (для обратной совместимости)
            setIsOwner(profile.is_owner || false)
            setPermissions(profile.permissions || [])
            
            // Показываем онбординг, если он не завершен
            // Проверяем строго: true означает завершен, все остальное (false, null, undefined, 0, '0') - не завершен
            const isCompleted = profile.onboarding_completed === true || profile.onboarding_completed === 1 || profile.onboarding_completed === '1'
            if (!isCompleted) {
                setIsOpen(true)
            } else {
                setIsOpen(false)
            }
        }
    }, [profile, isLoading, setBusiness, setPermissions, setIsOwner])

    const handleComplete = useCallback(async () => {
        try {
            await completeOnboardingMutation.mutateAsync()
        } catch (error) {
            console.error('Failed to complete onboarding:', error)
        }
    }, [completeOnboardingMutation])

    const handleSkip = useCallback(async () => {
        try {
            await completeOnboardingMutation.mutateAsync()
        } catch (error) {
            console.error('Failed to skip onboarding:', error)
        }
    }, [completeOnboardingMutation])

    const handleClose = useCallback(() => {
        setIsOpen(false)
    }, [])

    const value = {
        isOpen,
        isLoading,
        profile,
        handleComplete,
        handleSkip,
        handleClose,
        isCompleting: completeOnboardingMutation.isPending,
    }

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    )
}

