import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';
import { isClientAppRole } from '../constants/roles';
import { getClientBookings, ClientBooking } from '../api/client';

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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bookingCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingServiceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    marginBottom: 8,
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 16,
  },
});

export const BookingsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const isClient = isClientAppRole(user?.role);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isClient) {
      loadBookings();
    } else {
      setIsLoading(false);
      setBookings([]);
    }
  }, [activeTab, isAuthenticated, isClient]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await getClientBookings({
        upcoming: activeTab === 'upcoming',
      });
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBookings();
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending_confirmation':
        return { backgroundColor: colors.warningLight, color: colors.warning };
      case 'confirmed':
      case 'accepted':
        return { backgroundColor: colors.successLight, color: colors.success };
      case 'cancelled':
      case 'rejected':
        return { backgroundColor: colors.errorLight, color: colors.error };
      default:
        return { backgroundColor: colors.warningLight, color: colors.warning };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending_confirmation':
        return 'Ожидает подтверждения';
      case 'confirmed':
      case 'accepted':
        return 'Подтверждено';
      case 'cancelled':
      case 'rejected':
        return 'Отменено';
      default:
        return status || 'Неизвестно';
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Мои бронирования</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
              Войдите в аккаунт, чтобы просматривать свои бронирования
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

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Мои бронирования</Text>
        </View>

        {/* Табы */}
        <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('upcoming')}
            style={[
              styles.tabButton,
              { borderBottomColor: activeTab === 'upcoming' ? colors.primary : 'transparent' },
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'upcoming' ? colors.primary : colors.textSecondary },
              ]}
            >
              Предстоящие
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('past')}
            style={[
              styles.tabButton,
              { borderBottomColor: activeTab === 'past' ? colors.primary : 'transparent' },
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'past' ? colors.primary : colors.textSecondary },
              ]}
            >
              Прошлые
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={bookings}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={({ item }) => (
            <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.bookingHeader}>
                <Text style={[styles.bookingServiceName, { color: colors.text }]}>{item.serviceName || 'Услуга'}</Text>
                <View style={[styles.bookingStatus, getStatusStyle(item.status)]}>
                  <Text style={getStatusStyle(item.status)}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.bookingDate, { color: colors.textSecondary }]}>
                  {item.bookingDate ? new Date(item.bookingDate).toLocaleDateString('ru-RU') : 'Дата не указана'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>
                  {item.bookingTime || 'Время не указано'}
                </Text>
              </View>
              {item.price && (
                <Text style={[styles.bookingPrice, { color: colors.text }]}>
                  {item.price}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title={activeTab === 'upcoming' ? 'Нет предстоящих бронирований' : 'Нет прошлых бронирований'}
              message={activeTab === 'upcoming' ? 'Забронируйте услугу, чтобы она появилась здесь' : 'Здесь будут отображаться завершенные бронирования'}
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

