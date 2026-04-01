// Location Provider для React Native
// Адаптировано из веб-версии для работы с AsyncStorage

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationContext, LocationContextValue } from '../../contexts/LocationContext';
import { State, City } from '../../services/location/types';
import { getStates, getCities, getStateName as getStateNameUtil, validateLocation } from '../../services/location/LocationService';
import { useAuth } from '../../contexts/AuthContext';

interface LocationProviderProps {
    children: React.ReactNode;
    initialState?: string | null;
    initialCity?: string | null;
}

const STORAGE_KEY = '@location-state';
const COOLDOWN_TIME = 90 * 60 * 1000; // 90 минут в миллисекундах

export default function LocationProvider({
    children,
    initialState = null,
    initialCity = null,
}: LocationProviderProps) {
    // Получаем данные пользователя из AuthContext
    const { user } = useAuth();
    const userState = user?.state || null;
    const userCity = user?.city || null;

    // Основное состояние локации (единый источник истины)
    const [state, setStateInternal] = useState<string | null>(initialState);
    const [city, setCityInternal] = useState<string | null>(initialCity);

    // Данные из API
    const [availableStates, setAvailableStates] = useState<State[]>([]);
    const [availableCities, setAvailableCities] = useState<City[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Флаги для предотвращения циклов
    const isInitializing = useRef(true);
    const isUpdatingFromStorage = useRef(false);

    // 1. Инициализация: загрузка штатов и восстановление состояния
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                setIsLoading(true);

                // 1. Загружаем штаты из API
                const states = await getStates();
                if (mounted) {
                    setAvailableStates(states);
                }

                // 2. Восстанавливаем состояние из AsyncStorage или профиля
                try {
                    // ПРИОРИТЕТ: Если пользователь залогинен - используем профиль, а не сохраненную локацию
                    if (userState) {
                        console.log('📍 User logged in, using profile location:', { userState, userCity });
                        if (mounted) {
                            isUpdatingFromStorage.current = true;
                            setStateInternal(userState);
                            setCityInternal(userCity || null);
                            isUpdatingFromStorage.current = false;
                        }
                        // Очищаем сохраненную локацию, если она была выбрана до логина
                        try {
                            await AsyncStorage.removeItem(STORAGE_KEY);
                            await AsyncStorage.removeItem(`${STORAGE_KEY}-reset-time`);
                            console.log('📍 Cleared stored location after login');
                        } catch (clearError) {
                            console.warn('Error clearing stored location:', clearError);
                        }
                    } else {
                        // Пользователь не залогинен - используем сохраненную локацию
                        const stored = await AsyncStorage.getItem(STORAGE_KEY);
                        const resetTime = await AsyncStorage.getItem(`${STORAGE_KEY}-reset-time`);

                        if (stored) {
                            const parsed = JSON.parse(stored);
                            const resetTimestamp = resetTime ? parseInt(resetTime, 10) : null;
                            const now = Date.now();

                            // Проверяем кулдаун: если прошло меньше 90 минут с последнего сброса - не используем сохраненную локацию
                            if (resetTimestamp && (now - resetTimestamp) < COOLDOWN_TIME) {
                                console.log('📍 Cooldown active, not using stored location');
                                // Не используем сохраненную локацию во время cooldown
                                if (mounted) {
                                    isUpdatingFromStorage.current = true;
                                    setStateInternal(null);
                                    setCityInternal(null);
                                    isUpdatingFromStorage.current = false;
                                }
                            } else if (parsed.state || parsed.city) {
                                // Используем сохраненное состояние
                                console.log('📍 Using stored location (user not logged in):', { state: parsed.state, city: parsed.city });
                                if (mounted) {
                                    isUpdatingFromStorage.current = true;
                                    setStateInternal(parsed.state || null);
                                    setCityInternal(parsed.city || null);
                                    isUpdatingFromStorage.current = false;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error reading location from AsyncStorage:', e);
                    // Fallback на данные пользователя, если залогинен
                    if (mounted && userState) {
                        isUpdatingFromStorage.current = true;
                        setStateInternal(userState);
                        setCityInternal(userCity || null);
                        isUpdatingFromStorage.current = false;
                    }
                }
            } catch (err) {
                console.error('Error initializing location:', err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize location');
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    isInitializing.current = false;
                }
            }
        };

        initialize();

        return () => {
            mounted = false;
        };
    }, [userState, userCity]); // Переинициализируем при изменении пользователя (логин/логаут)

    // 2. Обновление при изменении данных пользователя (логин/логаут/обновление профиля)
    useEffect(() => {
        if (isInitializing.current || isUpdatingFromStorage.current) {
            return;
        }

        const handleUserChange = async () => {
            // Если пользователь залогинен - приоритет у профиля
            if (userState) {
                // При логине всегда используем профиль и очищаем сохраненную локацию
                // (которая могла быть выбрана до логина)
                console.log('📍 User logged in, using profile location:', { userState, userCity });
                isUpdatingFromStorage.current = true;
                setStateInternal(userState);
                setCityInternal(userCity || null);
                isUpdatingFromStorage.current = false;
                
                // Очищаем сохраненную локацию, которая могла быть выбрана до логина
                try {
                    await AsyncStorage.removeItem(STORAGE_KEY);
                    await AsyncStorage.removeItem(`${STORAGE_KEY}-reset-time`);
                    console.log('📍 Cleared stored location after login');
                } catch (clearError) {
                    console.warn('Error clearing stored location:', clearError);
                }
            } else {
                // Пользователь разлогинен - используем сохраненную локацию или null
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const resetTime = await AsyncStorage.getItem(`${STORAGE_KEY}-reset-time`);
                    const resetTimestamp = resetTime ? parseInt(resetTime, 10) : null;
                    const now = Date.now();
                    
                    // Если cooldown активен - не используем сохраненную локацию
                    if (resetTimestamp && (now - resetTimestamp) < COOLDOWN_TIME) {
                        console.log('📍 Cooldown active, clearing location after logout');
                        isUpdatingFromStorage.current = true;
                        setStateInternal(null);
                        setCityInternal(null);
                        isUpdatingFromStorage.current = false;
                    } else if (parsed.state || parsed.city) {
                        console.log('📍 Using stored location after logout:', { state: parsed.state, city: parsed.city });
                        isUpdatingFromStorage.current = true;
                        setStateInternal(parsed.state || null);
                        setCityInternal(parsed.city || null);
                        isUpdatingFromStorage.current = false;
                    }
                } else {
                    // Нет сохраненной локации - очищаем
                    console.log('📍 No stored location, clearing after logout');
                    isUpdatingFromStorage.current = true;
                    setStateInternal(null);
                    setCityInternal(null);
                    isUpdatingFromStorage.current = false;
                }
            }
        };

        handleUserChange().catch((e) => {
            console.warn('Error handling user change:', e);
        });
    }, [userState, userCity]); // Обновляем при изменении пользователя (логин/логаут/обновление профиля)

    // 3. Загрузка городов при изменении штата
    useEffect(() => {
        if (!state || isInitializing.current) {
            setAvailableCities([]);
            return;
        }

        let mounted = true;

        const loadCities = async () => {
            try {
                const cities = await getCities(state, { limit: 200 });
                if (mounted) {
                    setAvailableCities(cities);

                    // Валидация: если текущий город не входит в список городов нового штата - очищаем его
                    if (city && !cities.some(c => c.name === city || c.id === city)) {
                        setCityInternal(null);
                    }
                }
            } catch (err) {
                console.error('Error loading cities:', err);
                if (mounted) {
                    setAvailableCities([]);
                }
            }
        };

        loadCities();

        return () => {
            mounted = false;
        };
    }, [state]); // Загружаем города при изменении штата

    // 4. Сохранение состояния в AsyncStorage при изменении
    useEffect(() => {
        if (isInitializing.current || isUpdatingFromStorage.current) {
            return;
        }

        const saveLocation = async () => {
            try {
                const data = {
                    state,
                    city,
                    updatedAt: Date.now(),
                };
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));

                // Очищаем время сброса, если локация установлена
                if (state || city) {
                    await AsyncStorage.removeItem(`${STORAGE_KEY}-reset-time`);
                }
            } catch (e) {
                console.warn('Error saving location to AsyncStorage:', e);
            }
        };

        saveLocation();
    }, [state, city]); // Сохраняем при каждом изменении

    // 5. Установка штата
    const setState = useCallback((stateId: string | null) => {
        if (isUpdatingFromStorage.current) {
            return;
        }

        setStateInternal(stateId);

        // При смене штата очищаем город
        if (stateId !== state) {
            setCityInternal(null);
        }

        // Сохраняем время сброса, если очистили штат
        if (!stateId) {
            AsyncStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString()).catch(() => {});
        }
    }, [state]);

    // 6. Установка города
    const setCity = useCallback((cityName: string | null) => {
        if (isUpdatingFromStorage.current) {
            return;
        }

        setCityInternal(cityName);

        // Сохраняем время сброса, если очистили город
        if (!cityName) {
            AsyncStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString()).catch(() => {});
        }
    }, []);

    // 7. Установка локации (штат + город)
    const setLocation = useCallback((stateId: string | null, cityName: string | null) => {
        if (isUpdatingFromStorage.current) {
            return;
        }

        setStateInternal(stateId);
        setCityInternal(cityName);

        // Сохраняем время сброса, если очистили локацию
        if (!stateId && !cityName) {
            AsyncStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString()).catch(() => {});
        }
    }, []);

    // 8. Сброс локации
    const reset = useCallback(async () => {
        if (isUpdatingFromStorage.current) {
            return;
        }

        setStateInternal(userState);
        setCityInternal(userCity);

        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            await AsyncStorage.setItem(`${STORAGE_KEY}-reset-time`, Date.now().toString());
        } catch (e) {
            console.warn('Error resetting location:', e);
        }
    }, [userState, userCity]);

    // Вспомогательные функции
    const getStateName = useCallback((stateId: string): string => {
        return getStateNameUtil(stateId, availableStates);
    }, [availableStates]);

    const getCityName = useCallback((cityName: string): string => {
        return cityName;
    }, []);

    // Валидация локации (синхронная проверка)
    const isValidLocation = useCallback((stateId: string, cityName?: string): boolean => {
        // Проверяем локально
        const stateExists = availableStates.some(s => s.id === stateId || s.name === stateId);
        if (!stateExists) return false;

        if (cityName) {
            const cities = availableCities.filter(c => c.stateId === stateId);
            return cities.some(c => c.name === cityName || c.id === cityName);
        }

        return true;
    }, [availableStates, availableCities]);

    // Значение контекста
    const contextValue: LocationContextValue = useMemo(
        () => ({
            state,
            city,
            availableStates,
            availableCities,
            setState,
            setCity,
            setLocation,
            reset,
            getStateName,
            getCityName,
            isValidLocation,
            isLoading,
            error,
        }),
        [
            state,
            city,
            availableStates,
            availableCities,
            setState,
            setCity,
            setLocation,
            reset,
            getStateName,
            getCityName,
            isValidLocation,
            isLoading,
            error,
        ]
    );

    return (
        <LocationContext.Provider value={contextValue}>
            {children}
        </LocationContext.Provider>
    );
}


