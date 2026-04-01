'use client'

import { useQuery } from '@tanstack/react-query'
import {
    getReportsOverview,
    getBookingsReport,
    getClientsReport,
    getRevenueReport,
    getSpecialistsReport,
    type ReportsFilters,
} from '@/lib/api/business'

// Query keys для кэширования
export const reportsKeys = {
    all: ['business', 'reports'] as const,
    overview: (filters?: ReportsFilters) => [...reportsKeys.all, 'overview', filters] as const,
    bookings: (filters?: ReportsFilters) => [...reportsKeys.all, 'bookings', filters] as const,
    clients: (filters?: ReportsFilters) => [...reportsKeys.all, 'clients', filters] as const,
    revenue: (filters?: ReportsFilters) => [...reportsKeys.all, 'revenue', filters] as const,
    specialists: (filters?: ReportsFilters) => [...reportsKeys.all, 'specialists', filters] as const,
}

// Хук для получения общей статистики
export function useReportsOverview(filters?: ReportsFilters) {
    return useQuery({
        queryKey: reportsKeys.overview(filters),
        queryFn: () => getReportsOverview(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по бронированиям
export function useBookingsReport(filters?: ReportsFilters) {
    return useQuery({
        queryKey: reportsKeys.bookings(filters),
        queryFn: () => getBookingsReport(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по клиентам
export function useClientsReport(filters?: ReportsFilters) {
    return useQuery({
        queryKey: reportsKeys.clients(filters),
        queryFn: () => getClientsReport(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по заработку
export function useRevenueReport(filters?: ReportsFilters) {
    return useQuery({
        queryKey: reportsKeys.revenue(filters),
        queryFn: () => getRevenueReport(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по исполнителям
export function useSpecialistsReport(filters?: ReportsFilters) {
    return useQuery({
        queryKey: reportsKeys.specialists(filters),
        queryFn: () => getSpecialistsReport(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

