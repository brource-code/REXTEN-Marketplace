'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getClientProfile,
    updateClientProfile,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    getClientOrders,
    getClientBookings,
    cancelBooking,
} from '@/lib/api/client'

// Query keys
export const clientKeys = {
    all: ['client'] as const,
    profile: () => [...clientKeys.all, 'profile'] as const,
    orders: (filters?: any) => [...clientKeys.all, 'orders', filters] as const,
    bookings: (filters?: any) => [...clientKeys.all, 'bookings', filters] as const,
}

// Хук для получения профиля клиента
export function useClientProfile() {
    return useQuery({
        queryKey: clientKeys.profile(),
        queryFn: getClientProfile,
    })
}

// Хук для обновления профиля
export function useUpdateClientProfile() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: updateClientProfile,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.profile() })
            // Обновляем userStore с данными, включая name
            if (typeof window !== 'undefined') {
                const { useUserStore } = require('@/store')
                const { setUser } = useUserStore.getState()
                // Формируем name из firstName и lastName, если его нет
                const userData = {
                    ...data,
                    name: data.name || (data.firstName || data.lastName 
                        ? `${data.firstName || ''} ${data.lastName || ''}`.trim() 
                        : null),
                }
                setUser(userData)
            }
        },
    })
}

// Хук для загрузки аватара
export function useUploadAvatar() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: uploadAvatar,
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: clientKeys.profile() })
            // Обновляем userStore
            if (typeof window !== 'undefined') {
                const { useUserStore } = require('@/store')
                const { user, setUser } = useUserStore.getState()
                const avatarUrl = data.avatar || data.data?.avatar || data
                if (user) {
                    setUser({
                        ...user,
                        avatar: avatarUrl,
                        image: avatarUrl,
                    })
                }
            }
        },
    })
}

// Хук для удаления аватара
export function useDeleteAvatar() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: deleteAvatar,
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.profile() })
            // Обновляем userStore
            if (typeof window !== 'undefined') {
                const { useUserStore } = require('@/store')
                const { user, setUser } = useUserStore.getState()
                if (user) {
                    setUser({
                        ...user,
                        avatar: null,
                        image: null,
                    })
                }
            }
        },
    })
}

// Хук для изменения пароля
export function useChangePassword() {
    return useMutation({
        mutationFn: changePassword,
    })
}

// Хук для получения заказов
export function useClientOrders(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
    return useQuery({
        queryKey: clientKeys.orders(filters),
        queryFn: () => getClientOrders(filters),
    })
}

// Хук для получения бронирований
export function useClientBookings(filters?: { status?: string; upcoming?: boolean }) {
    return useQuery({
        queryKey: clientKeys.bookings(filters),
        queryFn: () => getClientBookings(filters),
    })
}

// Хук для отмены бронирования
export function useCancelBooking() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: cancelBooking,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientKeys.bookings() })
        },
    })
}

