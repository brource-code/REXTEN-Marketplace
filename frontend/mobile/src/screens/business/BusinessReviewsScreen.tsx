import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessReviews,
  updateBusinessReviewResponse,
  BusinessReview,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Отзывы',
  description: 'Отзывы клиентов о вашем бизнесе',
  empty: 'Нет отзывов',
  filters: {
    all: 'Все',
    withResponse: 'С ответом',
    withoutResponse: 'Без ответа',
  },
  rating: {
    '5': '5 звёзд',
    '4': '4 звезды',
    '3': '3 звезды',
    '2': '2 звезды',
    '1': '1 звезда',
  },
  actions: {
    reply: 'Ответить',
    editReply: 'Изменить ответ',
  },
  modal: {
    title: 'Ответ на отзыв',
    placeholder: 'Текст ответа...',
    cancel: 'Отмена',
    save: 'Сохранить',
  },
  success: {
    saved: 'Ответ сохранён',
  },
};

type Row = { review: BusinessReview; context?: string };

function flatten(data: Awaited<ReturnType<typeof getBusinessReviews>>): Row[] {
  const rows: Row[] = [];
  for (const g of data.groupedByAdvertisement) {
    for (const r of g.reviews) {
      rows.push({ review: r, context: g.advertisement.title });
    }
  }
  for (const r of data.reviewsWithoutAd) {
    rows.push({ review: r });
  }
  return rows;
}

export function BusinessReviewsScreen() {
  
  const { colors } = useTheme();

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return colors.success;
    if (rating >= 3) return colors.warning;
    return colors.error;
  };
const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [responseFilter, setResponseFilter] = useState<'all' | 'with' | 'without'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const [activeReview, setActiveReview] = useState<BusinessReview | null>(null);
  const [responseText, setResponseText] = useState('');

  const query = useQuery({
    queryKey: ['business-reviews'],
    queryFn: () => getBusinessReviews({ pageSize: 100 }),
  });

  const rows = useMemo(() => (query.data ? flatten(query.data) : []), [query.data]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (responseFilter === 'with') {
      result = result.filter((r) => !!r.review.response);
    } else if (responseFilter === 'without') {
      result = result.filter((r) => !r.review.response);
    }

    if (ratingFilter !== null) {
      result = result.filter((r) => r.review.rating === ratingFilter);
    }

    return result;
  }, [rows, responseFilter, ratingFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withResponse = rows.filter((r) => !!r.review.response).length;
    const avgRating =
      total > 0 ? (rows.reduce((sum, r) => sum + r.review.rating, 0) / total).toFixed(1) : '0.0';
    return { total, withResponse, avgRating };
  }, [rows]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const responseMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response: string }) =>
      updateBusinessReviewResponse(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-reviews'] });
      setActiveReview(null);
      setResponseText('');
      Alert.alert('Успех', T.success.saved);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const openReplyModal = useCallback((review: BusinessReview) => {
    setActiveReview(review);
    setResponseText(review.response ?? '');
  }, []);

  const saveResponse = useCallback(() => {
    if (!activeReview) return;
    responseMutation.mutate({ id: activeReview.id, response: responseText.trim() });
  }, [activeReview, responseText, responseMutation]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      const { review, context } = item;
      const hasResponse = !!review.response;

      return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardContent}>
            {/* Контекст (услуга/объявление) */}
            {context && (
              <View style={[styles.contextRow, { borderBottomColor: colors.border }]}>
                <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.contextText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {context}
                </Text>
              </View>
            )}

            {/* Заголовок: имя + рейтинг */}
            <View style={styles.headerRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {review.userName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{review.userName || 'Клиент'}</Text>
                <Text style={[styles.serviceName, { color: colors.textSecondary }]}>{review.serviceName || 'Услуга'}</Text>
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(review.rating) + '20' }]}>
                <Ionicons name="star" size={14} color={getRatingColor(review.rating)} />
                <Text style={[styles.ratingText, { color: getRatingColor(review.rating) }]}>
                  {review.rating}
                </Text>
              </View>
            </View>

            {/* Комментарий */}
            <Text style={[styles.comment, { color: colors.text }]}>{review.comment}</Text>

            {/* Ответ бизнеса */}
            {hasResponse && (
              <View style={[styles.responseBlock, { backgroundColor: colors.successLight }]}>
                <View style={styles.responseHeader}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.success} />
                  <Text style={[styles.responseLabel, { color: colors.success }]}>Ваш ответ</Text>
                </View>
                <Text style={[styles.responseText, { color: colors.successDark }]}>{review.response}</Text>
              </View>
            )}
          </View>

          {/* Действия */}
          <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderRightColor: colors.border }]}
              onPress={() => openReplyModal(review)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                {hasResponse ? T.actions.editReply : T.actions.reply}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [openReplyModal]
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

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Всего</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>С ответом</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.withResponse}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Средний</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgRating}</Text>
            </View>
          </View>
        </View>

        {/* Фильтры по ответу */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'with', 'without'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, responseFilter === f && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => setResponseFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, responseFilter === f && { color: colors.primary }]}>
                {f === 'all' ? T.filters.all : f === 'with' ? T.filters.withResponse : T.filters.withoutResponse}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Фильтры по рейтингу */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, ratingFilter === null && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={() => setRatingFilter(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, { color: colors.textSecondary }, ratingFilter === null && { color: colors.primary }]}>
              Все рейтинги
            </Text>
          </TouchableOpacity>
          {[5, 4, 3, 2, 1].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, ratingFilter === r && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => setRatingFilter(r)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="star"
                size={12}
                color={ratingFilter === r ? colors.primaryDark : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterChipText, { color: colors.textSecondary }, ratingFilter === r && { color: colors.primary }]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>Показано: {filteredRows.length}</Text>
      </View>

      {/* Список */}
      <FlatList
        data={filteredRows}
        keyExtractor={(item, index) => `review-${item.review.id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty}</Text>
          </View>
        }
      />

      {/* Модалка ответа */}
      <Modal
        visible={!!activeReview}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveReview(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setActiveReview(null)}
            activeOpacity={1}
          />
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{T.modal.title}</Text>

            {activeReview && (
              <View style={[styles.modalReviewPreview, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.modalReviewName, { color: colors.text }]}>{activeReview.userName}</Text>
                <View style={styles.modalReviewRating}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={[styles.modalReviewRatingText, { color: colors.warning }]}>{activeReview.rating}</Text>
                </View>
                <Text style={[styles.modalReviewComment, { color: colors.textSecondary }]} numberOfLines={2}>
                  {activeReview.comment}
                </Text>
              </View>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              multiline
              value={responseText}
              onChangeText={setResponseText}
              placeholder={T.modal.placeholder}
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: colors.backgroundSecondary }]} onPress={() => setActiveReview(null)}>
                <Text style={[styles.modalBtnCancelText, { color: colors.textSecondary }]}>{T.modal.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, { backgroundColor: colors.primary }, responseMutation.isPending && styles.modalBtnDisabled]}
                onPress={saveResponse}
                disabled={responseMutation.isPending}
              >
                {responseMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={[styles.modalBtnSaveText, { color: colors.buttonText }]}>{T.modal.save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  filtersScroll: { marginBottom: 8 },
  filtersContent: { gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: { fontSize: 13, fontWeight: '700' },
  filterChipTextActive: {},

  countText: { fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: { padding: 14 },

  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  contextText: { flex: 1, fontSize: 12, fontWeight: '600' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  headerInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700' },
  serviceName: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 14, fontWeight: '700' },

  comment: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  responseBlock: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: { fontSize: 12, fontWeight: '700' },
  responseText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

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
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  modalReviewPreview: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalReviewName: { fontSize: 14, fontWeight: '700' },
  modalReviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  modalReviewRatingText: { fontSize: 13, fontWeight: '700' },
  modalReviewComment: { fontSize: 13, fontWeight: '600', marginTop: 8 },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    fontWeight: '600',
    textAlignVertical: 'top',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalBtnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalBtnCancelText: { fontSize: 14, fontWeight: '700' },
  modalBtnSave: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalBtnSaveText: { fontSize: 14, fontWeight: '700' },
  modalBtnDisabled: { opacity: 0.6 },
});
