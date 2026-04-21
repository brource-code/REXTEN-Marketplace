import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, getCurrentUser, isAuthenticated, logout as apiLogout, login as apiLogin, LoginRequest } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '../lib/queryClient';

const USER_KEY = '@user_data';

export type LoginResult =
  | { success: true; user: User }
  | { success: false; user?: undefined; emailNotVerified?: boolean; email?: string };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Увеличивается при logout — чтобы корневой Stack навигатор смонтировался заново (гость → маркетплейс). */
  navigationEpoch: number;
  login: (credentials: LoginRequest) => Promise<LoginResult>;
  completeSession: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationEpoch, setNavigationEpoch] = useState(0);
  const authSessionRef = useRef(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const sessionAtStart = authSessionRef.current;
    try {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        if (sessionAtStart === authSessionRef.current) {
          setUser(null);
          await AsyncStorage.multiRemove(['@auth_token', '@refresh_token', '@user_data']);
        }
        return;
      }

      const currentUser = await getCurrentUser();
      if (sessionAtStart !== authSessionRef.current) return;

      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        await AsyncStorage.multiRemove(['@auth_token', '@refresh_token', '@user_data']);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      if (sessionAtStart === authSessionRef.current) {
        setUser(null);
        await AsyncStorage.multiRemove(['@auth_token', '@refresh_token', '@user_data']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest): Promise<LoginResult> => {
    try {
      const result = await apiLogin(credentials);
      if (result.success && result.data?.user) {
        authSessionRef.current += 1;
        setUser(result.data.user);
        return { success: true, user: result.data.user };
      }
      if (
        !result.success &&
        result.code === 'email_not_verified' &&
        typeof result.email === 'string' &&
        result.email
      ) {
        return { success: false, emailNotVerified: true, email: result.email };
      }
      return { success: false };
    } catch (error) {
      console.error('Login error in context:', error);
      return { success: false };
    }
  };

  const completeSession = (sessionUser: User) => {
    authSessionRef.current += 1;
    setUser(sessionUser);
  };

  const logout = async () => {
    authSessionRef.current += 1;
    await apiLogout();
    queryClient.clear();
    setUser(null);
    setNavigationEpoch((e) => e + 1);
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
        navigationEpoch,
        login,
        completeSession,
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

