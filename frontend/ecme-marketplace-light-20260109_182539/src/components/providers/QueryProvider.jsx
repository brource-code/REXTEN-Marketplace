'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export default function QueryProvider({ children }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Время, после которого данные считаются устаревшими
                        staleTime: 60 * 1000, // 1 минута
                        // Время кэширования данных
                        gcTime: 5 * 60 * 1000, // 5 минут (было cacheTime)
                        // Количество повторных попыток при ошибке
                        retry: 1,
                        // Рефетч при фокусе окна
                        refetchOnWindowFocus: false,
                        // Рефетч при переподключении - временно отключено для дебага
                        refetchOnReconnect: false,
                    },
                    mutations: {
                        // Количество повторных попыток при ошибке
                        retry: 1,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* DevTools только в development режиме */}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    )
}

