'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getSalaryCalculations,
    calculateSalary,
    getSalarySettings,
    updateSalarySettings,
    getSalaryCalculationDetails,
    exportSalaryReport,
    getSalaryReport,
    type SalaryFilters,
    type CalculateSalaryData,
    type SalarySetting,
    type SalaryCalculation,
} from '@/lib/api/business'

// Query keys для кэширования
export const salaryKeys = {
    all: ['business', 'salary'] as const,
    calculations: (filters?: SalaryFilters) => [...salaryKeys.all, 'calculations', filters] as const,
    calculation: (id: number) => [...salaryKeys.all, 'calculation', id] as const,
    settings: (specialistId: number) => [...salaryKeys.all, 'settings', specialistId] as const,
    report: (filters?: SalaryFilters) => [...salaryKeys.all, 'report', filters] as const,
}

// Хук для получения списка расчетов ЗП
export function useSalaryCalculations(filters?: SalaryFilters) {
    return useQuery({
        queryKey: salaryKeys.calculations(filters),
        queryFn: () => getSalaryCalculations(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Хук для получения деталей расчета ЗП
export function useSalaryCalculationDetails(id: number) {
    return useQuery({
        queryKey: salaryKeys.calculation(id),
        queryFn: () => getSalaryCalculationDetails(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    })
}

// Хук для получения настроек оплаты
export function useSalarySettings(specialistId: number) {
    return useQuery({
        queryKey: salaryKeys.settings(specialistId),
        queryFn: () => getSalarySettings(specialistId),
        enabled: !!specialistId,
        staleTime: 5 * 60 * 1000,
    })
}

// Хук для получения отчета по ЗП
export function useSalaryReport(filters?: SalaryFilters, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: salaryKeys.report(filters),
        queryFn: () => getSalaryReport(filters),
        enabled: options?.enabled !== false && !!filters?.date_from && !!filters?.date_to, // Запрос только если период указан
        staleTime: 5 * 60 * 1000,
    })
}

// Хук для расчета ЗП
export function useCalculateSalary() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CalculateSalaryData) => calculateSalary(data),
        onSuccess: () => {
            // Инвалидируем кэш расчетов и отчета
            queryClient.invalidateQueries({ queryKey: salaryKeys.all })
        },
    })
}

// Хук для обновления настроек оплаты
export function useUpdateSalarySettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ specialistId, data }: { specialistId: number; data: Omit<SalarySetting, 'id' | 'specialist_id' | 'created_at'> }) =>
            updateSalarySettings(specialistId, data),
        onSuccess: (_, variables) => {
            // Инвалидируем кэш настроек для этого специалиста
            queryClient.invalidateQueries({ queryKey: salaryKeys.settings(variables.specialistId) })
            // Также инвалидируем все расчеты, так как настройки могли измениться
            queryClient.invalidateQueries({ queryKey: salaryKeys.calculations() })
            // Отчёт по ЗП (вкл. детализацию по исполнителям) — раньше дергался refetch при каждом onClose модалки
            queryClient.invalidateQueries({ queryKey: salaryKeys.all })
        },
    })
}

// Хук для экспорта отчета по ЗП
export function useExportSalaryReport() {
    return useMutation({
        mutationFn: ({ type, filters }: { type: 'csv'; filters?: SalaryFilters }) =>
            exportSalaryReport(type, filters),
    })
}
