import ApiService from './ApiService'

export async function apiGetScrumBoards() {
    return ApiService.fetchDataWithAxios({
        url: '/projects/scrum-board',
        method: 'get',
    })
}

export async function apiGetProjectMembers() {
    return ApiService.fetchDataWithAxios({
        url: '/projects/scrum-board/members',
        method: 'get',
    })
}

export async function apiGetProject({ id, ...params }) {
    return ApiService.fetchDataWithAxios({
        url: `/projects/${id}`,
        method: 'get',
        params,
    })
}
