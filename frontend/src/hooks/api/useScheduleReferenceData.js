'use client'

import { useQuery } from '@tanstack/react-query'
import {
    getBusinessServices,
    getScheduleSettings,
    getTeamMembers,
} from '@/lib/api/business'

const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Единый хук-агрегатор справочных данных календаря бронирований:
 *  - services
 *  - schedule settings (часы работы, шаг сетки, перерывы)
 *  - team members (специалисты)
 *
 * Использует React Query staleTime=5min, чтобы новый/повторный
 * BookingDrawer / NewBookingWizard / BlockTimeModal не делали по три запроса.
 */
export function useScheduleReferenceData() {
    const services = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
        staleTime: STALE_TIME_MS,
    })

    const scheduleSettings = useQuery({
        queryKey: ['business-schedule-settings'],
        queryFn: getScheduleSettings,
        staleTime: STALE_TIME_MS,
    })

    // Тот же queryKey, что в календаре / TeamTab — иначе после создания специалиста
    // инвалидируется только ['business-team'], а дроуэр брони держит устаревший список.
    const teamMembers = useQuery({
        queryKey: ['business-team'],
        queryFn: () => getTeamMembers(),
        staleTime: STALE_TIME_MS,
    })

    return {
        services: services.data || [],
        servicesQuery: services,
        scheduleSettings: scheduleSettings.data || null,
        scheduleSettingsQuery: scheduleSettings,
        teamMembers: teamMembers.data || [],
        teamMembersQuery: teamMembers,
        isLoading:
            services.isLoading || scheduleSettings.isLoading || teamMembers.isLoading,
        isError:
            services.isError || scheduleSettings.isError || teamMembers.isError,
    }
}

export default useScheduleReferenceData
