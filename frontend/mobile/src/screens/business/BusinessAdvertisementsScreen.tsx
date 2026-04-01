import React, { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessAdvertisements,
  updateAdvertisementVisibility,
  deleteBusinessAdvertisement,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { normalizeImageUrl } from '../../api/config';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Объявления',
  titleAds: 'Реклама',
  description: 'Управление объявлениями и рекламой',
  descriptionAds: 'Рекламные объявления вашего бизнеса',
  empty: 'Нет объявлений',
  filters: {
    all: 'Все',
    active: 'Активные',
    draft: 'Черновики',
    published: 'Опубликовано',
  },
  types: {
    regular: 'Профиль',
    advertisement: 'Реклама',
  },
  statuses: {
    draft: 'Черновик',
    pending: 'На модерации',
    active: 'Активно',
    published: 'Опубликовано',
    rejected: 'Отклонено',
    expired: 'Истекло',
  },
  visibility: 'Видимость',
  actions: {
    view: 'Просмотр',
    delete: 'Удалить',
  },
  delete: {
    title: 'Удалить объявление?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  success: {
    deleted: 'Объявление удалено',
  },
  dates: {
    from: 'с',
    to: 'по',
    noDate: '—',
  },
};

type Route = RouteProp<BusinessStackParamList, 'BusinessAdvertisements'>;
type Nav = NavigationProp<BusinessStackParamList>;
type StatusFilter = 'all' | 'active' | 'draft' | 'published';

export function BusinessAdvertisementsScreen() {
  
  const { colors } = useTheme();

  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'active':
      case 'published':
        return { bg: colors.successLight, text: colors.success };
      case 'draft':
        return { bg: colors.warningLight, text: colors.warning };
      case 'pending':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'rejected':
        return { bg: colors.errorLight, text: colors.error };
      case 'expired':
        return { bg: colors.backgroundTertiary, text: colors.textSecondary };
      default:
        return { bg: colors.backgroundTertiary, text: colors.textSecondary };
    }
  };
const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const adsOnly = route.params?.adsOnly === true;
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: adsOnly ? T.titleAds : T.title,
    });
  }, [navigation, adsOnly]);

  const query = useQuery({
    queryKey: ['business-advertisements', adsOnly],
    queryFn: () =>
      getBusinessAdvertisements({
        pageSize: 100,
        type: adsOnly ? 'advertisement' : undefined,
      }),
  });

  const list = query.data?.data ?? [];

  const filteredList = useMemo(() => {
    if (statusFilter === 'all') return list;
    if (statusFilter === 'active') return list.filter((a) => a.is_active);
    return list.filter((a) => a.status === statusFilter);
  }, [list, statusFilter]);

  const stats = useMemo(() => {
    const total = list.length;
    const active = list.filter((a) => a.is_active).length;
    const ads = list.filter((a) => a.type === 'advertisement').length;
    return { total, active, ads };
  }, [list]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const visibilityMutation = useMutation({
    mutationFn: ({ id, v }: { id: number; v: boolean }) => updateAdvertisementVisibility(id, v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-advertisements'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusinessAdvertisement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-advertisements'] });
      Alert.alert('Успех', T.success.deleted);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const confirmDelete = useCallback(
    (id: number, title: string) => {
      Alert.alert(T.delete.title, `"${title}"\n\n${T.delete.message}`, [
        { text: T.delete.cancel, style: 'cancel' },
        {
          text: T.delete.confirm,
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]);
    },
    [deleteMutation]
  );

  const handleViewDetails = useCallback(
    (id: number) => {
      navigation.navigate('BusinessAdvertisementDetail', { advertisementId: id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof list)[0] }) => {
      const statusColors = getStatusColor(item.status);
      const typeLabel = item.type === 'advertisement' ? T.types.advertisement : T.types.regular;
      const statusLabel =
        T.statuses[item.status as keyof typeof T.statuses] || item.status;

      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              {normalizeImageUrl(item.image) ? (
                <Image source={{ uri: normalizeImageUrl(item.image)! }} style={[styles.thumb, { backgroundColor: colors.backgroundSecondary }]} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons
                    name={item.type === 'advertisement' ? 'megaphone-outline' : 'document-outline'}
                    size={24}
                    color={colors.textMuted}
                  />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.tagsRow}>
                  <View style={[styles.typeTag, { backgroundColor: colors.backgroundSecondary }, item.type === 'advertisement' && { backgroundColor: colors.purpleLight }]}>
                    <Text
                      style={[
                        styles.typeTagText,
                        { color: colors.textSecondary },
                        item.type === 'advertisement' && { color: colors.purple },
                      ]}
                    >
                      {typeLabel}
                    </Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusTagText, { color: statusColors.text }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Даты */}
            {(item.start_date || item.end_date) && (
              <View style={[styles.datesRow, { borderTopColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.datesText, { color: colors.textSecondary }]}>
                  {T.dates.from} {item.start_date || T.dates.noDate} {T.dates.to}{' '}
                  {item.end_date || T.dates.noDate}
                </Text>
              </View>
            )}

            {/* Видимость */}
            <View style={[styles.visibilityRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.visibilityLabel, { color: colors.text }]}>{T.visibility}</Text>
              <Switch
                value={item.is_active}
                onValueChange={(v) => visibilityMutation.mutate({ id: item.id, v })}
                trackColor={{ false: colors.border, true: colors.successLight }}
                thumbColor={item.is_active ? colors.success : colors.textMuted}
              />
            </View>
          </View>

          <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderRightColor: colors.border }]}
              onPress={() => handleViewDetails(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>{T.actions.view}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => confirmDelete(item.id, item.title)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionBtnTextDanger, { color: colors.error }]}>{T.actions.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [visibilityMutation, confirmDelete, handleViewDetails, colors]
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
        <Text style={[styles.pageTitle, { color: colors.text }]}>{adsOnly ? T.titleAds : T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{adsOnly ? T.descriptionAds : T.description}</Text>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Активных</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.active}</Text>
          </View>
          {!adsOnly && (
            <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Реклама</Text>
              <Text style={[styles.statValue, { color: colors.purple }]}>{stats.ads}</Text>
            </View>
          )}
        </View>

        {/* Фильтры */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'active', 'draft', 'published'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                statusFilter === f && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
              ]}
              onPress={() => setStatusFilter(f)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  statusFilter === f && { color: colors.controlSelectedText },
                ]}
              >
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
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="documents-outline" size={48} color={colors.textMuted} />
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
    marginBottom: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 12,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: { fontSize: 11, fontWeight: '700' },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: { fontSize: 11, fontWeight: '700' },

  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  datesText: { fontSize: 13, fontWeight: '600' },

  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  visibilityLabel: { fontSize: 14, fontWeight: '600' },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRightWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
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
