import { useQuery } from '@tanstack/react-query'
import { getLaravelApiUrl } from '@/lib/api/marketplace'

/** Общий ключ кэша для публичных флагов платформы (без JWT). */
export const PLATFORM_PUBLIC_RUNTIME_QUERY_KEY = ['platform-public-runtime']

/**
 * Публичные настройки платформы для клиента (maintenance, stripe, регистрация).
 * staleTime 60s — совпадает с типичным использованием, без лишних запросов при навигации.
 */
export function usePlatformPublicRuntime(queryOptions = {}) {
    return useQuery({
        queryKey: PLATFORM_PUBLIC_RUNTIME_QUERY_KEY,
        queryFn: async () => {
            const res = await fetch(`${getLaravelApiUrl()}/settings/public`, {
                headers: { Accept: 'application/json' },
            })
            if (!res.ok) {
                return null
            }
            const json = await res.json()
            return json.data || json
        },
        staleTime: 60_000,
        ...queryOptions,
    })
}
