import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RatingBadge } from './RatingBadge';
import { TagBadgesRow } from './TagBadgesRow';
import { Service } from '../types/marketplace';
import { tagDictionary } from '../constants/tags';
import { useAuth } from '../contexts/AuthContext';
import { getFavoriteServices, getFavoriteAdvertisements, addToFavorites, removeFromFavorites } from '../api/client';
import { isClientAppRole } from '../constants/roles';
import { normalizeImageUrl } from '../api/config';
import { useTheme } from '../contexts/ThemeContext';

interface ServiceCardProps {
  service: Service;
  variant?: 'default' | 'compact' | 'featured';
  onPress?: () => void;
  onFavoriteChange?: () => void; // Callback для обновления списка избранного
}

// Функция для получения бейджей из тегов
const getBadges = (tags: string[]) => {
  const badges: Array<{ label: string; bgColor: string }> = [];
  if (tags.includes('premium')) {
    badges.push({ label: 'Premium', bgColor: '#eab308' });
  }
  if (tags.includes('mobile')) {
    badges.push({ label: 'Выездной', bgColor: 'rgba(0,0,0,0.7)' });
  }
  if (tags.includes('russian-speaking')) {
    badges.push({ label: 'RU', bgColor: 'rgba(0,0,0,0.7)' });
  }
  return badges;
};

const styles = StyleSheet.create({
  // Compact variant
  compactCard: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactImageContainer: {
    position: 'relative',
    width: 112,
    height: 96,
    flexShrink: 0,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPlaceholderText: {
    fontSize: 10,
  },
  badgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'column',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  compactContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  categoryText: {
    fontSize: 11,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
  },
  ratingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Default/Featured variant
  defaultCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 320,
  },
  featuredCard: {
    borderWidth: 1.5,
    shadowOpacity: 0.15,
  },
  defaultImageContainer: {
    position: 'relative',
    width: '100%',
    height: 192,
  },
  defaultImage: {
    width: '100%',
    height: '100%',
  },
  defaultPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPlaceholderText: {
    fontSize: 14,
  },
  defaultContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  defaultCategoryText: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultTitleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 24,
  },
  defaultDescriptionText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  defaultRatingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  defaultPriceText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  variant = 'default',
  onPress,
  onFavoriteChange,
}) => {
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const isClient = isClientAppRole(user?.role);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [favoriteServices, setFavoriteServices] = useState<any[]>([]);
  const [favoriteAdvertisements, setFavoriteAdvertisements] = useState<any[]>([]);

  // Загружаем избранное при монтировании
  useEffect(() => {
    if (isAuthenticated && isClient) {
      loadFavorites();
    }
  }, [isAuthenticated, isClient]);

  // Проверяем, находится ли услуга в избранном
  useEffect(() => {
    if (!isAuthenticated || (!favoriteServices.length && !favoriteAdvertisements.length)) {
      setIsFavorite(false);
      return;
    }

    const serviceIdStr = String(service.id);
    const isAdvertisement = serviceIdStr.startsWith('ad_');

    if (isAdvertisement) {
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
      let currentServiceId = null;
      if ((service as any).service_id) {
        currentServiceId = typeof (service as any).service_id === 'string' 
          ? parseInt((service as any).service_id) 
          : (service as any).service_id;
      } else {
        currentServiceId = typeof service.id === 'string' ? parseInt(service.id) : service.id;
      }
      if (!currentServiceId) {
        setIsFavorite(false);
        return;
      }
      const isFav = favoriteServices.some((fav) => {
        const favServiceId = typeof fav.serviceId === 'string' ? parseInt(fav.serviceId) : fav.serviceId;
        return favServiceId === currentServiceId;
      });
      setIsFavorite(isFav);
    }
  }, [favoriteServices, favoriteAdvertisements, service.id, (service as any).service_id, isAuthenticated]);

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

  const handleToggleFavorite = async (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isClient) {
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Вход required', 'Войдите в аккаунт, чтобы добавлять услуги в избранное');
      return;
    }

    if (!service?.id) return;

    setIsFavoriteLoading(true);
    try {
      const serviceIdStr = String(service.id);
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
        if ((service as any).service_id) {
          favoriteId = typeof (service as any).service_id === 'string'
            ? parseInt((service as any).service_id)
            : (service as any).service_id;
        } else {
          favoriteId = typeof service.id === 'string' ? parseInt(service.id) : service.id;
        }
        if (!favoriteId) {
          Alert.alert('Ошибка', 'Не удалось определить ID услуги');
          setIsFavoriteLoading(false);
          return;
        }
      }

      if (isFavorite) {
        await removeFromFavorites(favoriteType, favoriteId);
        setIsFavorite(false);
      } else {
        await addToFavorites(favoriteType, favoriteId);
        setIsFavorite(true);
      }

      // Обновляем локальный список избранного
      await loadFavorites();
      
      // Вызываем callback для обновления родительского компонента
      if (onFavoriteChange) {
        onFavoriteChange();
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Ошибка при изменении избранного';
      
      // Если уже в избранном, просто обновляем список
      if (errorMessage.includes('Already in favorites') || errorMessage.includes('уже в избранном')) {
        await loadFavorites();
        setIsFavorite(true);
      } else {
        Alert.alert('Ошибка', errorMessage);
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const badges = getBadges(service.tags || []);
  const isFeatured = variant === 'featured';

  const dynamicCardStyles = {
    compactCard: {
      ...styles.compactCard,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    },
    defaultCard: {
      ...styles.defaultCard,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    },
    categoryText: { ...styles.categoryText, color: colors.textSecondary },
    titleText: { ...styles.titleText, color: colors.text },
    descriptionText: { ...styles.descriptionText, color: colors.textSecondary },
    priceText: { ...styles.priceText, color: colors.text },
    defaultTitleText: { ...styles.defaultTitleText, color: colors.text },
    defaultDescriptionText: { ...styles.defaultDescriptionText, color: colors.textSecondary },
    defaultPriceText: { ...styles.defaultPriceText, color: colors.text },
  };

  // Компактная версия (горизонтальная карточка)
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress || undefined}
        activeOpacity={0.7}
      >
        <View style={dynamicCardStyles.compactCard}>
          {/* Изображение слева */}
          <View style={[styles.compactImageContainer, { backgroundColor: colors.backgroundTertiary }]}>
            {normalizeImageUrl(service.imageUrl) ? (
              <Image
                source={{ uri: normalizeImageUrl(service.imageUrl)! }}
                style={styles.compactImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.compactPlaceholder}>
                <Text style={[styles.compactPlaceholderText, { color: colors.textMuted }]}>Нет фото</Text>
              </View>
            )}
            {/* Бейджи поверх фото */}
            {badges.length > 0 && (
              <View style={styles.badgeContainer}>
                {badges.slice(0, 2).map((badge, idx) => (
                  <View
                    key={idx}
                    style={[styles.badge, { backgroundColor: badge.bgColor }]}
                  >
                    <Text style={[styles.badgeText, { color: colors.buttonText }]}>{badge.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Текстовый блок справа */}
          <View style={styles.compactContent}>
            <View>
              {/* Категория */}
              <Text style={dynamicCardStyles.categoryText} numberOfLines={1}>
                {service.category || 'Услуга'}
              </Text>
              
              {/* Название */}
              <Text style={dynamicCardStyles.titleText} numberOfLines={1}>
                {service.name}
              </Text>
              
              {/* Описание */}
              {service.description && (
                <Text style={dynamicCardStyles.descriptionText} numberOfLines={1}>
                  {service.description}
                </Text>
              )}

              {/* Теги */}
              {service.tags && service.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {service.tags.slice(0, 2).map((tag, idx) => (
                    <View
                      key={tag}
                      style={[styles.tagBadge, { backgroundColor: colors.backgroundTertiary }]}
                    >
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                        {tagDictionary[tag] || tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Рейтинг и цена */}
            <View style={styles.ratingPriceRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <RatingBadge rating={service.rating} reviewsCount={service.reviewsCount} size="sm" />
                {isAuthenticated && isClient && (
                  <TouchableOpacity
                    onPress={handleToggleFavorite}
                    disabled={isFavoriteLoading}
                    style={{ padding: 4 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isFavoriteLoading ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Ionicons 
                        name={isFavorite ? 'heart' : 'heart-outline'} 
                        size={16} 
                        color={isFavorite ? colors.error : colors.textMuted} 
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={dynamicCardStyles.priceText}>
                {service.priceLabel}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Дефолтная/featured версия (вертикальная карточка)
  return (
    <TouchableOpacity
      onPress={onPress || undefined}
      activeOpacity={0.7}
      style={{ width: 280 }}
    >
      <View style={[dynamicCardStyles.defaultCard, isFeatured && [styles.featuredCard, { borderColor: colors.primaryLight, shadowColor: colors.primary }]]}>
        {/* Изображение */}
        <View style={[styles.defaultImageContainer, { backgroundColor: colors.backgroundTertiary }]}>
          {normalizeImageUrl(service.imageUrl) ? (
            <Image
              source={{ uri: normalizeImageUrl(service.imageUrl)! }}
              style={styles.defaultImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.defaultPlaceholder}>
              <Text style={[styles.defaultPlaceholderText, { color: colors.textMuted }]}>Нет фото</Text>
            </View>
          )}
          {/* Бейджи поверх фото */}
          {badges.length > 0 && (
            <View style={[styles.badgeContainer, { top: 12, left: 12 }]}>
              {badges.map((badge, idx) => (
                <View
                  key={idx}
                  style={[styles.badge, { backgroundColor: badge.bgColor }]}
                >
                  <Text style={[styles.badgeText, { color: colors.buttonText }]}>{badge.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Контент */}
        <View style={styles.defaultContent}>
          <View>
            {/* Категория */}
            <Text style={[styles.defaultCategoryText, { color: colors.textSecondary }]} numberOfLines={1}>
              {service.category || 'Услуга'}
            </Text>
            
            {/* Название */}
            <Text style={dynamicCardStyles.defaultTitleText} numberOfLines={2}>
              {service.name}
            </Text>
            
            {/* Описание */}
            {service.description && (
              <Text style={dynamicCardStyles.defaultDescriptionText} numberOfLines={2}>
                {service.description}
              </Text>
            )}

            {/* Теги */}
            {service.tags && service.tags.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <TagBadgesRow tags={service.tags} maxVisible={3} />
              </View>
            )}
          </View>

          {/* Рейтинг и цена */}
          <View style={styles.defaultRatingPriceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <RatingBadge rating={service.rating} reviewsCount={service.reviewsCount} size="sm" />
              {isAuthenticated && isClient && (
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  disabled={isFavoriteLoading}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isFavoriteLoading ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons 
                      name={isFavorite ? 'heart' : 'heart-outline'} 
                      size={16} 
                      color={isFavorite ? colors.error : colors.textMuted} 
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text style={dynamicCardStyles.defaultPriceText}>
              {service.priceLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
