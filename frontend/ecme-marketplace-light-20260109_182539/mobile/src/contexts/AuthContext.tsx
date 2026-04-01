import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, isAuthenticated, logout as apiLogout, login as apiLogin, LoginRequest } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@user_data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Сначала пытаемся загрузить пользователя из AsyncStorage (быстрее)
      const userStr = await AsyncStorage.getItem('@user_data');
      if (userStr) {
        try {
          const cachedUser = JSON.parse(userStr);
          setUser(cachedUser);
          setIsLoading(false);
          // Затем проверяем токен и обновляем пользователя с сервера в фоне
          const authenticated = await isAuthenticated();
          if (authenticated) {
            try {
              const currentUser = await getCurrentUser();
              if (currentUser) {
                setUser(currentUser);
              }
            } catch (error) {
              console.error('Failed to refresh user from server:', error);
              // Оставляем пользователя из кэша, если сервер недоступен
            }
          } else {
            // Токен отсутствует, очищаем пользователя
            setUser(null);
            await AsyncStorage.multiRemove(['@auth_token', '@refresh_token', '@user_data']);
          }
          return;
        } catch (parseError) {
          console.error('Failed to parse cached user:', parseError);
        }
      }
      
      // Если нет кэшированного пользователя, проверяем токен
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      const result = await apiLogin(credentials);
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error in context:', error);
      return false;
    }
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Сохраняем обновленного пользователя в кэш
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      }
    } catch (error: any) {
      // Если получили 401, не выкидываем пользователя сразу - возможно токен просто истек
      // но данные уже сохранены на сервере
      if (error?.response?.status === 401) {
        console.warn('Failed to refresh user: token expired, but user data may still be valid');
        // Пытаемся обновить токен через refresh token (это должно происходить в apiClient interceptor)
        // Если не получилось - просто возвращаемся, не очищаем пользователя
        return;
      }
      // Для других ошибок пробрасываем дальше
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

