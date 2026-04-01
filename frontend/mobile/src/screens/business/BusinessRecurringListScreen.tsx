import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getRecurringBookings, deleteRecurringBooking, RecurringBookingChain } from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';

const T = {
  title: 'Повторяющиеся брони',
  description: 'Управление регулярными бронированиями',
  hint: 'Свайп влево для удаления',
  stats: {
    total: 'Всего',
    active: 'Активных',
    paused: 'На паузе',
  },
  filters: {
    all: 'Все',
    active: 'Активные',
    paused: 'На паузе',
    cancelled: 'Отменённые',
  },
  card: {
    client: 'Клиент',
    time: 'Время',
    frequency: 'Частота',
    period: 'Период',
    upcoming: 'Ближайшие',
    indefinitely: 'бессрочно',
    notSpecified: 'Не указан',
  },
  frequencies: {
    daily: 'Ежедневно',
    every_n_days: 'Каждые N дней',
    weekly: 'Еженедельно',
    biweekly: 'Раз в 2 недели',
    every_2_weeks: 'Каждые 2 недели',
    every_3_weeks: 'Каждые 3 недели',
    monthly: 'Ежемесячно',
    bimonthly: '2 раза в месяц',
    every_2_months: 'Каждые 2 месяца',
    every_3_months: 'Каждые 3 месяца',
  },
  statuses: {
    active: 'Активна',
    paused: 'На паузе',
    cancelled: 'Отменена',
  },
  empty: 'Нет повторяющихся броней',
  emptyHint: 'Создайте повторяющуюся бронь в расписании',
  actions: {
    delete: 'Удалить',
  },
  deleteConfirm: {
    title: 'Удалить цепочку?',
    message: 'Все будущие брони этой цепочки будут удалены.',
  },
};

type StatusFilter = 'all' | 'active' | 'paused' | 'cancelled';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function getFrequencyLabel(chain: RecurringBookingChain): string {
  const freq = chain.frequency;
  const labels: Record<string, string> = T.frequencies;
  let label = labels[freq] || freq;

  if (freq === 'every_n_days' && (chain as any).interval_days) {
    label = `Каждые ${(chain as any).interval_days} дн.`;
  }

  return label;
}

export function BusinessRecurringListScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['business-recurring'],
    queryFn: getRecurringBookings,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-recurring'] });
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const confirmDelete = (item: RecurringBookingChain) => {
    Alert.alert(T.deleteConfirm.title, T.deleteConfirm.message, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const chains = query.data ?? [];

  const stats = useMemo(() => {
    const total = chains.length;
    const active = chains.filter((c) => c.status === 'active').length;
    const paused = chains.filter((c) => c.status === 'paused').length;
    return { total, active, paused };
  }, [chains]);

  const filteredChains = useMemo(() => {
    if (statusFilter === 'all') return chains;
    return chains.filter((c) => c.status === statusFilter);
  }, [chains, statusFilter]);

  const getStatusColor = useCallback((status: string): { bg: string; text: string } => {
    switch (status) {
      case 'active':
        return { bg: colors.successLight, text: colors.success };
      case 'paused':
        return { bg: colors.warningLight, text: colors.warning };
      case 'cancelled':
        return { bg: colors.errorLight, text: colors.error };
      default:
        return { bg: colors.backgroundTertiary, text: colors.textSecondary };
    }
  }, [colors]);

  const renderItem = ({ item }: { item: RecurringBookingChain }) => {
    const statusColors = getStatusColor(item.status);
    const upcomingBookings = (item as any).upcoming_bookings ?? [];

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.service?.name ?? 'Услуга'}
              </Text>
              <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusTagText, { color: statusColors.text }]}>
                  {T.statuses[item.status as keyof typeof T.statuses] || item.status}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{getFrequencyLabel(item)}</Text>
          </View>

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{T.card.client}</Text>
              <View style={styles.detailValue}>
                <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                  {item.client_name || T.card.notSpecified}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{T.card.time}</Text>
              <View style={styles.detailValue}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>{formatTime(item.booking_time)}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{T.card.period}</Text>
              <View style={styles.detailValue}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {formatDate(item.start_date)}
                  {item.end_date ? ` — ${formatDate(item.end_date)}` : ` (${T.card.indefinitely})`}
                </Text>
              </View>
            </View>
          </View>

          {/* Upcoming bookings */}
          {upcomingBookings.length > 0 && (
            <View style={[styles.upcomingSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.upcomingLabel, { color: colors.textMuted }]}>{T.card.upcoming}:</Text>
              <View style={styles.upcomingTags}>
                {upcomingBookings.slice(0, 5).map((b: any) => (
                  <View key={b.id} style={[styles.upcomingTag, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.upcomingTagText, { color: colors.primary }]}>{formatDate(b.booking_date)}</Text>
                  </View>
                ))}
                {upcomingBookings.length > 5 && (
                  <View style={[styles.upcomingTag, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.upcomingTagTextMore, { color: colors.textSecondary }]}>+{upcomingBookings.length - 5}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtnDanger, { backgroundColor: colors.errorLight }]}
            onPress={() => confirmDelete(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnDangerText, { color: colors.error }]}>{T.actions.delete}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (query.isLoading && !query.data) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['bottom']}>
      {/* Header */}
      <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.total}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.active}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.paused}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.paused}</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {(['all', 'active', 'paused', 'cancelled'] as StatusFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                statusFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setStatusFilter(filter)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  statusFilter === filter && { color: colors.buttonText },
                ]}
              >
                {T.filters[filter]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredChains}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Ionicons name="repeat-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{T.empty}</Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>{T.emptyHint}</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerFixed: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 32 },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: { padding: 14 },

  cardHeader: { marginBottom: 12 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, fontWeight: '600' },

  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusTagText: { fontSize: 11, fontWeight: '700' },

  detailsGrid: {
    gap: 10,
  },
  detailItem: {},
  detailLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: { fontSize: 14, fontWeight: '600' },

  upcomingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  upcomingLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  upcomingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  upcomingTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upcomingTagText: { fontSize: 11, fontWeight: '700' },
  upcomingTagTextMore: { fontSize: 11, fontWeight: '700' },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionBtnDangerText: { fontSize: 14, fontWeight: '700' },

  emptyBlock: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptyHint: { fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
});
