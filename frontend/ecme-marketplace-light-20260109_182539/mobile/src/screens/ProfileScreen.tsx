import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ServiceCard } from '../components/ServiceCard';
import { useAuth } from '../contexts/AuthContext';
import { 
  getClientBookings, 
  getFavoriteServices, 
  getFavoriteAdvertisements,
  getFavoriteBusinesses,
  getClientReviews,
  getPendingReviews,
  createReview,
  getClientDiscounts,
  getClientBonuses,
  getNotificationSettings,
  updateNotificationSettings,
  removeFromFavorites,
  ClientBooking,
  ClientReview,
  PendingReview,
  CreateReviewData,
  Discount,
  Bonus,
  NotificationSettings,
  FavoriteService,
  FavoriteAdvertisement,
  FavoriteBusiness
} from '../api/client';
import { logout } from '../api/auth';
import { Service } from '../types/marketplace';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#e5e7eb',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 6,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 24,
    paddingVertical: 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabButtonActive: {
    borderBottomColor: '#2563eb',
  },
  tabButtonInactive: {
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#2563eb',
  },
  tabButtonTextInactive: {
    color: '#6b7280',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  guestText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
});

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, logout: authLogout, refreshUser } = useAuth();
  
  
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'favorites' | 'reviews' | 'discounts' | 'notifications'>('bookings');
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [favoriteServices, setFavoriteServices] = useState<any[]>([]);
  const [favoriteAdvertisements, setFavoriteAdvertisements] = useState<any[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<any[]>([]);
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    sms: false,
    telegram: false,
    push: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const isInitialLoadRef = useRef(true);

  // Функция для загрузки данных активного таба
  const loadDataForActiveTab = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'bookings') {
        const bookingsData = await getClientBookings({ upcoming: true });
        setBookings(bookingsData);
      } else if (activeTab === 'favorites') {
        const [services, advertisements, businesses] = await Promise.all([
          getFavoriteServices(),
          getFavoriteAdvertisements(),
          getFavoriteBusinesses(),
        ]);
        setFavoriteServices(services);
        setFavoriteAdvertisements(advertisements);
        setFavoriteBusinesses(businesses);
      } else if (activeTab === 'reviews') {
        const [completedReviews, pending] = await Promise.all([
          getClientReviews(),
          getPendingReviews(),
        ]);
        setReviews(completedReviews);
        setPendingReviews(pending);
      } else if (activeTab === 'discounts') {
        const [discountsData, bonusesData] = await Promise.all([
          getClientDiscounts(),
          getClientBonuses(),
        ]);
        setDiscounts(discountsData);
        setBonuses(bonusesData);
      } else if (activeTab === 'notifications') {
        const settings = await getNotificationSettings();
        setNotificationSettings(settings);
      }
    } catch (error: any) {
      console.error('Error loading data for tab:', activeTab, error?.response?.data || error?.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Загружаем начальные данные при монтировании и при изменении авторизации
  useEffect(() => {
    if (!isAuthenticated) {
      // Сбрасываем данные при выходе
      isInitialLoadRef.current = true;
      setBookings([]);
      setFavoriteServices([]);
      setFavoriteAdvertisements([]);
      setFavoriteBusinesses([]);
      setReviews([]);
      setPendingReviews([]);
      setDiscounts([]);
      setBonuses([]);
      return;
    }

    // Загружаем начальные данные
    const loadData = async () => {
      isInitialLoadRef.current = true;
      try {
        // Загружаем избранное для счетчика
        const [services, advertisements, businesses] = await Promise.all([
          getFavoriteServices(),
          getFavoriteAdvertisements(),
          getFavoriteBusinesses(),
        ]);
        setFavoriteServices(services);
        setFavoriteAdvertisements(advertisements);
        setFavoriteBusinesses(businesses);

        // Загружаем бронирования для счетчика
        const bookingsData = await getClientBookings({ upcoming: true });
        setBookings(bookingsData);
      } catch (error: any) {
        console.error('Error loading initial data:', error?.response?.data || error?.message);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Загружаем данные для активного таба при его изменении
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Небольшая задержка для первой загрузки, чтобы начальные данные успели загрузиться
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      // Для bookings данные уже загружены в первом useEffect, для остальных загружаем
      if (activeTab !== 'bookings') {
        loadDataForActiveTab();
      }
      return;
    }

    loadDataForActiveTab();
  }, [activeTab, isAuthenticated, loadDataForActiveTab]);

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await authLogout();
          },
        },
      ]
    );
  };

  const getInitials = (name?: string, firstName?: string, lastName?: string): string => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return 'Г';
  };

  const fullName = user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || 'Гость');
  const initials = getInitials(user?.name, user?.firstName, user?.lastName);

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.scrollContent}>
              <View style={styles.guestContainer}>
                <Ionicons name="person-outline" size={64} color="#9ca3af" />
                <Text style={styles.guestText}>
                  Войдите в аккаунт, чтобы получить доступ к профилю, заказам и избранному
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login' as any)}
                  style={[styles.logoutButton, { backgroundColor: '#2563eb' }]}
                >
                  <Text style={styles.logoutButtonText}>Войти / Зарегистрироваться</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            {/* Header с профилем */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    {user?.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{initials}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.userName}>{fullName}</Text>
                  <Text style={styles.userEmail}>{user?.email || ''}</Text>
                  {(user?.city || user?.state) && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color="#6b7280" />
                      <Text style={styles.locationText}>
                        {user.city && user.state ? `${user.city}, ${user.state}` : user.city || user.state}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Статистика */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Бронирований</Text>
                  <Text style={styles.statValue}>{bookings.length}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Избранное</Text>
                  <Text style={styles.statValue}>
                    {favoriteServices.length + favoriteAdvertisements.length + favoriteBusinesses.length}
                  </Text>
                </View>
              </View>

              {/* Кнопки действий */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('Bookings' as any)}
                >
                  <Ionicons name="calendar-outline" size={18} color="#111827" />
                  <Text style={styles.actionButtonText}>Бронирования</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('ProfileSettings' as any)}
                >
                  <Ionicons name="settings-outline" size={18} color="#111827" />
                  <Text style={styles.actionButtonText}>Настройки</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Табы */}
            <View style={styles.tabsContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
              <TouchableOpacity
                onPress={() => setActiveTab('bookings')}
                style={[
                  styles.tabButton,
                  activeTab === 'bookings' ? styles.tabButtonActive : styles.tabButtonInactive,
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'bookings' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Брони ({bookings.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('reviews')}
                style={[
                  styles.tabButton,
                  activeTab === 'reviews' ? styles.tabButtonActive : styles.tabButtonInactive,
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'reviews' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Отзывы{pendingReviews.length > 0 ? ` (${pendingReviews.length})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('favorites')}
                style={[
                  styles.tabButton,
                  activeTab === 'favorites' ? styles.tabButtonActive : styles.tabButtonInactive,
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'favorites' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Избранное ({favoriteServices.length + favoriteAdvertisements.length + favoriteBusinesses.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('discounts')}
                style={[
                  styles.tabButton,
                  activeTab === 'discounts' ? styles.tabButtonActive : styles.tabButtonInactive,
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'discounts' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Скидки
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('notifications')}
                style={[
                  styles.tabButton,
                  activeTab === 'notifications' ? styles.tabButtonActive : styles.tabButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'notifications' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Уведомления
                </Text>
              </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Контент табов */}
            <View style={styles.section}>
              {activeTab === 'bookings' && (
                <View>
                  {bookings.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                      <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                        У вас пока нет бронирований
                      </Text>
                    </View>
                  ) : (
                    bookings.map((booking) => (
                      <View key={booking.id} style={styles.menuItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                            {booking.serviceName}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                            {booking.businessName}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            {new Date(booking.date).toLocaleDateString('ru-RU')} • {booking.time}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                          ${booking.price}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'favorites' && (
                <View>
                  {favoriteServices.length === 0 && favoriteAdvertisements.length === 0 && favoriteBusinesses.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="heart-outline" size={48} color="#9ca3af" />
                      <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                        У вас пока нет избранных
                      </Text>
                      <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 12 }]}>
                        Добавляйте услуги, объявления и бизнесы в избранное
                      </Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ServicesHome' as any)}
                        style={{
                          backgroundColor: '#2563eb',
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          borderRadius: 8,
                          marginTop: 16,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                          Найти услуги
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      {/* Избранные сервисы */}
                      {favoriteServices.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                            Избранные сервисы
                          </Text>
                          {favoriteServices.map((item) => {
                            const service: Service = {
                              id: item.serviceId || item.id,
                              name: item.serviceName || item.name,
                              category: item.category,
                              city: item.city || '',
                              state: item.state || '',
                              location: '',
                              priceLabel: item.priceLabel,
                              priceValue: 0,
                              rating: item.rating,
                              reviewsCount: item.reviewsCount,
                              tags: [],
                              imageUrl: item.imageUrl || item.image,
                              group: '',
                              description: item.description,
                              path: item.path,
                            };
                            return (
                              <View key={item.id} style={{ marginBottom: 12 }}>
                                <ServiceCard
                                  service={service}
                                  variant="compact"
                                  onPress={() => {
                                    const slug = item.path?.replace('/marketplace/', '') || item.id;
                                    navigation.navigate('ServiceDetails' as any, { slug });
                                  }}
                                  onFavoriteChange={loadDataForActiveTab}
                                />
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Избранные объявления */}
                      {favoriteAdvertisements.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                            Избранные объявления
                          </Text>
                          {favoriteAdvertisements.map((item) => {
                            const service: Service = {
                              id: `ad_${item.advertisementId || item.id}`,
                              name: item.title || item.name || item.advertisementName || 'Объявление',
                              category: item.category,
                              city: item.city || '',
                              state: item.state || '',
                              location: '',
                              priceLabel: item.priceLabel || '',
                              priceValue: 0,
                              rating: item.rating || 0,
                              reviewsCount: item.reviewsCount || 0,
                              tags: [],
                              imageUrl: item.imageUrl || item.image,
                              group: '',
                              description: item.description,
                              path: item.path || item.link,
                            };
                            return (
                              <View key={item.id} style={{ marginBottom: 12 }}>
                                <ServiceCard
                                  service={service}
                                  variant="compact"
                                  onPress={() => {
                                    const slug = item.slug || item.advertisementSlug || item.path?.replace('/marketplace/', '') || item.id;
                                    navigation.navigate('ServiceDetails' as any, { slug });
                                  }}
                                  onFavoriteChange={loadDataForActiveTab}
                                />
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Избранные бизнесы */}
                      {favoriteBusinesses.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                            Избранные бизнесы
                          </Text>
                          {favoriteBusinesses.map((item) => {
                            const service: Service = {
                              id: `business_${item.businessId || item.id}`,
                              name: item.businessName,
                              category: item.category,
                              city: '',
                              state: '',
                              location: '',
                              priceLabel: '',
                              priceValue: 0,
                              rating: item.rating || 0,
                              reviewsCount: item.reviewsCount || 0,
                              tags: [],
                              imageUrl: item.imageUrl || item.image,
                              group: '',
                              description: '',
                              path: item.businessSlug ? `/marketplace/${item.businessSlug}` : '',
                            };
                            return (
                              <View key={item.id} style={{ marginBottom: 12 }}>
                                <ServiceCard
                                  service={service}
                                  variant="compact"
                                  onPress={() => {
                                    if (item.businessSlug) {
                                      navigation.navigate('ServiceDetails' as any, { slug: item.businessSlug });
                                    }
                                  }}
                                  onFavoriteChange={loadDataForActiveTab}
                                />
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'reviews' && (
                <View>
                  {pendingReviews.length === 0 && reviews.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="star-outline" size={48} color="#9ca3af" />
                      <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                        У вас пока нет отзывов
                      </Text>
                      <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 12 }]}>
                        После завершения бронирований здесь появятся запросы на отзывы
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {/* Ожидающие отзывы */}
                      {pendingReviews.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginRight: 8 }}>
                              Ожидающие отзывы
                            </Text>
                            <View style={{ backgroundColor: '#fbbf24', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>
                                {pendingReviews.length}
                              </Text>
                            </View>
                          </View>
                          {pendingReviews.map((review) => (
                            <View key={review.id} style={styles.menuItem}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                                  {review.serviceName}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                                  {review.businessName}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                  {new Date(review.date).toLocaleDateString('ru-RU')} • {review.time} • ${review.price}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#2563eb',
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                }}
                                onPress={() => {
                                  Alert.alert('Отзыв', 'Функция создания отзыва будет добавлена позже');
                                }}
                              >
                                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                                  Оставить отзыв
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Готовые отзывы */}
                      {reviews.length > 0 && (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginRight: 8 }}>
                              Мои отзывы
                            </Text>
                            {reviews.length > 0 && (
                              <View style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>
                                  {reviews.length}
                                </Text>
                              </View>
                            )}
                          </View>
                          {reviews.map((review) => (
                            <View key={review.id} style={styles.menuItem}>
                              {review.businessAvatar && (
                                <Image
                                  source={{ uri: review.businessAvatar }}
                                  style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
                                />
                              )}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
                                      {review.businessName}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                                      {review.serviceName}
                                    </Text>
                                    {review.specialistName && (
                                      <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                                        Исполнитель: {review.specialistName}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={{ flexDirection: 'row', gap: 2 }}>
                                    {[...Array(5)].map((_, i) => (
                                      <Ionicons
                                        key={i}
                                        name={i < review.rating ? 'star' : 'star-outline'}
                                        size={16}
                                        color={i < review.rating ? '#fbbf24' : '#d1d5db'}
                                      />
                                    ))}
                                  </View>
                                </View>
                                <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
                                  {review.comment}
                                </Text>
                                {review.response && (
                                  <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginTop: 8 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>
                                      Ответ от {review.businessName}:
                                    </Text>
                                    <Text style={{ fontSize: 14, color: '#374151' }}>
                                      {review.response}
                                    </Text>
                                  </View>
                                )}
                                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                                  {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'discounts' && (
                <View>
                  {discounts.length === 0 && bonuses.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="ticket-outline" size={48} color="#9ca3af" />
                      <Text style={[styles.emptyStateText, { marginTop: 16 }]}>
                        У вас пока нет доступных скидок и бонусов
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {/* Активные скидки и бонусы */}
                      {[...discounts.filter(d => d.isActive && !d.isUsed), ...bonuses.filter(b => b.isActive && !b.isUsed)].map((item) => {
                        const isDiscount = 'code' in item;
                        const isValid = new Date(item.validUntil) > new Date();
                        return (
                          <View key={`${isDiscount ? 'discount' : 'bonus'}-${item.id}`} style={styles.menuItem}>
                            {item.businessImage && (
                              <Image
                                source={{ uri: item.businessImage }}
                                style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
                              />
                            )}
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginRight: 8 }}>
                                  {item.title}
                                </Text>
                                <View style={{
                                  backgroundColor: isDiscount ? '#2563eb' : '#10b981',
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}>
                                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>
                                    {isDiscount
                                      ? item.discountType === 'percentage'
                                        ? `-${item.discountValue}%`
                                        : `-${item.discountValue}₽`
                                      : item.bonusType === 'points'
                                      ? `+${item.bonusValue} баллов`
                                      : item.bonusType === 'cashback'
                                      ? `${item.bonusValue}% кэшбэк`
                                      : `Бонус ${item.bonusValue}`}
                                  </Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                                {item.description}
                              </Text>
                              {isDiscount && item.code && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                  <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    backgroundColor: '#f3f4f6',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                                    marginRight: 8,
                                  }}>
                                    {item.code}
                                  </Text>
                                  {item.minPurchaseAmount && (
                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                      От {item.minPurchaseAmount}₽
                                    </Text>
                                  )}
                                </View>
                              )}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                  Действует до: {new Date(item.validUntil).toLocaleDateString('ru-RU')}
                                </Text>
                                {isValid && (
                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: '#2563eb',
                                      paddingHorizontal: 16,
                                      paddingVertical: 8,
                                      borderRadius: 8,
                                    }}
                                    onPress={() => {
                                      Alert.alert('Применить', 'Функция применения скидки/бонуса будет добавлена позже');
                                    }}
                                  >
                                    <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                                      {isDiscount ? 'Применить' : 'Получить'}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      {/* Использованные скидки и бонусы */}
                      {[...discounts.filter(d => d.isUsed), ...bonuses.filter(b => b.isUsed)].length > 0 && (
                        <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 12 }}>
                            Использованные
                          </Text>
                          {[...discounts.filter(d => d.isUsed), ...bonuses.filter(b => b.isUsed)].map((item) => {
                            const isDiscount = 'code' in item;
                            return (
                              <View key={`used-${isDiscount ? 'discount' : 'bonus'}-${item.id}`} style={[styles.menuItem, { opacity: 0.6 }]}>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginRight: 8 }}>
                                      {item.title}
                                    </Text>
                                    <View style={{
                                      backgroundColor: '#9ca3af',
                                      paddingHorizontal: 8,
                                      paddingVertical: 2,
                                      borderRadius: 4,
                                    }}>
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffffff' }}>
                                        {isDiscount
                                          ? item.discountType === 'percentage'
                                            ? `-${item.discountValue}%`
                                            : `-${item.discountValue}₽`
                                          : item.bonusType === 'points'
                                          ? `+${item.bonusValue} баллов`
                                          : item.bonusType === 'cashback'
                                          ? `${item.bonusValue}% кэшбэк`
                                          : `Бонус ${item.bonusValue}`}
                                      </Text>
                                    </View>
                                  </View>
                                  {item.usedAt && (
                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                      Использовано: {new Date(item.usedAt).toLocaleDateString('ru-RU')}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'notifications' && (
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                      Выберите способы получения уведомлений
                    </Text>
                    <View style={styles.menuItem}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="notifications-outline" size={20} color="#2563eb" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            Push-уведомления
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>
                          Уведомления в приложении
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.push}
                        onValueChange={async (value) => {
                          const newSettings = { ...notificationSettings, push: value };
                          setNotificationSettings(newSettings);
                          setIsSavingSettings(true);
                          try {
                            await updateNotificationSettings(newSettings);
                          } catch (error) {
                            console.error('Error updating notification settings:', error);
                            Alert.alert('Ошибка', 'Не удалось обновить настройки');
                            setNotificationSettings(notificationSettings);
                          } finally {
                            setIsSavingSettings(false);
                          }
                        }}
                        disabled={isSavingSettings}
                      />
                    </View>
                    <View style={styles.menuItem}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="mail-outline" size={20} color="#10b981" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            Email
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>
                          Уведомления на почту
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.email}
                        onValueChange={async (value) => {
                          const newSettings = { ...notificationSettings, email: value };
                          setNotificationSettings(newSettings);
                          setIsSavingSettings(true);
                          try {
                            await updateNotificationSettings(newSettings);
                          } catch (error) {
                            console.error('Error updating notification settings:', error);
                            Alert.alert('Ошибка', 'Не удалось обновить настройки');
                            setNotificationSettings(notificationSettings);
                          } finally {
                            setIsSavingSettings(false);
                          }
                        }}
                        disabled={isSavingSettings}
                      />
                    </View>
                    <View style={styles.menuItem}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="phone-portrait-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            SMS
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>
                          Уведомления по SMS
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.sms}
                        onValueChange={async (value) => {
                          const newSettings = { ...notificationSettings, sms: value };
                          setNotificationSettings(newSettings);
                          setIsSavingSettings(true);
                          try {
                            await updateNotificationSettings(newSettings);
                          } catch (error) {
                            console.error('Error updating notification settings:', error);
                            Alert.alert('Ошибка', 'Не удалось обновить настройки');
                            setNotificationSettings(notificationSettings);
                          } finally {
                            setIsSavingSettings(false);
                          }
                        }}
                        disabled={isSavingSettings}
                      />
                    </View>
                    <View style={styles.menuItem}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="send-outline" size={20} color="#06b6d4" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                            Telegram
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>
                          Уведомления в Telegram
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.telegram}
                        onValueChange={async (value) => {
                          const newSettings = { ...notificationSettings, telegram: value };
                          setNotificationSettings(newSettings);
                          setIsSavingSettings(true);
                          try {
                            await updateNotificationSettings(newSettings);
                          } catch (error) {
                            console.error('Error updating notification settings:', error);
                            Alert.alert('Ошибка', 'Не удалось обновить настройки');
                            setNotificationSettings(notificationSettings);
                          } finally {
                            setIsSavingSettings(false);
                          }
                        }}
                        disabled={isSavingSettings}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Выход */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
};
