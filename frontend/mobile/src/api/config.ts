/**
 * Конфигурация API для мобильного приложения
 * 
 * Использует переменную окружения EXPO_PUBLIC_API_BASE_URL
 * 
 * TODO: Установите EXPO_PUBLIC_API_BASE_URL в .env файле или app.config.js
 * Например: EXPO_PUBLIC_API_BASE_URL=https://your-api-host.com/api
 * 
 * Для локальной разработки:
 * - Android эмулятор: http://10.0.2.2:8000/api
 * - iOS симулятор: http://localhost:8000/api
 */

const getApiBaseUrl = (): string => {
  // Используем переменную окружения Expo
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (apiUrl) {
    return apiUrl;
  }

  // Fallback для локальной разработки
  // Для физического устройства используем домен или localhost
  // Для iOS симулятора можно использовать localhost
  // Для Android эмулятора используется 10.0.2.2
  return __DEV__
    ? 'http://localhost:8000/api' // Для локальной разработки
    : 'https://api.rexten.live/api'; // Production
};

export const API_BASE_URL = getApiBaseUrl();

/** Базовый URL сервера (без /api) для статических файлов */
export function getServerBaseUrl(): string {
  const apiUrl = API_BASE_URL;
  // Убираем /api из конца URL
  return apiUrl.replace(/\/api\/?$/, '');
}

/** Нормализует URL изображения (аватара и т.д.) */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Если уже полный URL — возвращаем как есть
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Если относительный путь — добавляем базовый URL сервера
  const baseUrl = getServerBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
}

/** Публичный URL веб-приложения (юридические страницы, редиректы). */
export function getPublicWebBaseUrl(): string {
  const u = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  if (u && typeof u === 'string') {
    return u.replace(/\/$/, '');
  }
  return __DEV__ ? 'http://localhost:3004' : 'https://rexten.live';
}

// Вспомогательная функция для логирования (только в dev режиме)
export const logApiUrl = () => {
  if (__DEV__) {
    console.log('API Base URL:', API_BASE_URL);
  }
};

