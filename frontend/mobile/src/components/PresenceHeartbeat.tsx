import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPresenceClientSessionId, setPresenceClientSessionIdFromServer } from '../utils/presenceSessionId';
import { postUserPresenceHeartbeat } from '../api/presence';

const INTERVAL_MS = 50_000;

/**
 * Пульс «я онлайн» для JWT-клиентов (тот же механизм, что PresenceHeartbeat на вебе).
 */
export function PresenceHeartbeat() {
  const { isAuthenticated } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = async () => {
      try {
        const sid = await getPresenceClientSessionId();
        if (!sid) return;
        const res = await postUserPresenceHeartbeat(sid);
        if (res?.client_session_id && typeof res.client_session_id === 'string') {
          await setPresenceClientSessionIdFromServer(res.client_session_id);
        }
      } catch {
        /* сеть / 401 — тихо */
      }
    };

    void tick();
    timerRef.current = setInterval(() => {
      void tick();
    }, INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated]);

  return null;
}
