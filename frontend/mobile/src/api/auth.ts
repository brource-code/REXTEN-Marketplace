// API слой для авторизации
import axios from 'axios';
import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTenantCompanyId, setTenantCompanyId, clearTenantInMemory } from '../business/tenant';
import { clearPresenceSessionStorage } from '../utils/presenceSessionId';

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

// current_company_id для /business/* (как LaravelAxios на вебе)
apiClient.interceptors.request.use(
  async (config) => {
    const url = config.url || '';
    if (!url.includes('/business/')) {
      return config;
    }
    const businessId = getTenantCompanyId();
    if (businessId == null) {
      return config;
    }
    const companyParam = { current_company_id: businessId };
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get') {
      config.params = { ...(config.params || {}), ...companyParam };
    } else if (config.data instanceof FormData) {
      const fd = config.data as FormData;
      if (typeof fd.set === 'function') {
        fd.set('current_company_id', String(businessId));
      } else {
        fd.append('current_company_id', String(businessId));
      }
    } else if (config.data && typeof config.data === 'object') {
      const d = config.data as Record<string, unknown>;
      if (d.current_company_id == null) {
        config.data = { ...d, ...companyParam };
      }
    } else if ((!config.data || (typeof config.data === 'object' && Object.keys(config.data as object).length === 0)) && businessId) {
      config.data = companyParam;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки 401 ошибок
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Пропускаем ошибки для публичных маршрутов авторизации
    const isAuthRoute = error.config?.url?.includes('/auth/login') 
      || error.config?.url?.includes('/auth/register') 
      || error.config?.url?.includes('/auth/refresh')
      || error.config?.url?.includes('/auth/logout');
    
    
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

function readRoleFromJwt(token: string): string | undefined {
  try {
    const part = token.split('.')[1];
    if (!part) return undefined;
    const payload = JSON.parse(atob(part)) as { role?: string };
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
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
    const rawUser = data.user || data.data?.user;
    const user =
      rawUser && token
        ? { ...rawUser, role: rawUser.role ?? readRoleFromJwt(token) }
        : rawUser;
    
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
      void apiClient.post('/auth/logout').catch(() => {});
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTenantInMemory();
    await setTenantCompanyId(null);
    await clearPresenceSessionStorage();
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Laravel /auth/me отдаёт плоский объект { id, email, role, ... } без обёртки data/user
    const response = await apiClient.get<Record<string, unknown>>('/auth/me');
    const raw = response.data;
    const user =
      (raw?.data as User | undefined) ??
      (raw?.user as User | undefined) ??
      (raw?.id != null && raw?.email != null ? (raw as unknown as User) : null);
    if (user) {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const merged =
        token && !user.role ? { ...user, role: readRoleFromJwt(token) } : user;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    }

    return null;
  } catch (error: unknown) {
    console.error('Get current user error:', error);
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return null;
    }
    try {
      const userStr = await AsyncStorage.getItem(USER_KEY);
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** true, если access-токен (JWT) истёк по полю exp */
export function isAccessTokenExpired(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return true;
    const payload = JSON.parse(atob(part)) as { exp?: number };
    if (payload.exp == null) return false;
    return Date.now() >= payload.exp * 1000 - 15_000;
  } catch {
    return true;
  }
}

/**
 * Есть ли смысл считать сессию живой: валидный access ИЛИ есть refresh для обновления.
 */
export async function isAuthenticated(): Promise<boolean> {
  const access = await AsyncStorage.getItem(TOKEN_KEY);
  const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (access && !isAccessTokenExpired(access)) return true;
  if (refresh) return true;
  return false;
}

/**
 * Получить токен
 */
export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export { apiClient };

