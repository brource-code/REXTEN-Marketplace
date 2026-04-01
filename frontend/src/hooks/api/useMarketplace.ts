'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getServicesList,
    getCategories,
    getStates,
    getServiceBySlug,
    getServiceProfile,
    getFilteredServices,
    getFeaturedServices,
    type ServicesFilters,
} from '@/lib/api/marketplace'

// Query keys для кэширования
export const marketplaceKeys = {
    all: ['marketplace'] as const,
    services: () => [...marketplaceKeys.all, 'services'] as const,
    service: (slug: string) => [...marketplaceKeys.services(), slug] as const,
    serviceProfile: (slug: string) => [...marketplaceKeys.service(slug), 'profile'] as const,
    filteredServices: (filters: ServicesFilters) => [...marketplaceKeys.services(), 'filtered', filters] as const,
    featuredServices: (limit?: number) => [...marketplaceKeys.services(), 'featured', limit] as const,
    categories: () => [...marketplaceKeys.all, 'categories'] as const,
    states: () => [...marketplaceKeys.all, 'states'] as const,
}

// Хук для получения списка всех услуг
export function useServices() {
    return useQuery({
        queryKey: marketplaceKeys.services(),
        queryFn: getServicesList,
    })
}

// Хук для получения услуги по slug
export function useService(slug: string) {
    return useQuery({
        queryKey: marketplaceKeys.service(slug),
        queryFn: () => getServiceBySlug(slug),
        enabled: !!slug,
    })
}

// Хук для получения полного профиля услуги
export function useServiceProfile(slug: string) {
    return useQuery({
        queryKey: marketplaceKeys.serviceProfile(slug),
        queryFn: () => getServiceProfile(slug),
        enabled: !!slug,
    })
}

// Хук для получения отфильтрованных услуг
export function useFilteredServices(filters: ServicesFilters) {
    return useQuery({
        queryKey: marketplaceKeys.filteredServices(filters),
        queryFn: () => getFilteredServices(filters),
    })
}

// Хук для получения рекомендуемых услуг
export function useFeaturedServices(limit = 3) {
    return useQuery({
        queryKey: marketplaceKeys.featuredServices(limit),
        queryFn: () => getFeaturedServices(limit),
    })
}

// Хук для получения категорий
export function useCategories() {
    return useQuery({
        queryKey: marketplaceKeys.categories(),
        queryFn: getCategories,
        staleTime: 10 * 60 * 1000, // 10 минут (категории редко меняются)
    })
}

// Хук для получения штатов
export function useStates() {
    return useQuery({
        queryKey: marketplaceKeys.states(),
        queryFn: getStates,
        staleTime: 10 * 60 * 1000, // 10 минут (штаты не меняются)
    })
}

// Хук для инвалидации кэша услуг
export function useInvalidateServices() {
    const queryClient = useQueryClient()
    
    return () => {
        queryClient.invalidateQueries({ queryKey: marketplaceKeys.services() })
    }
}

