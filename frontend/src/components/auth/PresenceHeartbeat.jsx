'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store'
import { getPresenceClientSessionId } from '@/utils/presenceSessionId'
import { postUserPresenceHeartbeat } from '@/lib/api/presence'

const INTERVAL_MS = 50_000

/**
 * Пульс «я онлайн» для JWT-клиентов: без этого сервер не знает об открытых вкладках.
 */
export default function PresenceHeartbeat() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const timerRef = useRef(null)

    useEffect(() => {
        if (!isAuthenticated) {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            return
        }

        const tick = async () => {
            try {
                const sid = getPresenceClientSessionId()
                if (!sid) {
                    return
                }
                const res = await postUserPresenceHeartbeat(sid)
                if (res?.client_session_id && typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem('rexten_presence_client_session_id', res.client_session_id)
                    } catch {
                        /* ignore */
                    }
                }
            } catch {
                /* сеть / 401 — тихо */
            }
        }

        tick()
        timerRef.current = setInterval(tick, INTERVAL_MS)

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [isAuthenticated])

    return null
}
