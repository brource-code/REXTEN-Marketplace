import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getBusinessClients, BusinessClient } from '../../api/business';
import { useBusiness } from '../../contexts/BusinessContext';
import { PageLayout, FilterChip } from '../../components/layout';
import { Card } from '../../components/ui';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';
import { ClientCreateModal } from '../../components/business/ClientCreateModal';
import { ClientEditModal } from '../../components/business/ClientEditModal';
import { useTheme } from '../../contexts/ThemeContext';

type Nav = NativeStackNavigationProp<BusinessStackParamList>;

const T = {
  title: 'Клиенты',
  description: 'Управление базой клиентов',
  searchPlaceholder: 'Поиск по имени, email или телефону',
  addClient: 'Добавить',
  noClients: 'Клиенты не найдены',
  bookings: 'Бронирований',
  spent: 'Потрачено',
  lastVisit: 'Последний визит',
  details: 'Подробнее',
  edit: 'Изменить',
  statuses: {
    regular: 'Обычный',
    permanent: 'Постоянный',
    vip: 'VIP',
  } as Record<string, string>,
  total: 'Всего',
};

const FILTERS: FilterChip[] = [
  { id: 'all', label: 'Все' },
  { id: 'regular', label: 'Обычные' },
  { id: 'permanent', label: 'Постоянные' },
  { id: 'vip', label: 'VIP' },
];

const STATUS_BADGE: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  regular: 'default',
  regular_client: 'default',
  permanent: 'primary',
  permanent_client: 'primary',
  vip: 'warning',
  vip_client: 'warning',
};

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  } catch {
    return '—';
  }
}

function formatCurrency(value: number | undefined | null): string {
  const num = typeof value === 'number' ? value : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `$${Math.round(num)}`;
  }
}

function getStatusLabel(status: string | undefined): string {
  const normalized = (status || 'regular').replace('_client', '');
  return T.statuses[normalized] || T.statuses.regular;
}

export function BusinessClientsListScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { isReady, isLoading: bootLoading, error: bootError, profile } = useBusiness();
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<BusinessClient | null>(null);

  const canManage =
    !profile?.permissions?.length || profile.permissions.includes('manage_clients');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ['business-clients', debouncedSearch, statusFilter],
    queryFn: () =>
      getBusinessClients({
        page: 1,
        pageSize: 100,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: isReady && !!profile,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const handleViewDetails = useCallback(
    (client: BusinessClient) => {
      navigation.navigate('BusinessClientDetail', { clientId: client.id });
    },
    [navigation]
  );

  const handleEdit = useCallback((client: BusinessClient) => {
    setEditingClient(client);
    setEditModalVisible(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['business-clients'] });
  }, [queryClient]);

  const handleEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['business-clients'] });
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: BusinessClient }) => {
      const status = item.status || 'regular';
      const badgeColor = STATUS_BADGE[status] || 'default';

      return (
        <Card compact>
          <Card.Header
            avatar={getInitials(item.name)}
            title={item.name}
            subtitle={item.email || item.phone || undefined}
            badge={{ label: getStatusLabel(status), color: badgeColor }}
          />
          <Card.Stats
            items={[
              { label: T.bookings, value: item.totalBookings || 0 },
              { label: T.spent, value: formatCurrency(item.totalSpent) },
              { label: T.lastVisit, value: formatDate(item.lastVisit) },
            ]}
          />
          <Card.Actions>
            <Card.Action
              icon="eye-outline"
              label={T.details}
              onPress={() => handleViewDetails(item)}
            />
            {canManage && (
              <Card.Action
                icon="create-outline"
                label={T.edit}
                onPress={() => handleEdit(item)}
                variant="secondary"
              />
            )}
          </Card.Actions>
        </Card>
      );
    },
    [handleViewDetails, handleEdit, canManage]
  );

  const isLoading = bootLoading || !isReady || (query.isLoading && !query.data);
  const errorMessage = bootError?.message || null;
  const list = query.data?.data ?? [];

  return (
    <>
      <PageLayout
        title={T.title}
        description={T.description}
        action={
          canManage
            ? {
                icon: 'person-add-outline',
                label: T.addClient,
                onPress: () => setCreateModalVisible(true),
              }
            : undefined
        }
        search={{
          placeholder: T.searchPlaceholder,
          value: search,
          onChangeText: setSearch,
        }}
        filters={FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        count={query.data?.total}
        countLabel={T.total}
        isLoading={isLoading}
        error={errorMessage}
      >
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {T.noClients}
              </Text>
            </View>
          }
        />
      </PageLayout>

      <ClientCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      <ClientEditModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
});
