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
  // Для физического устройства используем IP адрес компьютера
  // Для iOS симулятора можно использовать localhost
  // Для Android эмулятора используется 10.0.2.2
  // Определяем IP автоматически или используем дефолтный
  return __DEV__
    ? 'http://192.168.1.120:8000/api' // IP адрес для физического устройства
    : 'https://your-api-host.com/api'; // Production - TODO: замените на реальный URL
};

export const API_BASE_URL = getApiBaseUrl();

// Вспомогательная функция для логирования (только в dev режиме)
export const logApiUrl = () => {
  if (__DEV__) {
    console.log('API Base URL:', API_BASE_URL);
  }
};

