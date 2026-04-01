import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getBusinessBookings, BusinessBooking } from '../../api/business';
import { useBusiness } from '../../contexts/BusinessContext';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';
import { useTheme } from '../../contexts/ThemeContext';

type Nav = NativeStackNavigationProp<BusinessStackParamList>;

const T = {
  title: 'Бронирования',
  subtitle: 'Управление записями клиентов',
  searchPlaceholder: 'Поиск по клиенту или услуге',
  empty: 'Нет бронирований',
  newBooking: 'Новая запись',
  filters: {
    all: 'Все',
    new: 'Новые',
    pending: 'Ожидание',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
  },
  stats: {
    total: 'Всего',
    inProgress: 'В работе',
    completed: 'Завершено',
    revenue: 'Выручка',
  },
  client: 'Клиент',
  specialist: 'Специалист',
  serviceFallback: 'Услуга',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  pending: 'Ожидание',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  cancelled: 'Отменено',
};


type StatusFilter = 'all' | 'new' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}.${m}.${y}`;
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
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

export function BusinessBookingsListScreen() {
  const navigation = useNavigation<Nav>();
  const { isReady, isLoading: bootLoading, error: bootError, profile } = useBusiness();
  const { colors } = useTheme();
  const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = useMemo(() => ({
    new: { bg: colors.primaryLight, text: colors.primaryDark, border: colors.primary },
    pending: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
    confirmed: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
    completed: { bg: colors.successLight, text: colors.successDark, border: colors.success },
    cancelled: { bg: colors.errorLight, text: colors.error, border: colors.error },
  }), [colors]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const canManage =
    !profile?.permissions?.length || profile.permissions.includes('manage_schedule');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ['business-bookings', statusFilter],
    queryFn: () =>
      getBusinessBookings({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: isReady && !!profile,
  });

  const filteredList = useMemo(() => {
    const list = query.data ?? [];
    if (!debouncedSearch) return list;
    const q = debouncedSearch.toLowerCase();
    return list.filter(
      (b) =>
        b.client?.name?.toLowerCase().includes(q) ||
        b.service?.name?.toLowerCase().includes(q) ||
        b.client?.phone?.includes(q) ||
        b.client?.email?.toLowerCase().includes(q)
    );
  }, [query.data, debouncedSearch]);

  const stats = useMemo(() => {
    const list = query.data ?? [];
    const inProgress = list.filter(
      (b) => b.status === 'new' || b.status === 'pending' || b.status === 'confirmed'
    ).length;
    const completed = list.filter((b) => b.status === 'completed').length;
    const revenue = list
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price ?? b.price ?? 0), 0);
    return { total: list.length, inProgress, completed, revenue };
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const handleNewBooking = useCallback(() => {
    navigation.navigate('BusinessSchedule');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: BusinessBooking }) => {
      const st = item.status || 'new';
      const statusStyle = STATUS_STYLE[st] ?? STATUS_STYLE.new;
      const totalPrice = item.total_price ?? item.price ?? 0;

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('BusinessBookingDetail', { bookingId: item.id })}
          activeOpacity={0.75}
        >
          {/* Заголовок карточки */}
          <View style={styles.cardHeader}>
            <Text style={[styles.cardId, { color: colors.text }]}>#{item.id}</Text>
            <View style={[styles.statusTag, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusTagText, { color: statusStyle.text }]}>
                {STATUS_LABEL[st] ?? st}
              </Text>
            </View>
            <Text style={[styles.cardAmount, { color: colors.text }]}>{formatCurrency(totalPrice)}</Text>
          </View>

          {/* Услуга */}
          <Text style={[styles.serviceName, { color: colors.primary }]} numberOfLines={2}>
            {item.service?.name ?? T.serviceFallback}
          </Text>

          {/* Дата и время */}
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatDate(item.booking_date)} · {formatTime(item.booking_time)}
            </Text>
            {item.duration_minutes > 0 && (
              <Text style={[styles.duration, { color: colors.textSecondary }]}>({item.duration_minutes} мин)</Text>
            )}
          </View>

          {/* Клиент */}
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.clientName, { color: colors.primary }]} numberOfLines={1}>
              {item.client?.name ?? T.client}
            </Text>
            {item.client?.phone && (
              <Text style={[styles.clientPhone, { color: colors.text }]}>{item.client.phone}</Text>
            )}
          </View>

          {/* Специалист */}
          {item.specialist && (
            <View style={styles.metaRow}>
              <Ionicons name="briefcase-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.specialistName, { color: colors.text }]}>{item.specialist.name}</Text>
            </View>
          )}

          {/* Доп. услуги */}
          {item.additional_services && item.additional_services.length > 0 && (
            <View style={styles.additionalRow}>
              <Ionicons name="add-circle-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.additionalText, { color: colors.textSecondary }]}>
                +{item.additional_services.length} доп. услуг
              </Text>
            </View>
          )}

          {/* Скидка */}
          {item.discount_amount && item.discount_amount > 0 && (
            <View style={styles.discountRow}>
              <Ionicons name="pricetag-outline" size={14} color={colors.success} />
              <Text style={[styles.discountText, { color: colors.success }]}>
                Скидка: {formatCurrency(item.discount_amount)}
                {item.discount_tier_name && ` (${item.discount_tier_name})`}
              </Text>
            </View>
          )}

          {/* Заметки */}
          {item.notes && (
            <View style={[styles.notesRow, { borderTopColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [navigation, colors]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        {/* Заголовок и кнопка */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
            <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.subtitle}</Text>
          </View>
          {canManage && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleNewBooking} activeOpacity={0.8}>
              <Ionicons name="add-outline" size={18} color={colors.buttonText} />
              <Text style={[styles.addBtnText, { color: colors.buttonText }]}>{T.newBooking}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.total}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.inProgress}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.inProgress}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.completed}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.revenue}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.revenue)}</Text>
          </View>
        </View>

        {/* Поиск */}
        <View style={[styles.searchWrap, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={T.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Фильтры по статусу */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'new', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map(
            (f) => {
              const isActive = statusFilter === f;
              const filterColors = f !== 'all' ? STATUS_STYLE[f] : null;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                    isActive && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                    isActive && filterColors && { borderColor: filterColors.border },
                  ]}
                  onPress={() => setStatusFilter(f)}
                  activeOpacity={0.8}
                >
                  {f !== 'all' && (
                    <View
                      style={[styles.filterDot, { backgroundColor: STATUS_STYLE[f]?.border }]}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.textSecondary },
                      isActive && { color: colors.controlSelectedText },
                    ]}
                  >
                    {T.filters[f]}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {/* Счётчик */}
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          Показано: {filteredList.length}
          {statusFilter !== 'all' && ` (${T.filters[statusFilter].toLowerCase()})`}
        </Text>
      </View>
    ),
    [search, statusFilter, stats, canManage, handleNewBooking, filteredList.length, colors]
  );

  if (bootLoading || !isReady) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (bootError) {
    return (
      <ScreenContainer>
        <View style={styles.padded}>
          <Text style={[styles.errorText, { color: colors.error }]}>{bootError.message}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (query.isLoading && !query.data) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={filteredList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty}</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padded: { padding: 16 },
  errorText: { fontSize: 16, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  headerBlock: { paddingTop: 12, paddingBottom: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  titleCol: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '700', marginTop: 4 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  clearBtn: { padding: 4 },

  filtersScroll: { marginBottom: 12 },
  filtersContent: { gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    borderWidth: 2,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  filterChipTextActive: {},

  countText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  cardId: { fontSize: 14, fontWeight: '700' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  cardAmount: { marginLeft: 'auto', fontSize: 15, fontWeight: '700' },

  serviceName: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: { fontSize: 13, fontWeight: '700' },
  duration: { fontSize: 12, fontWeight: '600' },
  clientName: { fontSize: 14, fontWeight: '700', flex: 1 },
  clientPhone: { fontSize: 12, fontWeight: '700' },
  specialistName: { fontSize: 13, fontWeight: '700' },

  additionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  additionalText: { fontSize: 12, fontWeight: '600' },

  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  discountText: { fontSize: 12, fontWeight: '700' },

  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  notesText: { fontSize: 12, fontWeight: '600', flex: 1 },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
});
