import ApiService from './ApiService'

export async function apiGetSupportHubArticles(params) {
    return ApiService.fetchDataWithAxios({
        url: '/helps/articles',
        method: 'get',
        params,
    })
}

export async function apiDeleteSupportHubArticles(data) {
    return ApiService.fetchDataWithAxios({
        url: '/helps/articles',
        method: 'delete',
        data,
    })
}
