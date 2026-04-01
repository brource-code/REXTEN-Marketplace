'use client'

import { useOnboarding as useOnboardingContext } from '@/components/onboarding/OnboardingProvider'

/**
 * Хук для работы с онбордингом
 * @returns {Object} Объект с состоянием и методами управления онбордингом
 */
export default function useOnboarding() {
    return useOnboardingContext()
}

