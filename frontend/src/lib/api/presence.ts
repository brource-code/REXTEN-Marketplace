import LaravelAxios from '@/services/axios/LaravelAxios'

export async function postUserPresenceHeartbeat(clientSessionId: string): Promise<{
    client_session_id?: string
    ok?: boolean
}> {
    const response = await LaravelAxios.post('/user/presence', {
        client_session_id: clientSessionId,
    })
    return response.data ?? {}
}
