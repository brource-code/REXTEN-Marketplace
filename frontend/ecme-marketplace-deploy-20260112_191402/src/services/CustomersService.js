import ApiService from './ApiService'

export async function apiGetCustomerLog({ ...params }) {
    return ApiService.fetchDataWithAxios({
        url: `/customers/log`,
        method: 'get',
        params,
    })
}

export async function apiGetCustomers({ ...params }) {
    return ApiService.fetchDataWithAxios({
        url: `/customers`,
        method: 'get',
        params,
    })
}
