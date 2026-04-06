import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ServiceCard } from '../components/ServiceCard';
import { useAuth } from '../contexts/AuthContext';
import { isClientAppRole } from '../constants/roles';
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
import { Service } from '../types/marketplace';
import { normalizeImageUrl } from '../api/config';

import { useTheme } from '../contexts/ThemeContext';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    marginBottom: 24,
    paddingVertical: 0,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabButtonActive: {},
  tabButtonInactive: {},
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {},
  tabButtonTextInactive: {},
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  guestAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
});

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, logout: authLogout, refreshUser } = useAuth();
  const { colors } = useTheme();
  const isClient = isClientAppRole(user?.role);
  
  
  
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
      if (!isClient) {
        setIsLoading(false);
        return;
      }
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
  }, [activeTab, isClient]);

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

    const loadData = async () => {
      isInitialLoadRef.current = true;
      if (!isClientAppRole(user?.role)) {
        return;
      }
      try {
        const [services, advertisements, businesses] = await Promise.all([
          getFavoriteServices(),
          getFavoriteAdvertisements(),
          getFavoriteBusinesses(),
        ]);
        setFavoriteServices(services);
        setFavoriteAdvertisements(advertisements);
        setFavoriteBusinesses(businesses);

        const bookingsData = await getClientBookings({ upcoming: true });
        setBookings(bookingsData);
      } catch (error: any) {
        console.error('Error loading initial data:', error?.response?.data || error?.message);
      }
    };

    loadData();
  }, [isAuthenticated, user?.role]);

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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.scrollContent, { backgroundColor: colors.background }]}>
              <View style={styles.guestContainer}>
                <View style={[styles.guestAvatarCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person-outline" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.guestText, { color: colors.textSecondary }]}>
                  Войдите в аккаунт, чтобы получить доступ к профилю, заказам и избранному
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login' as any)}
                  style={[styles.logoutButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.logoutButtonText, { color: colors.buttonText }]}>Войти / Зарегистрироваться</Text>
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.scrollContent, { backgroundColor: colors.background }]}>
            {/* Header с профилем */}
            <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.headerTop}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                    {normalizeImageUrl(user?.avatar) ? (
                      <Image source={{ uri: normalizeImageUrl(user?.avatar)! }} style={styles.avatarImage} />
                    ) : (
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.headerInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{fullName}</Text>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
                  {(user?.city || user?.state) && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                        {user.city && user.state ? `${user.city}, ${user.state}` : user.city || user.state}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Статистика */}
              <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
                <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Бронирований</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{bookings.length}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Избранное</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {favoriteServices.length + favoriteAdvertisements.length + favoriteBusinesses.length}
                  </Text>
                </View>
              </View>

              {/* Кнопки действий */}
              <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderRightColor: colors.border }]}
                  onPress={() => navigation.navigate('Bookings' as any)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Бронирования</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('ProfileSettings' as any)}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Настройки</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Табы */}
            <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
              <TouchableOpacity
                onPress={() => setActiveTab('bookings')}
                style={[
                  styles.tabButton,
                  { backgroundColor: 'transparent' },
                  activeTab === 'bookings' && { backgroundColor: colors.card },
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: colors.textSecondary },
                    activeTab === 'bookings' && { color: colors.text, fontWeight: '700' },
                  ]}
                >
                  Брони ({bookings.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('reviews')}
                style={[
                  styles.tabButton,
                  { backgroundColor: 'transparent' },
                  activeTab === 'reviews' && { backgroundColor: colors.card },
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: colors.textSecondary },
                    activeTab === 'reviews' && { color: colors.text, fontWeight: '700' },
                  ]}
                >
                  Отзывы{pendingReviews.length > 0 ? ` (${pendingReviews.length})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('favorites')}
                style={[
                  styles.tabButton,
                  { borderBottomColor: activeTab === 'favorites' ? colors.primary : 'transparent', marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: activeTab === 'favorites' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Избранное ({favoriteServices.length + favoriteAdvertisements.length + favoriteBusinesses.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('discounts')}
                style={[
                  styles.tabButton,
                  { borderBottomColor: activeTab === 'discounts' ? colors.primary : 'transparent', marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: activeTab === 'discounts' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Скидки
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('notifications')}
                style={[
                  styles.tabButton,
                  { borderBottomColor: activeTab === 'notifications' ? colors.primary : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: activeTab === 'notifications' ? colors.primary : colors.textSecondary },
                  ]}
                >
                  Уведомления
                </Text>
              </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Контент табов */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {activeTab === 'bookings' && (
                <View>
                  {bookings.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyStateText, { marginTop: 16, color: colors.textSecondary }]}>
                        У вас пока нет бронирований
                      </Text>
                    </View>
                  ) : (
                    bookings.map((booking) => (
                      <View key={booking.id} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                            {booking.serviceName}
                          </Text>
                          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
                            {booking.businessName}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            {new Date(booking.date).toLocaleDateString('ru-RU')} • {booking.time}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
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
                      <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyStateText, { marginTop: 16, color: colors.textSecondary }]}>
                        У вас пока нет избранных
                      </Text>
                      <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 12, color: colors.textSecondary }]}>
                        Добавляйте услуги, объявления и бизнесы в избранное
                      </Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ServicesHome' as any)}
                        style={{
                          backgroundColor: colors.primary,
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          borderRadius: 8,
                          marginTop: 16,
                        }}
                      >
                        <Text style={{ color: colors.buttonText, fontWeight: '600', fontSize: 14 }}>
                          Найти услуги
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      {/* Избранные сервисы */}
                      {favoriteServices.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
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
                          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
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
                          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
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
                      <Ionicons name="star-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyStateText, { marginTop: 16, color: colors.textSecondary }]}>
                        У вас пока нет отзывов
                      </Text>
                      <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 12, color: colors.textSecondary }]}>
                        После завершения бронирований здесь появятся запросы на отзывы
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {/* Ожидающие отзывы */}
                      {pendingReviews.length > 0 && (
                        <View style={{ marginBottom: 24 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 }}>
                              Ожидающие отзывы
                            </Text>
                            <View style={{ backgroundColor: colors.warning, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.buttonText }}>
                                {pendingReviews.length}
                              </Text>
                            </View>
                          </View>
                          {pendingReviews.map((review) => (
                            <View key={review.id} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                                  {review.serviceName}
                                </Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
                                  {review.businessName}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                  {new Date(review.date).toLocaleDateString('ru-RU')} • {review.time} • ${review.price}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: colors.primary,
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                }}
                                onPress={() => {
                                  Alert.alert('Отзыв', 'Функция создания отзыва будет добавлена позже');
                                }}
                              >
                                <Text style={{ color: colors.buttonText, fontWeight: '600', fontSize: 14 }}>
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
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 }}>
                              Мои отзывы
                            </Text>
                            {reviews.length > 0 && (
                              <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.buttonText }}>
                                  {reviews.length}
                                </Text>
                              </View>
                            )}
                          </View>
                          {reviews.map((review) => (
                            <View key={review.id} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                              {normalizeImageUrl(review.businessAvatar) && (
                                <Image
                                  source={{ uri: normalizeImageUrl(review.businessAvatar)! }}
                                  style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }}
                                />
                              )}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
                                      {review.businessName}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
                                      {review.serviceName}
                                    </Text>
                                    {review.specialistName && (
                                      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
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
                                        color={i < review.rating ? colors.warning : colors.textMuted}
                                      />
                                    ))}
                                  </View>
                                </View>
                                <Text style={{ fontSize: 14, color: colors.text, marginBottom: 8 }}>
                                  {review.comment}
                                </Text>
                                {review.response && (
                                  <View style={{ backgroundColor: colors.backgroundSecondary, padding: 12, borderRadius: 8, marginTop: 8 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>
                                      Ответ от {review.businessName}:
                                    </Text>
                                    <Text style={{ fontSize: 14, color: colors.text }}>
                                      {review.response}
                                    </Text>
                                  </View>
                                )}
                                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
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
                      <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyStateText, { marginTop: 16, color: colors.textSecondary }]}>
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
                          <View key={`${isDiscount ? 'discount' : 'bonus'}-${item.id}`} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                            {normalizeImageUrl(item.businessImage) && (
                              <Image
                                source={{ uri: normalizeImageUrl(item.businessImage)! }}
                                style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
                              />
                            )}
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 }}>
                                  {item.title}
                                </Text>
                                <View style={{
                                  backgroundColor: isDiscount ? colors.primary : colors.success,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}>
                                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.buttonText }}>
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
                              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
                                {item.description}
                              </Text>
                              {isDiscount && item.code && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                  <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    backgroundColor: colors.backgroundSecondary,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 4,
                                    marginRight: 8,
                                  }}>
                                    {item.code}
                                  </Text>
                                  {item.minPurchaseAmount && (
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                      От {item.minPurchaseAmount}₽
                                    </Text>
                                  )}
                                </View>
                              )}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                  Действует до: {new Date(item.validUntil).toLocaleDateString('ru-RU')}
                                </Text>
                                {isValid && (
                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: colors.primary,
                                      paddingHorizontal: 16,
                                      paddingVertical: 8,
                                      borderRadius: 8,
                                    }}
                                    onPress={() => {
                                      Alert.alert('Применить', 'Функция применения скидки/бонуса будет добавлена позже');
                                    }}
                                  >
                                    <Text style={{ color: colors.buttonText, fontWeight: '600', fontSize: 14 }}>
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
                        <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 }}>
                            Использованные
                          </Text>
                          {[...discounts.filter(d => d.isUsed), ...bonuses.filter(b => b.isUsed)].map((item) => {
                            const isDiscount = 'code' in item;
                            return (
                              <View key={`used-${isDiscount ? 'discount' : 'bonus'}-${item.id}`} style={[styles.menuItem, { backgroundColor: colors.backgroundSecondary, opacity: 0.6 }]}>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginRight: 8 }}>
                                      {item.title}
                                    </Text>
                                    <View style={{
                                      backgroundColor: colors.textMuted,
                                      paddingHorizontal: 8,
                                      paddingVertical: 2,
                                      borderRadius: 4,
                                    }}>
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.buttonText }}>
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
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
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
                    <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                      Выберите способы получения уведомлений
                    </Text>
                    <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                            Push-уведомления
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
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
                    <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="mail-outline" size={20} color={colors.success} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                            Email
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
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
                    {/* SMS временно скрыт
                    <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="phone-portrait-outline" size={20} color={colors.purple} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                            SMS
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
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
                    */}
                    <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="send-outline" size={20} color={colors.info} style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                            Telegram
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
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
            <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: colors.error }]}>
              <Text style={[styles.logoutButtonText, { color: colors.buttonText }]}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
};
