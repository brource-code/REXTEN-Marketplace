import AsyncStorage from '@react-native-async-storage/async-storage';

/** Как на вебе (`frontend/src/utils/presenceSessionId.js`) — один ключ для стабильной сессии присутствия. */
export const PRESENCE_SESSION_STORAGE_KEY = 'rexten_presence_client_session_id';

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Стабильный ID установки приложения для учёта сессий присутствия (heartbeat).
 */
export async function getPresenceClientSessionId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(PRESENCE_SESSION_STORAGE_KEY);
    if (!id || typeof id !== 'string') {
      id = randomId();
      await AsyncStorage.setItem(PRESENCE_SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

/** Сохранить id, вернувшийся с сервера (обрезка до 64 символов как в UserPresenceController). */
export async function setPresenceClientSessionIdFromServer(id: string): Promise<void> {
  const trimmed = id.length > 64 ? id.slice(0, 64) : id;
  try {
    await AsyncStorage.setItem(PRESENCE_SESSION_STORAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

/** После выхода — новый UUID при следующем входе (как clearPresenceSessionStorage на вебе). */
export async function clearPresenceSessionStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRESENCE_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
