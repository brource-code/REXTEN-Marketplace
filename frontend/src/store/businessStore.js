import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store для управления текущим бизнесом (multi-tenant)
 * Каждый владелец бизнеса видит только свой бизнес
 * Суперадмин может переключаться между бизнесами
 */
const useBusinessStore = create(
    persist(
        (set, get) => ({
            // Текущий бизнес
            currentBusiness: null,
            
            // ID текущего бизнеса (для multi-tenant изоляции)
            businessId: null,
            
            // Является ли текущий пользователь владельцем текущего бизнеса
            isOwner: false,
            
            // Права пользователя в текущем бизнесе
            permissions: [],
            
            // Список бизнесов пользователя (если он владеет несколькими)
            businesses: [],
            
            // Настройки бизнеса
            settings: {
                name: null,
                description: null,
                category: null,
                address: null,
                city: null,
                state: null,
                timezone: 'America/Los_Angeles', // Таймзона бизнеса по умолчанию
                zipCode: null,
                phone: null,
                email: null,
                website: null,
                logo: null,
                coverImage: null,
            },
            
            // Статистика бизнеса (кэшируется)
            stats: {
                totalBookings: 0,
                totalRevenue: 0,
                activeClients: 0,
                upcomingBookings: 0,
            },
            
            // Действия
            setBusiness: (businessData, isOwner = false, permissions = []) => {
                set({
                    currentBusiness: businessData,
                    businessId: businessData?.id || null,
                    isOwner: isOwner,
                    permissions: isOwner ? ['all'] : (permissions || []),
                    settings: {
                        name: businessData?.name || null,
                        description: businessData?.description || null,
                        category: businessData?.category || null,
                        address: businessData?.address || null,
                        city: businessData?.city || null,
                        state: businessData?.state || null,
                        timezone: businessData?.timezone || 'America/Los_Angeles',
                        zipCode: businessData?.zipCode || null,
                        phone: businessData?.phone || null,
                        email: businessData?.email || null,
                        website: businessData?.website || null,
                        logo: businessData?.logo || null,
                        coverImage: businessData?.coverImage || null,
                    },
                })
            },
            
            setPermissions: (permissions) => {
                set({ permissions: permissions || [] })
            },
            
            setIsOwner: (isOwner) => {
                set({ isOwner })
            },
            
            setBusinesses: (businessesList) => {
                set({ businesses: businessesList })
            },
            
            switchBusiness: (businessId) => {
                const businesses = get().businesses
                const business = businesses.find((b) => b.id === businessId)
                
                if (business) {
                    get().setBusiness(business)
                }
            },
            
            updateSettings: (settingsData) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ...settingsData,
                    },
                }))
            },
            
            setStats: (statsData) => {
                set({ stats: statsData })
            },
            
            clearBusiness: () => {
                set({
                    currentBusiness: null,
                    businessId: null,
                    isOwner: false,
                    permissions: [],
                    businesses: [],
                    settings: {
                        name: null,
                        description: null,
                        category: null,
                        address: null,
                        city: null,
                        state: null,
                        timezone: 'America/Los_Angeles',
                        zipCode: null,
                        phone: null,
                        email: null,
                        website: null,
                        logo: null,
                        coverImage: null,
                    },
                    stats: {
                        totalBookings: 0,
                        totalRevenue: 0,
                        activeClients: 0,
                        upcomingBookings: 0,
                    },
                })
            },
        }),
        {
            name: 'business-storage',
            partialize: (state) => ({
                // Сохраняем ID текущего бизнеса и права
                businessId: state.businessId,
                isOwner: state.isOwner,
                permissions: state.permissions,
            }),
        }
    )
)

export default useBusinessStore

