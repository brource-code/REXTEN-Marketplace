import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, Modal, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { RatingBadge } from '../components/RatingBadge';
import { TagBadgesRow } from '../components/TagBadgesRow';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { getServiceProfile, getCategories } from '../api/marketplace';
import { ServiceProfile, Category } from '../types/marketplace';
import { useAuth } from '../contexts/AuthContext';
import { addToFavorites, removeFromFavorites, getFavoriteServices, getFavoriteAdvertisements } from '../api/client';

type ServiceDetailsRouteProp = RouteProp<RootStackParamList, 'ServiceDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 256,
    backgroundColor: '#f3f4f6',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  categoryBadgeContainer: {
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 36,
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  separator: {
    color: '#d1d5db',
    marginHorizontal: 8,
    fontSize: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#4b5563',
  },
  tagsContainer: {
    marginBottom: 20,
  },
  priceContainer: {
    marginBottom: 20,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  priceLabelText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    marginRight: 24,
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
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  descriptionText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  teamMemberContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  teamMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  teamMemberAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  teamMemberRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  teamMemberDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  reviewContainer: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
    lineHeight: 20,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  portfolioItem: {
    width: '48%',
    marginBottom: 16,
  },
  portfolioImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  portfolioTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  modalCloseButton: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImageTitle: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modalImageTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  serviceItemContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  serviceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  serviceItemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  serviceItemDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  serviceItemDuration: {
    fontSize: 12,
    color: '#6b7280',
  },
  bookButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  bookButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },
});

export const ServiceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ServiceDetailsRouteProp>();
  const { slug } = route.params;
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<ServiceProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'team' | 'portfolio'>('about');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [favoriteServices, setFavoriteServices] = useState<any[]>([]);
  const [favoriteAdvertisements, setFavoriteAdvertisements] = useState<any[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [profileData, categoriesData] = await Promise.all([
          getServiceProfile(slug),
          getCategories(),
        ]);
        
        if (!profileData) {
          setError('Услуга не найдена');
          return;
        }
        
        setProfile(profileData);
        setCategories(categoriesData);
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Ошибка загрузки профиля');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [slug]);

  // Загружаем избранное отдельно при изменении авторизации или профиля
  useEffect(() => {
    if (!isAuthenticated || !profile?.service?.id) {
      setFavoriteServices([]);
      setFavoriteAdvertisements([]);
      setIsFavorite(false);
      return;
    }

    // Загружаем избранное асинхронно, не блокируя основной поток
    const loadFavs = async () => {
      try {
        await loadFavorites();
      } catch (error) {
        // Игнорируем ошибки авторизации для избранного
        console.log('Could not load favorites (user may not be logged in)');
      }
    };

    loadFavs();
  }, [isAuthenticated, profile?.service?.id]);

  const loadFavorites = async () => {
    try {
      const [services, advertisements] = await Promise.all([
        getFavoriteServices(),
        getFavoriteAdvertisements(),
      ]);
      setFavoriteServices(services);
      setFavoriteAdvertisements(advertisements);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Обновляем статус избранного при изменении списков избранного или статуса авторизации
  useEffect(() => {
    if (!isAuthenticated || !profile?.service?.id) {
      setIsFavorite(false);
      return;
    }

    // Если списки избранного еще не загружены, не проверяем статус
    if (!favoriteServices.length && !favoriteAdvertisements.length) {
      setIsFavorite(false);
      return;
    }

    const serviceIdStr = String(profile.service.id);
    const isAdvertisement = serviceIdStr.startsWith('ad_');

    if (isAdvertisement) {
      // Для объявлений извлекаем реальный ID объявления (без префикса 'ad_')
      const adId = serviceIdStr.replace('ad_', '');
      const advertisementId = parseInt(adId);
      if (!advertisementId || isNaN(advertisementId)) {
        setIsFavorite(false);
        return;
      }
      const isFav = favoriteAdvertisements.some((fav) => {
        const favAdId = fav.advertisementId || fav.id;
        const favAdIdNum = typeof favAdId === 'string' ? parseInt(favAdId) : favAdId;
        return favAdIdNum === advertisementId;
      });
      setIsFavorite(isFav);
    } else {
      // Для обычных услуг проверяем по serviceId
      let currentServiceId = null;
      if (profile.service.service_id) {
        currentServiceId = typeof profile.service.service_id === 'string'
          ? parseInt(profile.service.service_id)
          : profile.service.service_id;
      } else {
        // Используем id из profile.service.id, но нужно проверить формат
        const serviceId = typeof profile.service.id === 'string' ? parseInt(profile.service.id) : profile.service.id;
        currentServiceId = serviceId;
      }
      if (!currentServiceId || isNaN(currentServiceId)) {
        setIsFavorite(false);
        return;
      }
      const isFav = favoriteServices.some((fav) => {
        const favServiceId = typeof fav.serviceId === 'string' ? parseInt(fav.serviceId) : fav.serviceId;
        return favServiceId === currentServiceId;
      });
      setIsFavorite(isFav);
    }
  }, [favoriteServices, favoriteAdvertisements, profile?.service?.id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login' as any);
      return;
    }

    if (!profile) return;

    setIsFavoriteLoading(true);
    try {
      const serviceIdStr = String(profile.service.id);
      const isAdvertisement = serviceIdStr.startsWith('ad_');

      let favoriteType: 'service' | 'business' | 'advertisement' = 'service';
      let favoriteId: number | string;

      if (isAdvertisement) {
        favoriteType = 'advertisement';
        const adId = serviceIdStr.replace('ad_', '');
        favoriteId = parseInt(adId);
        if (!favoriteId || isNaN(favoriteId)) {
          Alert.alert('Ошибка', 'Не удалось определить ID объявления');
          setIsFavoriteLoading(false);
          return;
        }
      } else {
        favoriteType = 'service';
        if (profile.service.service_id) {
          favoriteId = typeof profile.service.service_id === 'string'
            ? parseInt(profile.service.service_id)
            : profile.service.service_id;
        } else {
          favoriteId = typeof profile.service.id === 'string' ? parseInt(profile.service.id) : profile.service.id;
        }
        if (!favoriteId) {
          Alert.alert('Ошибка', 'Не удалось определить ID услуги');
          setIsFavoriteLoading(false);
          return;
        }
      }

      if (isFavorite) {
        await removeFromFavorites(favoriteType, favoriteId);
      } else {
        await addToFavorites(favoriteType, favoriteId);
      }

      // Обновляем локальный список избранного - статус обновится автоматически через useEffect
      await loadFavorites();
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Ошибка при изменении избранного';
      
      // Если уже в избранном, просто обновляем список - статус обновится автоматически
      if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
        await loadFavorites();
      } else {
        Alert.alert('Ошибка', errorMessage);
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  if (error || !profile) {
    return (
      <ScreenContainer>
        <ErrorState message={error || 'Услуга не найдена'} />
      </ScreenContainer>
    );
  }

  const business = profile.service;
  const categoryInfo = categories.find((cat) => cat.id === business.group);
  const reviews = profile.reviews || [];
  const team = profile.team || [];
  const portfolio = profile.portfolio || [];
  const services = profile.servicesList || [];

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
      : (business.rating || 0).toFixed(1);

  const tabs = [
    { id: 'about' as const, label: 'О сервисе' },
    { id: 'reviews' as const, label: `Отзывы (${reviews.length})` },
    { id: 'team' as const, label: `Команда (${team.length})` },
    { id: 'portfolio' as const, label: `Портфолио (${portfolio.length})` },
  ];

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Изображение */}
          <View style={styles.imageContainer}>
            {business.imageUrl ? (
              <Image
                source={{ uri: business.imageUrl }}
                style={styles.mainImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Text style={styles.noImageText}>Нет изображения</Text>
              </View>
            )}
          </View>

          {/* Основная информация */}
          <View style={styles.contentContainer}>
            {/* Категория */}
            <View style={styles.categoryBadgeContainer}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {categoryInfo?.name || business.group}
                </Text>
              </View>
            </View>

            {/* Название */}
            <Text style={styles.businessName}>
              {business.name}
            </Text>

            {/* Рейтинг и локация */}
            <View style={styles.ratingLocationRow}>
              <RatingBadge rating={parseFloat(averageRating)} reviewsCount={reviews.length || business.reviewsCount} />
              {business.location && (
                <>
                  <Text style={styles.separator}>•</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location-outline" size={14} color="#4b5563" style={{ marginRight: 4 }} />
                    <Text style={styles.locationText}>
                      {business.location}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Теги */}
            {business.tags && business.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <TagBadgesRow tags={business.tags} maxVisible={6} />
              </View>
            )}

            {/* Кнопка избранного - показываем всегда */}
            <TouchableOpacity
              onPress={toggleFavorite}
              disabled={isFavoriteLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isFavorite ? '#fee2e2' : '#f3f4f6',
                marginTop: 12,
                opacity: isFavoriteLoading ? 0.6 : 1,
              }}
            >
              {isFavoriteLoading ? (
                <ActivityIndicator size="small" color={isFavorite ? '#ef4444' : '#6b7280'} style={{ marginRight: 6 }} />
              ) : (
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isFavorite ? '#ef4444' : '#6b7280'}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: isFavorite ? '#ef4444' : '#6b7280',
                }}
              >
                {isFavorite ? 'В избранном' : 'В избранное'}
              </Text>
            </TouchableOpacity>

            {/* Цена */}
            {services.length > 0 && services[0].price && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  {services[0].price}
                </Text>
                {services[0].duration && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginRight: 4 }} />
                    <Text style={styles.priceLabelText}>
                      {services[0].duration} мин
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Табы */}
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
              >
                <View 
                  style={[
                    styles.tabButton,
                    activeTab === tab.id ? styles.tabButtonActive : styles.tabButtonInactive
                  ]}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === tab.id ? styles.tabButtonTextActive : styles.tabButtonTextInactive
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Контент табов */}
          <View style={styles.tabContent}>
            {activeTab === 'about' && (
              <View>
                {business.description && (
                  <Text style={styles.descriptionText}>
                    {business.description}
                  </Text>
                )}

                {/* Доступные услуги */}
                {services.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={styles.sectionHeader}>Доступные услуги</Text>
                    {services.map((service) => (
                      <View key={service.id} style={styles.serviceItemContainer}>
                        <View style={styles.serviceItemHeader}>
                          <Text style={styles.serviceItemName}>{service.name}</Text>
                          {service.price && (
                            <Text style={styles.serviceItemPrice}>
                              {service.price}
                            </Text>
                          )}
                        </View>
                        {service.description && (
                          <Text style={styles.serviceItemDescription}>
                            {service.description}
                          </Text>
                        )}
                        {service.duration && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={12} color="#6b7280" style={{ marginRight: 4 }} />
                            <Text style={styles.serviceItemDuration}>
                              {service.duration} мин
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View>
                <Text style={styles.sectionHeader}>Отзывы</Text>
                {reviews.length === 0 ? (
                  <EmptyState title="Отзывов пока нет" message="Будьте первым, кто оставит отзыв!" />
                ) : (
                  reviews.map((review) => (
                    <View key={review.id} style={styles.reviewContainer}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewerName}>
                          {review.name || review.userName || 'Аноним'}
                        </Text>
                        <RatingBadge rating={review.rating} size="sm" />
                        {review.date && (
                          <Text style={styles.reviewDate}>
                            {new Date(review.date).toLocaleDateString('ru-RU')}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.reviewText}>
                        {review.text || review.comment || ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'team' && (
              <View>
                <Text style={styles.sectionHeader}>Наша команда</Text>
                {team.length === 0 ? (
                  <EmptyState title="Команда не указана" message="Информация о команде скоро появится." />
                ) : (
                  team.map((member) => (
                    <View key={member.id} style={styles.teamMemberContainer}>
                      <View style={styles.teamMemberAvatar}>
                        {member.avatarUrl ? (
                          <Image
                            source={{ uri: member.avatarUrl }}
                            style={styles.teamMemberAvatar}
                          />
                        ) : (
                          <Text style={styles.teamMemberAvatarText}>
                            {member.name ? member.name[0] : '?'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.teamMemberInfo}>
                        <Text style={styles.teamMemberName}>{member.name}</Text>
                        {member.role && (
                          <Text style={styles.teamMemberRole}>{member.role}</Text>
                        )}
                        {member.description && (
                          <Text style={styles.teamMemberDescription}>
                            {member.description}
                          </Text>
                        )}
                        {member.rating && (
                          <View style={{ marginTop: 8 }}>
                            <RatingBadge rating={member.rating} size="sm" />
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'portfolio' && (
              <View>
                <Text style={styles.sectionHeader}>Портфолио</Text>
                {portfolio.length === 0 ? (
                  <EmptyState title="Портфолио пусто" message="Скоро здесь появятся новые работы." />
                ) : (
                  <View style={styles.portfolioGrid}>
                    {portfolio.map((item, idx) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.portfolioItem}
                        onPress={() => setSelectedImageIndex(idx)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.portfolioImage}
                          resizeMode="cover"
                        />
                        {item.title && (
                          <Text style={styles.portfolioTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Modal для полноэкранного просмотра изображений */}
        <Modal
          visible={selectedImageIndex !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImageIndex(null)}
        >
          <View style={styles.modalContainer}>
            {selectedImageIndex !== null && portfolio[selectedImageIndex] && (
              <>
                <Image
                  source={{ uri: portfolio[selectedImageIndex].imageUrl }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedImageIndex(null)}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
                {portfolio[selectedImageIndex].title && (
                  <View style={styles.modalImageTitle}>
                    <Text style={styles.modalImageTitleText}>
                      {portfolio[selectedImageIndex].title}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Modal>

        {/* Кнопка "Забронировать" */}
        <View style={styles.bookButtonContainer}>
          <TouchableOpacity
            onPress={() => {
              if (profile && profile.service) {
                // Используем group как company_id, так как это ID категории/компании
                const companyId = Number(profile.service.group || 1);
                // advertisement_id берем из id услуги (ad_74 -> 74)
                const advertisementId = profile.service.id.startsWith('ad_')
                  ? Number(profile.service.id.replace('ad_', ''))
                  : undefined;
                navigation.navigate('Booking', {
                  serviceId: slug,
                  companyId,
                  advertisementId,
                });
              }
            }}
            style={styles.bookButton}
          >
            <Text style={styles.bookButtonText}>
              Забронировать
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};
