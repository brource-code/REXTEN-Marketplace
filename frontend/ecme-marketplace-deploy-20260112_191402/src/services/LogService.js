import ApiService from './ApiService'

export async function apiGetLogs(params) {
    return ApiService.fetchDataWithAxios({
        url: '/logs',
        method: 'get',
        params,
    })
}
