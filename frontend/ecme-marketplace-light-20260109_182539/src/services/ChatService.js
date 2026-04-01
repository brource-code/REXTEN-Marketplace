import ApiService from './ApiService'

export async function apiGetConversation({ id }) {
    return ApiService.fetchDataWithAxios({
        url: `/conversations/${id}`,
        method: 'get',
    })
}

export async function apiGetContacts() {
    return ApiService.fetchDataWithAxios({
        url: `/contacts`,
        method: 'get',
    })
}

export async function apiGetContactDetails({ id }) {
    return ApiService.fetchDataWithAxios({
        url: `/contacts/${id}`,
        method: 'get',
    })
}
