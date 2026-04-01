// API слой для клиентской части (заказы, бронирования, избранное и т.д.)
import { apiClient } from './auth';

export interface ClientOrder {
  id: number;
  bookingId?: number;
  serviceName: string;
  businessName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  createdAt: string;
}

export interface ClientBooking {
  id: number;
  serviceName: string;
  businessName: string;
  businessSlug: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  specialist?: string;
  notes?: string;
}

export interface FavoriteService {
  id: string;
  serviceId?: string | number;
  name: string;
  serviceName?: string;
  category: string;
  imageUrl?: string;
  image?: string;
  priceLabel: string;
  rating: number;
  reviewsCount: number;
  path?: string;
  businessName?: string;
  businessSlug?: string;
  city?: string;
  state?: string;
  description?: string;
}

export interface FavoriteAdvertisement {
  id: string;
  advertisementId?: string | number;
  title?: string;
  name?: string;
  advertisementName?: string;
  category: string;
  imageUrl?: string;
  image?: string;
  priceLabel?: string;
  rating?: number;
  reviewsCount?: number;
  path?: string;
  link?: string;
  slug?: string;
  advertisementSlug?: string;
  businessName?: string;
  businessSlug?: string;
  city?: string;
  state?: string;
  description?: string;
}

export interface FavoriteBusiness {
  id: string;
  businessId?: string | number;
  businessName: string;
  category: string;
  image?: string;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  businessSlug?: string;
}

/**
 * Получить заказы клиента
 */
export async function getClientOrders(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ClientOrder[]> {
  try {
    const response = await apiClient.get<{ data?: ClientOrder[] } | ClientOrder[]>('/client/orders', {
      params: filters,
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error) {
    console.error('Error fetching client orders:', error);
    return [];
  }
}

/**
 * Получить бронирования клиента
 */
export async function getClientBookings(filters?: {
  status?: string;
  upcoming?: boolean;
}): Promise<ClientBooking[]> {
  try {
    const response = await apiClient.get<{ data?: ClientBooking[] } | ClientBooking[]>('/client/bookings', {
      params: filters,
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error: any) {
    console.error('Error fetching client bookings:', error?.response?.data || error?.message);
    return [];
  }
}

/**
 * Отменить бронирование
 */
export async function cancelBooking(bookingId: number): Promise<void> {
  try {
    await apiClient.post(`/client/bookings/${bookingId}/cancel`);
  } catch (error) {
    console.error('Error canceling booking:', error);
    throw error;
  }
}

/**
 * Получить избранные услуги
 */
export async function getFavoriteServices(): Promise<FavoriteService[]> {
  try {
    const response = await apiClient.get<{ data?: FavoriteService[] } | FavoriteService[]>('/client/favorites/services');
    const data = response.data;
    const services = Array.isArray(data) ? data : (data as any)?.data || [];
    // Дедупликация по serviceId или id
    const map = new Map();
    services.forEach((item: FavoriteService) => {
      const key = item.serviceId || item.id;
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  } catch (error: any) {
    // Не логируем 401 (Unauthorized) как ошибку - это нормально для неавторизованных пользователей
    if (error?.response?.status === 401) {
      return [];
    }
    // Логируем только реальные ошибки (не 401)
    if (error?.response?.status !== 401) {
      console.error('Error fetching favorite services:', error?.response?.data || error?.message);
    }
    return [];
  }
}

/**
 * Получить избранные объявления
 */
export async function getFavoriteAdvertisements(): Promise<FavoriteAdvertisement[]> {
  try {
    const response = await apiClient.get<{ data?: FavoriteAdvertisement[] } | FavoriteAdvertisement[]>('/client/favorites/advertisements');
    const data = response.data;
    const advertisements = Array.isArray(data) ? data : (data as any)?.data || [];
    // Дедупликация по advertisementId или id
    const map = new Map();
    advertisements.forEach((item: FavoriteAdvertisement) => {
      const key = item.advertisementId || item.id;
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  } catch (error: any) {
    // Не логируем 401 (Unauthorized) как ошибку - это нормально для неавторизованных пользователей
    if (error?.response?.status === 401) {
      return [];
    }
    // Логируем только реальные ошибки (не 401)
    if (error?.response?.status !== 401) {
      console.error('Error fetching favorite advertisements:', error?.response?.data || error?.message || error);
    }
    return [];
  }
}

/**
 * Получить избранные бизнесы
 */
export async function getFavoriteBusinesses(): Promise<FavoriteBusiness[]> {
  try {
    const response = await apiClient.get<{ data?: FavoriteBusiness[] } | FavoriteBusiness[]>('/client/favorites/businesses');
    const data = response.data;
    const businesses = Array.isArray(data) ? data : (data as any)?.data || [];
    // Дедупликация по businessId или id
    const map = new Map();
    businesses.forEach((item: FavoriteBusiness) => {
      const key = item.businessId || item.id;
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  } catch (error: any) {
    // Не логируем 401 (Unauthorized) как ошибку - это нормально для неавторизованных пользователей
    if (error?.response?.status === 401) {
      return [];
    }
    // Логируем только реальные ошибки (не 401)
    if (error?.response?.status !== 401) {
      console.error('Error fetching favorite businesses:', error?.response?.data || error?.message || error);
    }
    return [];
  }
}

/**
 * Добавить в избранное (универсальная функция)
 */
export async function addToFavorites(type: 'service' | 'business' | 'advertisement', id: number | string): Promise<void> {
  try {
    await apiClient.post(`/client/favorites/${type}/${id}`);
  } catch (error: any) {
    console.error('Error adding to favorites:', { type, id, error: error?.response?.data });
    throw error;
  }
}

/**
 * Удалить из избранного (универсальная функция)
 */
export async function removeFromFavorites(type: 'service' | 'business' | 'advertisement', id: number | string): Promise<void> {
  try {
    await apiClient.delete(`/client/favorites/${type}/${id}`);
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
}

/**
 * Получить профиль клиента
 */
export interface ClientProfile {
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
}

export async function getClientProfile(): Promise<ClientProfile | null> {
  try {
    const response = await apiClient.get<{ data?: ClientProfile } | ClientProfile>('/client/profile');
    const data = response.data;
    return (data as any)?.data || data || null;
  } catch (error) {
    console.error('Error fetching client profile:', error);
    return null;
  }
}

/**
 * Обновить профиль клиента
 */
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export async function updateClientProfile(data: UpdateProfileData): Promise<ClientProfile | null> {
  try {
    const response = await apiClient.put<{ data?: ClientProfile } | ClientProfile>('/client/profile', data);
    const responseData = response.data;
    return (responseData as any)?.data || responseData || null;
  } catch (error) {
    console.error('Error updating client profile:', error);
    throw error;
  }
}

// ========== Reviews ==========
export interface ClientReview {
  id: number;
  orderId?: number;
  bookingId?: number;
  businessName: string;
  businessSlug: string;
  serviceName: string;
  rating: number;
  comment: string;
  createdAt: string;
  businessAvatar?: string;
  response?: string;
  responseAt?: string;
  specialistName?: string;
}

export interface PendingReview {
  id: number;
  orderId: number;
  bookingId: number;
  serviceName: string;
  businessName: string;
  businessSlug: string;
  date: string;
  time: string;
  price: number;
  completedAt: string;
}

export interface CreateReviewData {
  orderId?: number;
  bookingId?: number;
  rating: number;
  comment: string;
}

export async function getClientReviews(): Promise<ClientReview[]> {
  try {
    const response = await apiClient.get<{ data?: ClientReview[] } | ClientReview[]>('/client/reviews');
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error: any) {
    console.error('Error fetching client reviews:', error?.response?.data || error?.message);
    return [];
  }
}

export async function getPendingReviews(): Promise<PendingReview[]> {
  try {
    const response = await apiClient.get<{ data?: PendingReview[] } | PendingReview[]>('/client/reviews/pending');
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    return [];
  }
}

export async function createReview(data: CreateReviewData): Promise<ClientReview> {
  try {
    const response = await apiClient.post<{ data?: ClientReview } | ClientReview>('/client/reviews', data);
    const responseData = response.data;
    return (responseData as any)?.data || responseData;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}

// ========== Discounts and Bonuses ==========
export interface Discount {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  businessId: number;
  businessName: string;
  businessSlug: string;
  businessImage?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  isUsed: boolean;
  usedAt?: string;
}

export interface Bonus {
  id: number;
  title: string;
  description: string;
  bonusType: 'points' | 'cashback' | 'service';
  bonusValue: number;
  businessId: number;
  businessName: string;
  businessSlug: string;
  businessImage?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  isUsed: boolean;
  usedAt?: string;
}

export async function getClientDiscounts(): Promise<Discount[]> {
  try {
    const response = await apiClient.get<{ data?: Discount[] } | Discount[]>('/client/discounts');
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error) {
    console.warn('Discounts endpoint not available:', error);
    return [];
  }
}

export async function getClientBonuses(): Promise<Bonus[]> {
  try {
    const response = await apiClient.get<{ data?: Bonus[] } | Bonus[]>('/client/bonuses');
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error) {
    console.warn('Bonuses endpoint not available:', error);
    return [];
  }
}

export async function applyDiscount(discountId: number): Promise<void> {
  try {
    await apiClient.post(`/client/discounts/${discountId}/apply`);
  } catch (error) {
    console.warn('Apply discount endpoint not available:', error);
    throw error;
  }
}

export async function applyBonus(bonusId: number): Promise<void> {
  try {
    await apiClient.post(`/client/bonuses/${bonusId}/apply`);
  } catch (error) {
    console.warn('Apply bonus endpoint not available:', error);
    throw error;
  }
}

// ========== Notifications ==========
export interface ClientNotification {
  id: number;
  type: 'booking' | 'order' | 'review' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  telegram: boolean;
  push: boolean;
}

export async function getClientNotifications(): Promise<ClientNotification[]> {
  try {
    const response = await apiClient.get<{ data?: ClientNotification[] } | ClientNotification[]>('/client/notifications');
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await apiClient.post(`/client/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await apiClient.post('/client/notifications/read-all');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const response = await apiClient.get<{ data?: NotificationSettings } | NotificationSettings>('/client/notifications/settings');
    const data = response.data;
    return (data as any)?.data || data || {
      email: true,
      sms: false,
      telegram: false,
      push: true,
    };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return {
        email: true,
        sms: false,
        telegram: false,
        push: true,
      };
    }
    console.error('Error fetching notification settings:', error);
    return {
      email: true,
      sms: false,
      telegram: false,
      push: true,
    };
  }
}

export async function updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
  try {
    const response = await apiClient.put<{ data?: NotificationSettings } | NotificationSettings>('/client/notifications/settings', data);
    const responseData = response.data;
    return (responseData as any)?.data || responseData;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

