// API слой для marketplace
// Адаптировано из веб-версии для React Native
// Использует axios вместо fetch и EXPO_PUBLIC_API_BASE_URL

import axios from 'axios';
import { API_BASE_URL } from './config';
import { Service, ServiceProfile, Category, State, ServiceItem, ScheduleDay, TimeSlot, Review, TeamMember, PortfolioItem } from '../types/marketplace';
import { mockCategories, mockStates, mockServices } from '../mocks/services';

// Создаем axios инстанс для API
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Интерфейс для фильтров услуг
export interface ServicesFilters {
  search?: string;
  category?: string;
  state?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  tags?: string[];
}

// Получить список категорий
export async function getCategories(): Promise<Category[]> {
  try {
    const response = await apiClient.get<Category[]>('/marketplace/categories');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    console.warn('⚠️ Using mock categories as fallback. Total:', mockCategories.length);
    return mockCategories;
  }
}

// Получить список штатов
export async function getStates(): Promise<State[]> {
  try {
    const response = await apiClient.get<State[]>('/marketplace/states');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching states:', error);
    console.warn('⚠️ Using mock states as fallback. Total:', mockStates.length);
    return mockStates;
  }
}

// Получить услугу по slug
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  try {
    const response = await apiClient.get<Service>(`/marketplace/services/${slug}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching service by slug:', error);
    return null;
  }
}

// Получить полный профиль услуги
export async function getServiceProfile(slug: string, forceRefresh: boolean = false): Promise<ServiceProfile | null> {
  try {
    const url = `/marketplace/services/${slug}/profile${forceRefresh ? '?t=' + Date.now() : ''}`;
    const response = await apiClient.get<ServiceProfile>(url, {
      // Для forceRefresh отключаем кэш
      ...(forceRefresh && { headers: { 'Cache-Control': 'no-cache' } }),
    });
    
    // Преобразуем данные в формат ServiceProfile, если нужно
    const data = response.data;
    return {
      service: data.service,
      servicesList: data.servicesList || [],
      schedule: data.schedule || { days: [], slots: {} },
      reviews: data.reviews || [],
      team: data.team || [],
      portfolio: data.portfolio || [],
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching service profile:', error);
    console.warn('⚠️ Using mock service profile as fallback for slug:', slug);
    
    // Ищем услугу в моках по slug (может быть id или slug из path)
    const mockService = mockServices.find(s => {
      const serviceSlug = s.path?.replace('/marketplace/', '') || s.id;
      return s.id === slug || serviceSlug === slug || s.path === `/marketplace/${slug}`;
    });
    
    if (!mockService) {
      console.warn('⚠️ Mock service not found for slug:', slug);
      return null;
    }
    
    // Создаем моковый профиль
    const mockProfile: ServiceProfile = {
      service: mockService,
      servicesList: [
        {
          id: 1,
          name: mockService.name,
          category: mockService.category,
          description: mockService.description,
          price: mockService.priceLabel,
          duration: '60',
        },
      ],
      schedule: {
        days: [],
        slots: {},
      },
      reviews: [
        {
          id: 1,
          name: 'Анна К.',
          rating: mockService.rating,
          text: 'Отличный сервис! Очень рекомендую.',
          date: new Date().toISOString(),
          userName: 'Анна К.',
        },
        {
          id: 2,
          name: 'Михаил П.',
          rating: 5,
          text: 'Профессиональный подход, качественный результат.',
          date: new Date().toISOString(),
          userName: 'Михаил П.',
        },
      ],
      team: [
        {
          id: 1,
          name: 'Мастер',
          role: 'Специалист',
          description: 'Опытный профессионал с многолетним стажем',
          rating: mockService.rating,
          experience: '5+ лет',
          languages: 'RU, EN',
        },
      ],
      portfolio: [
        {
          id: 1,
          title: 'Пример работы',
          tag: 'Работа',
          imageUrl: mockService.imageUrl,
        },
      ],
    };
    
    console.log('✅ Mock service profile created for:', mockService.name);
    return mockProfile;
  }
}

// Получить список услуг с фильтрами
export async function getFilteredServices(filters: ServicesFilters = {}): Promise<Service[]> {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.state) params.append('state', filters.state);
    if (filters.city) params.append('city', filters.city);
    if (filters.priceMin !== undefined) params.append('priceMin', filters.priceMin.toString());
    if (filters.priceMax !== undefined) params.append('priceMax', filters.priceMax.toString());
    if (filters.ratingMin !== undefined) params.append('ratingMin', filters.ratingMin.toString());
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags[]', tag));
    }

    const url = `/marketplace/services?${params.toString()}`;
    console.log('🌐 API Request URL:', url);
    console.log('🌐 API Request filters:', filters);
    const response = await apiClient.get<Service[]>(url);
    console.log('🌐 API Response:', response.data.length, 'services');
    
    if (filters.state) {
      console.log('🌐 Filtering by state:', filters.state);
      if (response.data.length > 0) {
        const statesInResponse = [...new Set(response.data.map(s => s.state))];
        console.log('🌐 Unique states in response:', statesInResponse);
        console.log('🌐 Sample service states:', response.data.slice(0, 5).map(s => ({ 
          name: s.name, 
          state: s.state,
          city: s.city 
        })));
        
        // Проверяем, что все услуги действительно отфильтрованы
        const mismatched = response.data.filter(s => {
          if (!s.state) return true;
          const stateMatch = s.state === filters.state || 
                           s.state.toLowerCase() === filters.state.toLowerCase();
          if (!stateMatch) {
            // Проверяем через US_STATES
            const stateById = US_STATES.find(st => st.id === filters.state);
            if (stateById && s.state === stateById.name) return false;
            const serviceStateById = US_STATES.find(st => st.id === s.state);
            if (serviceStateById && filters.state === serviceStateById.name) return false;
            return true;
          }
          return false;
        });
        
        if (mismatched.length > 0) {
          console.warn('⚠️ API returned services with wrong states:', mismatched.length, 'out of', response.data.length);
          console.warn('⚠️ Mismatched services:', mismatched.slice(0, 3).map(s => ({ name: s.name, state: s.state })));
        }
      } else {
        console.warn('⚠️ No services returned with state filter:', filters.state);
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching filtered services:', error);
    console.warn('⚠️ Using mock services as fallback. Total mocks:', mockServices.length);
    
    // Применяем фильтры к мокам
    let filtered = [...mockServices];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.category.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(s => s.group === filters.category);
    }
    
    if (filters.state) {
      // Фильтрация по штату: может быть ID (CA) или название (California)
      filtered = filtered.filter(s => {
        if (!s.state) return false;
        
        // Прямое совпадение
        if (s.state === filters.state) return true;
        
        // Сравнение без учета регистра
        if (s.state.toLowerCase() === filters.state.toLowerCase()) return true;
        
        // Проверяем, если filters.state это ID, а s.state это название
        const stateById = US_STATES.find(st => st.id === filters.state);
        if (stateById && s.state === stateById.name) return true;
        
        // Проверяем, если s.state это ID, а filters.state это название
        const serviceStateById = US_STATES.find(st => st.id === s.state);
        if (serviceStateById && filters.state === serviceStateById.name) return true;
        
        // Проверяем, если filters.state это название, а s.state это ID
        const stateByName = US_STATES.find(st => st.name === filters.state);
        if (stateByName && s.state === stateByName.id) return true;
        
        // Проверяем, если s.state это название, а filters.state это ID
        const serviceStateByName = US_STATES.find(st => st.name === s.state);
        if (serviceStateByName && filters.state === serviceStateByName.id) return true;
        
        return false;
      });
      console.log('🔍 Filtered by state:', filters.state, 'result:', filtered.length, 'out of', mockServices.length);
    }
    
    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(s => s.priceValue >= filters.priceMin!);
    }
    
    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(s => s.priceValue <= filters.priceMax!);
    }
    
    if (filters.ratingMin !== undefined) {
      filtered = filtered.filter(s => s.rating >= filters.ratingMin!);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(s => 
        filters.tags!.some(tag => s.tags.includes(tag))
      );
    }
    
    console.log('✅ Mock services filtered:', filtered.length, 'out of', mockServices.length);
    return filtered;
  }
}

// Получить рекомендуемые услуги (featured)
export async function getFeaturedServices(limit: number = 3): Promise<Service[]> {
  try {
    const response = await apiClient.get<Service[]>(`/advertisements/featured?limit=${limit}&placement=services`);
    const data = response.data;
    
    // Преобразуем данные, если нужно
    if (Array.isArray(data)) {
      return data.map((item: any) => {
        const service: Service = {
          ...item,
          // Убираем businessName, если он есть, так как его нет в типе Service
        };
        return service;
      });
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching featured services:', error);
    const featured = mockServices.filter(s => s.isFeatured).slice(0, limit);
    console.warn('⚠️ Using mock featured services as fallback. Found:', featured.length);
    return featured;
  }
}

