import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessNotifications,
  markBusinessNotificationAsRead,
  markAllBusinessNotificationsAsRead,
  BusinessNotification,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Входящие',
  description: 'Уведомления о событиях',
  markAllRead: 'Прочитать все',
  empty: 'Нет уведомлений',
  filters: {
    all: 'Все',
    unread: 'Непрочитанные',
    read: 'Прочитанные',
  },
};

type FilterType = 'all' | 'unread' | 'read';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}.${m}`;
  } catch {
    return dateStr;
  }
}

export function BusinessNotificationsInboxScreen() {
  
  const { colors } = useTheme();
const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['business-notifications-inbox'],
    queryFn: getBusinessNotifications,
  });

  const data = query.data ?? [];

  const filteredData = useMemo(() => {
    if (filter === 'all') return data;
    if (filter === 'unread') return data.filter((n) => !n.read);
    return data.filter((n) => n.read);
  }, [data, filter]);

  const stats = useMemo(() => {
    return {
      total: data.length,
      unread: data.filter((n) => !n.read).length,
    };
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const readMutation = useMutation({
    mutationFn: markBusinessNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-notifications-inbox'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllBusinessNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-notifications-inbox'] }),
  });

  const renderItem = useCallback(
    ({ item }: { item: BusinessNotification }) => {
      const isUnread = !item.read;

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, isUnread && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
          onPress={() => isUnread && readMutation.mutate(item.id)}
          activeOpacity={0.75}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: isUnread ? colors.primaryLight : colors.backgroundSecondary }]}>
                <Ionicons
                  name={isUnread ? 'notifications' : 'notifications-outline'}
                  size={18}
                  color={isUnread ? colors.primaryDark : colors.textSecondary}
                />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <Text style={[styles.notifTitle, { color: colors.text }, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.notifMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={[styles.notifTime, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [readMutation, colors]
  );

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
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
            <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>
          </View>
          {stats.unread > 0 && (
            <TouchableOpacity
              style={[styles.markAllBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => readAllMutation.mutate()}
              activeOpacity={0.8}
              disabled={readAllMutation.isPending}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
              <Text style={[styles.markAllBtnText, { color: colors.primary }]}>{T.markAllRead}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, stats.unread > 0 && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Непрочитанных</Text>
            <Text style={[styles.statValue, { color: colors.text }, stats.unread > 0 && { color: colors.primaryDark }]}>
              {stats.unread}
            </Text>
          </View>
        </View>

        {/* Фильтры */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, filter === f && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, filter === f && { color: colors.primary }]}>
                {T.filters[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {filteredData.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  titleCol: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  markAllBtnText: { fontSize: 13, fontWeight: '700' },

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
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '700' },

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
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notifTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  notifTitleUnread: { fontWeight: '700' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifMessage: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  notifTime: { fontSize: 12, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
});
