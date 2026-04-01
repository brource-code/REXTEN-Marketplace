import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  getClientDetails,
  addClientNote,
  deleteClient,
  ClientNote,
  ClientBooking,
  ClientSummary,
  BusinessClient,
} from '../../api/business';
import { useBusiness } from '../../contexts/BusinessContext';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ClientEditModal } from '../../components/business/ClientEditModal';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';
import { useTheme } from '../../contexts/ThemeContext';

type Route = RouteProp<BusinessStackParamList, 'BusinessClientDetail'>;
type Nav = NativeStackNavigationProp<BusinessStackParamList>;

const T = {
  title: 'Детали клиента',
  tabs: {
    info: 'Информация',
    bookings: 'Бронирования',
    notes: 'Заметки',
  },
  profile: {
    email: 'Email',
    phone: 'Телефон',
    address: 'Адрес',
    lastVisit: 'Последний визит',
  },
  stats: {
    current: 'Текущие',
    completed: 'Завершённые',
    cancelled: 'Отменённые',
    spent: 'Потрачено',
  },
  summary: {
    title: 'Сводка',
    firstVisit: 'Первый визит',
    averageCheck: 'Средний чек',
    conversionRate: 'Конверсия',
    favoriteService: 'Любимая услуга',
    favoriteSpecialist: 'Любимый специалист',
    visitFrequency: 'Частота визитов',
    perMonth: 'раз/мес',
  },
  bookings: {
    noBookings: 'Нет бронирований',
    total: 'Итого',
    specialist: 'Специалист',
  },
  notes: {
    title: 'Заметки',
    noNotes: 'Нет заметок',
    addNote: 'Добавить заметку',
    placeholder: 'Текст заметки...',
    add: 'Добавить',
  },
  actions: {
    edit: 'Редактировать',
    delete: 'Удалить',
  },
  statuses: {
    regular: 'Обычный',
    permanent: 'Постоянный',
    vip: 'VIP',
  } as Record<string, string>,
  bookingStatuses: {
    new: 'Новый',
    pending: 'Ожидание',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
  } as Record<string, string>,
  deleteConfirm: {
    title: 'Удалить клиента?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  errors: {
    noteError: 'Не удалось добавить заметку',
    deleteError: 'Не удалось удалить клиента',
  },
  success: {
    noteAdded: 'Заметка добавлена',
    deleted: 'Клиент удалён',
  },
};


type TabKey = 'info' | 'bookings' | 'notes';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
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

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}.${m}.${y} ${h}:${min}`;
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

export function BusinessClientDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { clientId } = route.params;
  const { profile } = useBusiness();
  const { colors } = useTheme();
  const STATUS_COLORS: Record<string, { bg: string; text: string }> = useMemo(() => ({
    regular: { bg: colors.border, text: colors.textSecondary },
    regular_client: { bg: colors.border, text: colors.textSecondary },
    permanent: { bg: colors.primaryLight, text: colors.primaryDark },
    permanent_client: { bg: colors.primaryLight, text: colors.primaryDark },
    vip: { bg: colors.warningLight, text: colors.warning },
    vip_client: { bg: colors.warningLight, text: colors.warning },
  }), [colors]);

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [noteText, setNoteText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const canManage =
    !profile?.permissions?.length || profile.permissions.includes('manage_clients');

  const query = useQuery({
    queryKey: ['business-client', clientId],
    queryFn: () => getClientDetails(clientId),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => addClientNote(clientId, note),
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['business-client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      Alert.alert(T.success.noteAdded);
    },
    onError: () => Alert.alert('Ошибка', T.errors.noteError),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-clients'] });
      Alert.alert(T.success.deleted);
      navigation.goBack();
    },
    onError: () => Alert.alert('Ошибка', T.errors.deleteError),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const handleDelete = useCallback(() => {
    Alert.alert(T.deleteConfirm.title, T.deleteConfirm.message, [
      { text: T.deleteConfirm.cancel, style: 'cancel' },
      {
        text: T.deleteConfirm.confirm,
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  }, [deleteMutation]);

  const handleEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['business-client', clientId] });
    queryClient.invalidateQueries({ queryKey: ['business-clients'] });
  }, [queryClient, clientId]);

  const client = query.data?.client;
  const summary = query.data?.summary;
  const bookings = query.data?.bookings ?? [];
  const notes = query.data?.notes ?? [];

  const bookingsStats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending' || b.status === 'new').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const completed = summary?.completedBookings ?? bookings.filter((b) => b.status === 'completed').length;
    const cancelled = summary?.cancelledBookings ?? bookings.filter((b) => b.status === 'cancelled').length;
    return { current: pending + confirmed, completed, cancelled };
  }, [bookings, summary]);

  const totalSpent = summary?.totalSpent ?? client?.totalSpent ?? 0;

  if (query.isLoading || !client) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const status = client.status || 'regular';
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.regular;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Профиль */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(client.name)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.clientName, { color: colors.text }]}>{client.name}</Text>
              <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusTagText, { color: statusColors.text }]}>
                  {getStatusLabel(status)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.contactList}>
            {client.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.text }]}>{client.email}</Text>
              </View>
            )}
            {client.phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.text }]}>{client.phone}</Text>
              </View>
            )}
            {client.address && (
              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.text }]}>{client.address}</Text>
              </View>
            )}
            {client.lastVisit && (
              <View style={styles.contactRow}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>{T.profile.lastVisit}: </Text>
                <Text style={[styles.contactText, { color: colors.text }]}>{formatDate(client.lastVisit)}</Text>
              </View>
            )}
          </View>

          {canManage && (
            <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder }]}
                onPress={() => setEditModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>{T.actions.edit}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnDanger, { backgroundColor: colors.errorLight, borderColor: colors.errorLight }]}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionBtnTextDanger, { color: colors.error }]}>{T.actions.delete}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Статистика */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.current}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{bookingsStats.current}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.completed}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{bookingsStats.completed}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.cancelled}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{bookingsStats.cancelled}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{T.stats.spent}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(totalSpent)}</Text>
          </View>
        </View>

        {/* Табы */}
        <View style={[styles.tabsRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
          {(['info', 'bookings', 'notes'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                { backgroundColor: 'transparent' },
                activeTab === tab && { backgroundColor: colors.card },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === tab && { color: colors.text, fontWeight: '700' },
              ]}>
                {T.tabs[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Контент табов */}
        {activeTab === 'info' && summary && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{T.summary.title}</Text>
            <View style={styles.summaryGrid}>
              <SummaryRow label={T.summary.firstVisit} value={formatDate(summary.firstVisit)} />
              <SummaryRow label={T.summary.averageCheck} value={formatCurrency(summary.averageCheck)} />
              <SummaryRow label={T.summary.conversionRate} value={`${Math.round(summary.conversionRate)}%`} />
              {summary.favoriteService && (
                <SummaryRow label={T.summary.favoriteService} value={summary.favoriteService.name} />
              )}
              {summary.favoriteSpecialist && (
                <SummaryRow label={T.summary.favoriteSpecialist} value={summary.favoriteSpecialist.name} />
              )}
              {summary.visitFrequency > 0 && (
                <SummaryRow
                  label={T.summary.visitFrequency}
                  value={`${summary.visitFrequency.toFixed(1)} ${T.summary.perMonth}`}
                />
              )}
            </View>
          </View>
        )}

        {activeTab === 'bookings' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {bookings.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.bookings.noBookings}</Text>
            ) : (
              bookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {canManage && (
              <View style={[styles.noteInputWrap, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                <TextInput
                  style={[styles.noteInput, { color: colors.text, borderColor: colors.cardBorder }]}
                  multiline
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder={T.notes.placeholder}
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={[styles.noteBtn, { backgroundColor: colors.primary }, (!noteText.trim() || addNoteMutation.isPending) && styles.noteBtnDisabled]}
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  onPress={() => addNoteMutation.mutate(noteText.trim())}
                  activeOpacity={0.8}
                >
                  {addNoteMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <Text style={[styles.noteBtnText, { color: colors.buttonText }]}>{T.notes.add}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {notes.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.notes.noNotes}</Text>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.noteHeader}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.noteDate, { color: colors.textSecondary }]}>{formatDateTime(note.createdAt)}</Text>
                  </View>
                  <Text style={[styles.noteText, { color: colors.text }]}>{note.note}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <ClientEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        client={client}
        onSuccess={handleEditSuccess}
      />
    </ScreenContainer>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function BookingCard({ booking }: { booking: ClientBooking }) {
  const { colors } = useTheme();
  const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    new: { bg: colors.primaryLight, text: colors.primaryDark },
    pending: { bg: colors.warningLight, text: colors.warning },
    confirmed: { bg: colors.warningLight, text: colors.warning },
    completed: { bg: colors.successLight, text: colors.successDark },
    cancelled: { bg: colors.errorLight, text: colors.error },
  };
  const statusColors = BOOKING_STATUS_COLORS[booking.status] || BOOKING_STATUS_COLORS.pending;
  const statusLabel = T.bookingStatuses[booking.status] || booking.status;

  return (
    <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.bookingHeader}>
        <Text style={[styles.bookingService, { color: colors.text }]} numberOfLines={1}>
          {booking.service?.name || '—'}
        </Text>
        <View style={[styles.bookingStatusTag, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.bookingStatusText, { color: statusColors.text }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={[styles.bookingMeta, { borderTopColor: colors.border }]}>
        <View style={styles.bookingMetaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]}>{formatDate(booking.booking_date)}</Text>
        </View>
        {booking.booking_time && (
          <View style={styles.bookingMetaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]}>{booking.booking_time}</Text>
          </View>
        )}
        {booking.specialist && (
          <View style={styles.bookingMetaRow}>
            <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.bookingMetaText, { color: colors.textSecondary }]}>{booking.specialist.name}</Text>
          </View>
        )}
      </View>

      {booking.review && (
        <View style={styles.reviewRow}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={[styles.reviewText, { color: colors.text }]}>{booking.review.rating}/5</Text>
          {booking.review.comment && (
            <Text style={[styles.reviewComment, { color: colors.textSecondary }]} numberOfLines={1}>
              "{booking.review.comment}"
            </Text>
          )}
        </View>
      )}

      <View style={[styles.bookingFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.bookingTotalLabel, { color: colors.textSecondary }]}>{T.bookings.total}</Text>
        <Text style={[styles.bookingTotalValue, { color: colors.text }]}>{formatCurrency(booking.total_price || booking.price)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, minWidth: 0 },
  clientName: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagText: { fontSize: 12, fontWeight: '700' },

  contactList: { gap: 8, marginBottom: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactLabel: { fontSize: 13, fontWeight: '700' },
  contactText: { fontSize: 13, fontWeight: '700' },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  actionBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  statLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },

  tabsRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabTextActive: {},

  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  summaryGrid: { gap: 10 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, fontWeight: '700' },
  summaryValue: { fontSize: 13, fontWeight: '700' },

  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 24,
  },

  bookingCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  bookingService: { flex: 1, fontSize: 15, fontWeight: '700' },
  bookingStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookingStatusText: { fontSize: 11, fontWeight: '700' },
  bookingMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  bookingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingMetaText: { fontSize: 12, fontWeight: '700' },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reviewText: { fontSize: 12, fontWeight: '700' },
  reviewComment: { flex: 1, fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  bookingTotalLabel: { fontSize: 13, fontWeight: '700' },
  bookingTotalValue: { fontSize: 14, fontWeight: '700' },

  noteInputWrap: { marginBottom: 16 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  noteBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  noteBtnDisabled: { opacity: 0.5 },
  noteBtnText: { fontSize: 14, fontWeight: '700' },

  noteCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteDate: { fontSize: 12, fontWeight: '700' },
  noteText: { fontSize: 14, fontWeight: '600' },
});
