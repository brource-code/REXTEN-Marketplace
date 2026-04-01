import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store для управления данными текущего пользователя
 * Хранит полную информацию о пользователе (профиль, настройки, предпочтения)
 */
const useUserStore = create(
    persist(
        (set, get) => ({
            // Данные пользователя
            user: null,
            
            // Профиль пользователя
            profile: {
                firstName: null,
                lastName: null,
                email: null,
                phone: null,
                avatar: null,
                address: null,
                city: null,
                state: null,
                zipCode: null,
            },
            
            // Настройки пользователя
            preferences: {
                language: 'ru',
                notifications: {
                    email: true,
                    sms: false,
                    push: true,
                },
                theme: 'light', // 'light' | 'dark' | 'auto'
            },
            
            // Действия
            setUser: (userData) => {
                set({
                    user: userData,
                    profile: {
                        firstName: userData?.firstName || null,
                        lastName: userData?.lastName || null,
                        email: userData?.email || null,
                        phone: userData?.phone || null,
                        avatar: userData?.avatar || null,
                        address: userData?.address || null,
                        city: userData?.city || null,
                        state: userData?.state || null,
                        zipCode: userData?.zipCode || null,
                    },
                })
            },
            
            updateProfile: (profileData) => {
                set((state) => ({
                    profile: {
                        ...state.profile,
                        ...profileData,
                    },
                }))
            },
            
            updatePreferences: (preferencesData) => {
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        ...preferencesData,
                    },
                }))
            },
            
            clearUser: () => {
                set({
                    user: null,
                    profile: {
                        firstName: null,
                        lastName: null,
                        email: null,
                        phone: null,
                        avatar: null,
                        address: null,
                        city: null,
                        state: null,
                        zipCode: null,
                    },
                })
            },
        }),
        {
            name: 'user-storage',
            partialize: (state) => ({
                // Сохраняем пользователя и предпочтения
                user: state.user,
                preferences: state.preferences,
            }),
        }
    )
)

export default useUserStore

