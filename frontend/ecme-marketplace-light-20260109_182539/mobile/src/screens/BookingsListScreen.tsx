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
import { getClientBookings, ClientBooking } from '../api/client';

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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
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
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#111827',
    flex: 1,
  },
  bookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: '500',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusConfirmed: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  bookingDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  listContent: {
    paddingVertical: 16,
  },
});

export const BookingsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings();
    } else {
      setIsLoading(false);
    }
  }, [activeTab, isAuthenticated]);

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
        return styles.statusPending;
      case 'confirmed':
      case 'accepted':
        return styles.statusConfirmed;
      case 'cancelled':
      case 'rejected':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Мои бронирования</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
              Войдите в аккаунт, чтобы просматривать свои бронирования
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

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Мои бронирования</Text>
        </View>

        {/* Табы */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('upcoming')}
            style={[
              styles.tabButton,
              activeTab === 'upcoming' ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'upcoming' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
              ]}
            >
              Предстоящие
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('past')}
            style={[
              styles.tabButton,
              activeTab === 'past' ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'past' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
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
            <View style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingServiceName}>{item.serviceName || 'Услуга'}</Text>
                <View style={[styles.bookingStatus, getStatusStyle(item.status)]}>
                  <Text style={getStatusStyle(item.status)}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="calendar-outline" size={14} color="#6b7280" style={{ marginRight: 6 }} />
                <Text style={styles.bookingDate}>
                  {item.bookingDate ? new Date(item.bookingDate).toLocaleDateString('ru-RU') : 'Дата не указана'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="time-outline" size={14} color="#6b7280" style={{ marginRight: 6 }} />
                <Text style={styles.bookingTime}>
                  {item.bookingTime || 'Время не указано'}
                </Text>
              </View>
              {item.price && (
                <Text style={styles.bookingPrice}>
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

