import { apiClient } from './auth';

/** Тот же endpoint, что `frontend/src/lib/api/presence.ts` — JWT через apiClient. */
export async function postUserPresenceHeartbeat(clientSessionId: string): Promise<{
  client_session_id?: string;
  ok?: boolean;
}> {
  const response = await apiClient.post<{ client_session_id?: string; ok?: boolean }>('/user/presence', {
    client_session_id: clientSessionId,
  });
  return response.data ?? {};
}
