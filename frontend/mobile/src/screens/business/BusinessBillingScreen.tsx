import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getStripeTransactions, StripeTransaction } from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Транзакции',
  description: 'История платежей Stripe',
  empty: 'Нет транзакций',
  filters: {
    all: 'Все',
    succeeded: 'Успешные',
    pending: 'В обработке',
    failed: 'Неудачные',
  },
  statuses: {
    succeeded: 'Успешно',
    pending: 'В обработке',
    failed: 'Неудачно',
    canceled: 'Отменено',
  } as Record<string, string>,
  types: {
    charge: 'Оплата',
    refund: 'Возврат',
    payout: 'Выплата',
    transfer: 'Перевод',
    payment: 'Платёж',
  } as Record<string, string>,
};

type FilterType = 'all' | 'succeeded' | 'pending' | 'failed';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}.${m}.${y} ${h}:${min}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | string, currency?: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const cur = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${cur}`;
  }
}

export function BusinessBillingScreen() {
  const { colors } = useTheme();

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    succeeded: { bg: colors.successLight, text: colors.successDark },
    pending: { bg: colors.warningLight, text: colors.warning },
    failed: { bg: colors.errorLight, text: colors.error },
    canceled: { bg: colors.backgroundTertiary, text: colors.textSecondary },
  };

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['business-stripe-transactions'],
    queryFn: () => getStripeTransactions(50),
  });

  const list: StripeTransaction[] = query.data?.transactions ?? [];

  const filteredList = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((t) => t.status === filter);
  }, [list, filter]);

  const stats = useMemo(() => {
    const succeeded = list.filter((t) => t.status === 'succeeded');
    const total = succeeded.reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
    return {
      count: list.length,
      succeeded: succeeded.length,
      total,
    };
  }, [list]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const renderItem = useCallback(({ item }: { item: StripeTransaction }) => {
    const status = item.status || 'pending';
    const statusColors = STATUS_COLORS[status] || STATUS_COLORS.pending;
    const type = item.type || 'payment';
    const isPositive = type !== 'refund' && status === 'succeeded';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: isPositive ? colors.successLight : colors.backgroundTertiary }]}>
              <Ionicons
                name={type === 'refund' ? 'arrow-undo-outline' : 'card-outline'}
                size={20}
                color={isPositive ? colors.successDark : colors.textSecondary}
              />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.titleRow}>
                <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.description || T.types[type] || type}
                </Text>
                <Text style={[styles.amount, { color: isPositive ? colors.successDark : colors.text }]}>
                  {isPositive ? '+' : ''}{formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>{formatDate(item.created)}</Text>
                <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusTagText, { color: statusColors.text }]}>
                    {T.statuses[status] || status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }, [colors]);

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
      {/* Заголовок */}
      <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.count}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Успешных</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.succeeded}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Сумма</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.total, 'usd')}</Text>
          </View>
        </View>

        {/* Фильтры */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'succeeded', 'pending', 'failed'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { backgroundColor: filter === f ? colors.primaryLight : colors.backgroundSecondary, borderColor: filter === f ? colors.primary : colors.border }]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: filter === f ? colors.primary : colors.textSecondary }]}>
                {T.filters[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {filteredList.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={filteredList}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty}</Text>
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
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 12 },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  statCardWide: { flex: 1.5 },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },

  filtersScroll: { marginBottom: 8 },
  filtersContent: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  countText: { fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardContent: { padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  transactionTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionDate: { fontSize: 13, fontWeight: '600' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTagText: { fontSize: 11, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
});
