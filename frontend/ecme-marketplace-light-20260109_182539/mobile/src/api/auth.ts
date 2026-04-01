// API слой для авторизации
import axios from 'axios';
import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';
const USER_KEY = '@user_data';

// Флаг для предотвращения рекурсии при обновлении токена
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена к запросам
apiClient.interceptors.request.use(
  async (config) => {
    // Не добавляем токен к публичным маршрутам авторизации
    const isAuthRoute = config.url?.includes('/auth/login') 
      || config.url?.includes('/auth/register') 
      || config.url?.includes('/auth/refresh');
    
    if (!isAuthRoute) {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки 401 ошибок
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Пропускаем ошибки для публичных маршрутов авторизации
    const isAuthRoute = error.config?.url?.includes('/auth/login') 
      || error.config?.url?.includes('/auth/register') 
      || error.config?.url?.includes('/auth/refresh');
    
    
    if (error.response?.status === 401 && !isAuthRoute) {
      const originalRequest = error.config;
      
      // Если уже идет обновление токена, добавляем запрос в очередь
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient.request(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;
      
      // Токен истек, пытаемся обновить
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          // Используем прямой axios для refresh, чтобы избежать рекурсии
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          }, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });
          const { token, refresh_token } = response.data.data || response.data;
          if (token) {
            await AsyncStorage.setItem(TOKEN_KEY, token);
            if (refresh_token) {
              await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
            }
            isRefreshing = false;
            processQueue(null, token);
            // Повторяем оригинальный запрос
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient.request(originalRequest);
          } else {
            throw new Error('No token in refresh response');
          }
        } catch (refreshError: any) {
          console.error('Token refresh failed:', refreshError?.response?.data || refreshError?.message);
          isRefreshing = false;
          processQueue(refreshError, null);
          // Не удалось обновить токен - очищаем токены
          try {
            await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
          } catch (e) {
            // Игнорируем ошибки очистки
          }
          return Promise.reject(error); // Возвращаем оригинальную ошибку
        }
      } else {
        isRefreshing = false;
        // Очищаем токены
        try {
          await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
        } catch (e) {
          // Игнорируем ошибки очистки
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  avatar?: string;
  city?: string;
  state?: string;
  address?: string;
  zipCode?: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    refresh_token?: string;
    user: User;
  };
  token?: string;
  refresh_token?: string;
  user?: User;
}

/**
 * Вход в систему
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  try {
    console.log('🔐 Attempting login with:', { email: credentials.email, password: '***' });
    console.log('📡 API Base URL:', API_BASE_URL);
    
    const response = await apiClient.post<any>('/auth/login', credentials);
    const data = response.data;
    
    console.log('✅ Login response:', JSON.stringify(data, null, 2));
    
    // Laravel возвращает access_token напрямую в корне ответа
    const token = data.access_token || data.data?.access_token || data.data?.token || data.token;
    const refreshToken = data.refresh_token || data.data?.refresh_token;
    const user = data.user || data.data?.user;
    
    console.log('🔑 Extracted token:', token ? 'Present' : 'Missing');
    console.log('👤 Extracted user:', user ? 'Present' : 'Missing');
    
    if (token && user) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      console.log('💾 Tokens saved to storage');
      
      return {
        success: true,
        data: { token: token!, refresh_token: refreshToken, user: user! },
      };
    } else {
      console.error('❌ Missing token or user in response');
      return {
        success: false,
        message: 'Неверный формат ответа от сервера',
      };
    }
  } catch (error: any) {
    console.error('❌ Login error:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error headers:', error.response?.headers);
    
    const errorMessage = error.response?.data?.message 
      || error.response?.data?.error 
      || error.message 
      || 'Ошибка входа';
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Регистрация
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<any>('/auth/register', data);
    const responseData = response.data;
    
    // Laravel возвращает access_token напрямую в корне ответа
    const token = responseData.access_token || responseData.data?.access_token || responseData.data?.token || responseData.token;
    const refreshToken = responseData.refresh_token || responseData.data?.refresh_token;
    const user = responseData.user || responseData.data?.user;
    
    if (token && user) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    
    return {
      success: true,
      data: { token: token!, refresh_token: refreshToken, user: user! },
    };
  } catch (error: any) {
    console.error('Register error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Ошибка регистрации',
    };
  }
}

/**
 * Выход из системы
 */
export async function logout(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await apiClient.post('/auth/logout');
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Сначала пытаемся получить с сервера
    const response = await apiClient.get<{ data?: User; user?: User }>('/auth/me');
    const user = response.data.data || response.data.user;
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    // Если ошибка авторизации, пробуем из хранилища
    try {
      const userStr = await AsyncStorage.getItem(USER_KEY);
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
    return null;
  }
}

/**
 * Проверить, авторизован ли пользователь
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
}

/**
 * Получить токен
 */
export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export { apiClient };

