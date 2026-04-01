import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getPortfolioItems, deletePortfolioItem, PortfolioItem } from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { normalizeImageUrl } from '../../api/config';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Портфолио',
  description: 'Галерея ваших работ',
  empty: 'Портфолио пусто',
  hint: 'Загрузка новых работ доступна через веб-кабинет',
  filters: {
    all: 'Все',
  },
  actions: {
    delete: 'Удалить',
  },
  delete: {
    title: 'Удалить работу?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  success: {
    deleted: 'Работа удалена',
  },
};

export function BusinessPortfolioScreen() {
  
  const { colors } = useTheme();
const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['business-portfolio'],
    queryFn: getPortfolioItems,
  });

  const list = query.data ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    list.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats)];
  }, [list]);

  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredList = useMemo(() => {
    if (categoryFilter === 'all') return list;
    return list.filter((item) => item.category === categoryFilter);
  }, [list, categoryFilter]);

  const stats = useMemo(() => {
    return {
      total: list.length,
      categories: categories.length - 1,
    };
  }, [list, categories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const deleteMutation = useMutation({
    mutationFn: deletePortfolioItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-portfolio'] });
      Alert.alert('Успех', T.success.deleted);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const confirmDelete = useCallback(
    (item: PortfolioItem) => {
      Alert.alert(T.delete.title, `"${item.title}"\n\n${T.delete.message}`, [
        { text: T.delete.cancel, style: 'cancel' },
        {
          text: T.delete.confirm,
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]);
    },
    [deleteMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: PortfolioItem }) => {
      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              {normalizeImageUrl(item.image) ? (
                <Image source={{ uri: normalizeImageUrl(item.image)! }} style={[styles.thumb, { backgroundColor: colors.backgroundSecondary }]} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.category && (
                  <View style={[styles.categoryTag, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.categoryTagText, { color: colors.textSecondary }]}>{item.category}</Text>
                  </View>
                )}
                {item.description && (
                  <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => confirmDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionBtnTextDanger, { color: colors.error }]}>{T.actions.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [confirmDelete, colors]
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
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>

        {/* Подсказка */}
        <View style={[styles.hintCard, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.primaryDark }]}>{T.hint}</Text>
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего работ</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Категорий</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.categories}</Text>
          </View>
        </View>

        {/* Фильтры по категориям */}
        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, categoryFilter === cat && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => setCategoryFilter(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: colors.textSecondary }, categoryFilter === cat && { color: colors.primary }]}>
                  {cat === 'all' ? T.filters.all : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {filteredList.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="images-outline" size={48} color={colors.textMuted} />
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

  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  hintText: { flex: 1, fontSize: 13, fontWeight: '600' },

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
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: { padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryTagText: { fontSize: 11, fontWeight: '700' },
  itemDesc: { fontSize: 13, fontWeight: '600' },

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
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
});
