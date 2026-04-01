import ApiService from './ApiService'
import LaravelAxios from '@/services/axios/LaravelAxios'

export async function apiGetNotificationCount() {
    return ApiService.fetchDataWithAxios({
        url: '/notifications/count',
        method: 'get',
    })
}

export async function apiGetNotificationList() {
    return ApiService.fetchDataWithAxios({
        url: '/notifications',
        method: 'get',
    })
}

/** Быстрый поиск в админке бизнеса (JWT + current_company_id через LaravelAxios). */
export async function apiGetBusinessQuickSearch(params) {
    const { data } = await LaravelAxios.get('/business/search', { params })
    return data
}

/** Быстрый поиск в суперадминке (глобально по платформе). */
export async function apiGetAdminQuickSearch(params) {
    const { data } = await LaravelAxios.get('/admin/search', { params })
    return data
}
