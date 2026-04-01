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
    const hasPeriod = filters?.date_from && filters?.date_to
    return useQuery({
        queryKey: reportsKeys.overview(filters),
        queryFn: () => getReportsOverview(filters),
        enabled: !!hasPeriod, // Запрос только если период указан
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по бронированиям
export function useBookingsReport(filters?: ReportsFilters) {
    const hasPeriod = filters?.date_from && filters?.date_to
    return useQuery({
        queryKey: reportsKeys.bookings(filters),
        queryFn: () => getBookingsReport(filters),
        enabled: !!hasPeriod, // Запрос только если период указан
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по клиентам
export function useClientsReport(filters?: ReportsFilters) {
    const hasPeriod = filters?.date_from && filters?.date_to
    return useQuery({
        queryKey: reportsKeys.clients(filters),
        queryFn: () => getClientsReport(filters),
        enabled: !!hasPeriod, // Запрос только если период указан
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по заработку
export function useRevenueReport(filters?: ReportsFilters) {
    const hasPeriod = filters?.date_from && filters?.date_to
    return useQuery({
        queryKey: reportsKeys.revenue(filters),
        queryFn: () => getRevenueReport(filters),
        enabled: !!hasPeriod, // Запрос только если период указан
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения отчета по исполнителям
export function useSpecialistsReport(filters?: ReportsFilters) {
    const hasPeriod = filters?.date_from && filters?.date_to
    return useQuery({
        queryKey: reportsKeys.specialists(filters),
        queryFn: () => getSpecialistsReport(filters),
        enabled: !!hasPeriod, // Запрос только если период указан
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

