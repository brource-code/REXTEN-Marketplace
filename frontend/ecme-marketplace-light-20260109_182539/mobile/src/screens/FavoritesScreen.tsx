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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginBottom: 16,
  },
  businessImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f3f4f6',
  },
  businessImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#f3f4f6',
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
    color: '#111827',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#111827',
  },
  ratingCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  favoriteButton: {
    padding: 8,
  },
});

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useAuth();
  const [favoriteServices, setFavoriteServices] = useState<FavoriteService[]>([]);
  const [favoriteAdvertisements, setFavoriteAdvertisements] = useState<FavoriteAdvertisement[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<FavoriteBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

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
      <View style={styles.listItem}>
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
      <View style={styles.listItem}>
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
        style={styles.businessCard}
        onPress={() => {
          if (item.businessSlug) {
            navigation.navigate('ServiceDetails', { slug: item.businessSlug });
          }
        }}
        activeOpacity={0.7}
      >
        {item.imageUrl || item.image ? (
          <Image
            source={{ uri: item.imageUrl || item.image }}
            style={styles.businessImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.businessImagePlaceholder}>
            <Ionicons name="business-outline" size={48} color="#9ca3af" />
          </View>
        )}
        <View style={styles.businessContent}>
          <View style={styles.businessHeader}>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{item.businessName}</Text>
              <Text style={styles.businessCategory}>{item.category}</Text>
              {item.rating && item.rating > 0 && (
                <View style={styles.businessRating}>
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                  {item.reviewsCount && item.reviewsCount > 0 && (
                    <Text style={styles.ratingCount}>({item.reviewsCount})</Text>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleRemoveFavorite('business', businessId)}
            >
              <Ionicons name="heart" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Избранное</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
              Войдите в аккаунт, чтобы сохранять услуги в избранное
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login' as any)}
              style={{
                backgroundColor: '#2563eb',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 24,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Избранное</Text>
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Избранное</Text>
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
