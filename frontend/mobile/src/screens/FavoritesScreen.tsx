import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ServiceCard } from '../components/ServiceCard';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';
import { isClientAppRole } from '../constants/roles';
import { 
  getFavoriteServices, 
  getFavoriteAdvertisements, 
  getFavoriteBusinesses,
  removeFromFavorites,
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 16,
  },
  listItem: {
    marginBottom: 16,
  },
  businessCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  businessImage: {
    width: '100%',
    height: 160,
  },
  businessImagePlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessContent: {
    padding: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessInfo: {
    flex: 1,
    marginRight: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    marginBottom: 8,
  },
  businessRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 12,
  },
  favoriteButton: {
    padding: 8,
  },
});

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const isClient = isClientAppRole(user?.role);
  const [favoriteServices, setFavoriteServices] = useState<FavoriteService[]>([]);
  const [favoriteAdvertisements, setFavoriteAdvertisements] = useState<FavoriteAdvertisement[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<FavoriteBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isClient) {
      loadFavorites();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, isClient]);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const [services, advertisements, businesses] = await Promise.all([
        getFavoriteServices(),
        getFavoriteAdvertisements(),
        getFavoriteBusinesses(),
      ]);
      setFavoriteServices(services);
      setFavoriteAdvertisements(advertisements);
      setFavoriteBusinesses(businesses);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFavorites();
  };

  const handleRemoveFavorite = async (type: 'service' | 'business' | 'advertisement', id: number | string) => {
    try {
      await removeFromFavorites(type, id);
      await loadFavorites();
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      Alert.alert('Ошибка', error?.response?.data?.message || 'Не удалось удалить из избранного');
    }
  };

  const renderService = ({ item }: { item: FavoriteService }) => {
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
      <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <ServiceCard
          service={service}
          variant="compact"
          onPress={() => {
            const slug = item.path?.replace('/marketplace/', '') || item.id;
            navigation.navigate('ServiceDetails', { slug });
          }}
          onFavoriteChange={loadFavorites}
        />
      </View>
    );
  };

  const renderAdvertisement = ({ item }: { item: FavoriteAdvertisement }) => {
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
      <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <ServiceCard
          service={service}
          variant="compact"
          onPress={() => {
            const slug = item.slug || item.advertisementSlug || item.path?.replace('/marketplace/', '') || item.id;
            navigation.navigate('ServiceDetails', { slug });
          }}
          onFavoriteChange={loadFavorites}
        />
      </View>
    );
  };

  const renderBusiness = ({ item }: { item: FavoriteBusiness }) => {
    const businessId = item.businessId || item.id;
    return (
      <TouchableOpacity
        style={[styles.businessCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => {
          if (item.businessSlug) {
            navigation.navigate('ServiceDetails', { slug: item.businessSlug });
          }
        }}
        activeOpacity={0.7}
      >
        {normalizeImageUrl(item.imageUrl || item.image) ? (
          <Image
            source={{ uri: normalizeImageUrl(item.imageUrl || item.image)! }}
            style={[styles.businessImage, { backgroundColor: colors.backgroundSecondary }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.businessImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="business-outline" size={48} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.businessContent}>
          <View style={styles.businessHeader}>
            <View style={styles.businessInfo}>
              <Text style={[styles.businessName, { color: colors.text }]}>{item.businessName}</Text>
              <Text style={[styles.businessCategory, { color: colors.textSecondary }]}>{item.category}</Text>
              {item.rating && item.rating > 0 && (
                <View style={styles.businessRating}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating.toFixed(1)}</Text>
                  {item.reviewsCount && item.reviewsCount > 0 && (
                    <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({item.reviewsCount})</Text>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleRemoveFavorite('business', businessId)}
            >
              <Ionicons name="heart" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Избранное</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
              Войдите в аккаунт, чтобы сохранять услуги в избранное
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login' as any)}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 24,
              }}
            >
              <Text style={{ color: colors.buttonText, fontWeight: '600', fontSize: 16 }}>
                Войти
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  const hasFavorites = favoriteServices.length > 0 || favoriteAdvertisements.length > 0 || favoriteBusinesses.length > 0;

  if (!hasFavorites) {
    return (
      <ScreenContainer>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Избранное</Text>
          </View>
          <EmptyState
            title="Нет избранных"
            message="Добавляйте услуги, объявления и бизнесы в избранное, чтобы быстро к ним вернуться"
          />
        </View>
      </ScreenContainer>
    );
  }

  // Объединяем все элементы в один список с секциями
  const allItems: Array<{ type: 'service' | 'advertisement' | 'business'; item: any }> = [
    ...favoriteServices.map(item => ({ type: 'service' as const, item })),
    ...favoriteAdvertisements.map(item => ({ type: 'advertisement' as const, item })),
    ...favoriteBusinesses.map(item => ({ type: 'business' as const, item })),
  ];

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Избранное</Text>
          </View>
        <FlatList
          data={allItems}
          keyExtractor={(item, index) => `${item.type}-${item.item.id}-${index}`}
          renderItem={({ item }) => {
            if (item.type === 'service') {
              return renderService({ item: item.item });
            } else if (item.type === 'advertisement') {
              return renderAdvertisement({ item: item.item });
            } else {
              return renderBusiness({ item: item.item });
            }
          }}
          ListEmptyComponent={
            <EmptyState
              title="Нет избранных"
              message="Добавляйте услуги в избранное, чтобы быстро к ним вернуться"
            />
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        />
      </View>
    </ScreenContainer>
  );
};
