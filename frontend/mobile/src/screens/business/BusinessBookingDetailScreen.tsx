import React, { useLayoutEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessBooking,
  updateBusinessBooking,
  deleteBusinessBooking,
  getBusinessServices,
  updateScheduleSlot,
  BusinessBooking,
  type CreateScheduleSlotPayload,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ScheduleNewBookingModal } from '../../components/business/ScheduleNewBookingModal';
import { useBusiness } from '../../contexts/BusinessContext';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  loadError: 'Не удалось загрузить бронирование',
  retry: 'Повторить',
  service: 'Услуга',
  client: 'Клиент',
  specialist: 'Специалист',
  datetime: 'Дата и время',
  duration: 'Длительность',
  min: 'мин',
  pricing: 'Стоимость',
  basePrice: 'Базовая цена',
  additionalServices: 'Дополнительные услуги',
  discount: 'Скидка',
  promoCode: 'Промокод',
  total: 'Итого',
  status: 'Статус',
  notes: 'Заметки бизнеса',
  clientNotes: 'Комментарий клиента',
  created: 'Создано',
  changeStatus: 'Изменить статус',
  editBooking: 'Редактировать',
  deleteBooking: 'Удалить',
  viewClient: 'Профиль клиента',
  phone: 'Позвонить',
  email: 'Написать',
  deleteConfirm: {
    title: 'Удалить бронирование?',
    message: 'Это действие нельзя отменить.',
    cancel: 'Отмена',
    confirm: 'Удалить',
  },
  success: {
    statusUpdated: 'Статус обновлён',
    deleted: 'Бронирование удалено',
  },
  errors: {
    statusUpdate: 'Не удалось обновить статус',
    delete: 'Не удалось удалить бронирование',
  },
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  pending: 'Ожидание',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  cancelled: 'Отменено',
};


const STATUSES = ['new', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

function formatCurrency(value: number | undefined | null): string {
  const num = typeof value === 'number' ? value : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

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

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy}, ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

type Route = RouteProp<BusinessStackParamList, 'BusinessBookingDetail'>;
type Nav = NativeStackNavigationProp<BusinessStackParamList, 'BusinessBookingDetail'>;

function bookingDateToLocalDay(bookingDate: string): Date {
  const [y, m, d] = bookingDate.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function BusinessBookingDetailScreen() {
  
  const { colors } = useTheme();
  const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = useMemo(() => ({
    new: { bg: colors.primaryLight, text: colors.primaryDark, border: colors.primary },
    pending: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
    confirmed: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
    completed: { bg: colors.successLight, text: colors.successDark, border: colors.success },
    cancelled: { bg: colors.errorLight, text: colors.error, border: colors.error },
  }), [colors]);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { bookingId } = route.params;
  const queryClient = useQueryClient();
  const { profile, isReady } = useBusiness();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const canManage =
    !profile?.permissions?.length || profile?.permissions?.includes('manage_schedule');

  const query = useQuery({
    queryKey: ['business-booking', bookingId],
    queryFn: () => getBusinessBooking(bookingId),
  });

  const servicesQuery = useQuery({
    queryKey: ['business-services'],
    queryFn: getBusinessServices,
    enabled: isReady && !!profile && canManage,
  });

  const activeServices = useMemo(
    () => (servicesQuery.data ?? []).filter((s) => s.status !== 'inactive'),
    [servicesQuery.data]
  );

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateBusinessBooking(bookingId, { status }),
    onSuccess: (data: BusinessBooking) => {
      queryClient.setQueryData(['business-booking', bookingId], data);
      queryClient.invalidateQueries({ queryKey: ['business-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
      Alert.alert(T.success.statusUpdated);
    },
    onError: () => {
      Alert.alert('Ошибка', T.errors.statusUpdate);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBusinessBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
      Alert.alert(T.success.deleted);
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Ошибка', T.errors.delete);
    },
  });

  const updateScheduleMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateScheduleSlotPayload> }) =>
      updateScheduleSlot(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-booking', bookingId] });
      await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['business-bookings'] });
      setEditModalOpen(false);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Не удалось сохранить запись';
      Alert.alert('Ошибка', String(msg));
    },
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

  const handleViewClient = useCallback(() => {
    const clientId = query.data?.client?.id;
    if (clientId) {
      navigation.navigate('BusinessClientDetail', { clientId });
    }
  }, [query.data?.client?.id, navigation]);

  const b = query.data;

  useLayoutEffect(() => {
    if (b?.id) {
      navigation.setOptions({ title: `Бронирование #${b.id}` });
    }
  }, [b?.id, navigation]);

  if (query.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (query.isError || !b) {
    return (
      <ScreenContainer>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{T.loadError}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => query.refetch()} activeOpacity={0.85}>
            <Text style={[styles.retryBtnText, { color: colors.buttonText }]}>{T.retry}</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const st = b.status || 'new';
  const statusColors = STATUS_STYLE[st] ?? STATUS_STYLE.new;

  const basePrice = b.price ?? 0;
  const additionalServices = b.additional_services ?? [];
  const additionalTotal = additionalServices.reduce(
    (sum, s) => sum + (s.price ?? 0) * (s.quantity ?? 1),
    0
  );
  const discountAmount = b.discount_amount ?? 0;
  const totalPrice = b.total_price ?? basePrice + additionalTotal - discountAmount;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero карточка */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.heroService, { color: colors.text }]} numberOfLines={2}>
              {b.service?.name ?? T.service}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusPillText, { color: statusColors.text }]}>
                {STATUS_LABEL[st] ?? st}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroPrice, { color: colors.text }]}>{formatCurrency(totalPrice)}</Text>

          {canManage && (
            <View style={[styles.heroActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder }]}
                onPress={() => setEditModalOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={[styles.heroActionBtnText, { color: colors.primary }]}>{T.editBooking}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroActionBtnDanger, { backgroundColor: colors.errorLight, borderColor: colors.errorLight }]}
                onPress={handleDelete}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={[styles.heroActionBtnTextDanger, { color: colors.error }]}>{T.deleteBooking}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Дата и время */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{T.datetime}</Text>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatDate(b.booking_date)} · {formatTime(b.booking_time)}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {T.duration}: {b.duration_minutes ?? '—'} {T.min}
            </Text>
          </View>
        </View>

        {/* Клиент */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{T.client}</Text>
            {b.client?.id && (
              <TouchableOpacity onPress={handleViewClient} activeOpacity={0.7}>
                <Text style={[styles.linkSmall, { color: colors.primary }]}>{T.viewClient}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.clientName, { color: colors.text }]}>{b.client?.name ?? '—'}</Text>
          {b.client?.phone && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`tel:${b.client!.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text }]}>{b.client.phone}</Text>
            </TouchableOpacity>
          )}
          {b.client?.email && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL(`mailto:${b.client!.email}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text }]}>{b.client.email}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Специалист */}
        {b.specialist && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{T.specialist}</Text>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoValue, { color: colors.text }]}>{b.specialist.name}</Text>
            </View>
          </View>
        )}

        {/* Стоимость */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{T.pricing}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{T.basePrice}</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>{formatCurrency(basePrice)}</Text>
          </View>

          {additionalServices.length > 0 && (
            <>
              <Text style={[styles.subTitle, { color: colors.textSecondary }]}>{T.additionalServices}</Text>
              {additionalServices.map((s, idx) => (
                <View key={s.id ?? idx} style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    {s.name} × {s.quantity ?? 1}
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    {formatCurrency((s.price ?? 0) * (s.quantity ?? 1))}
                  </Text>
                </View>
              ))}
            </>
          )}

          {discountAmount > 0 && (
            <View style={[styles.discountRow, { borderTopColor: colors.border }]}>
              <View style={styles.discountLabel}>
                <Ionicons name="pricetag-outline" size={16} color={colors.success} />
                <Text style={[styles.discountText, { color: colors.success }]}>
                  {T.discount}
                  {b.discount_tier_name && ` (${b.discount_tier_name})`}
                </Text>
              </View>
              <Text style={[styles.discountValue, { color: colors.success }]}>-{formatCurrency(discountAmount)}</Text>
            </View>
          )}

          {b.promo_code && (
            <View style={styles.promoRow}>
              <Ionicons name="ticket-outline" size={16} color={colors.purple} />
              <Text style={[styles.promoText, { color: colors.purple }]}>
                {T.promoCode}: {b.promo_code}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{T.total}</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(totalPrice)}</Text>
          </View>
        </View>

        {/* Заметки бизнеса */}
        {b.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{T.notes}</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>{b.notes}</Text>
          </View>
        )}

        {/* Комментарий клиента */}
        {b.client_notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{T.clientNotes}</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>{b.client_notes}</Text>
          </View>
        )}

        {/* Дата создания */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.createdText, { color: colors.textMuted }]}>
              {T.created}: {formatDateTime(b.created_at)}
            </Text>
          </View>
        </View>

        {/* Изменение статуса */}
        {canManage && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{T.changeStatus}</Text>
            <View style={styles.statusGrid}>
              {STATUSES.map((s) => {
                const active = b.status === s;
                const stColors = STATUS_STYLE[s] ?? STATUS_STYLE.new;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusBtn,
                      { borderColor: colors.cardBorder, backgroundColor: colors.backgroundSecondary },
                      active && { backgroundColor: stColors.bg, borderColor: stColors.border },
                    ]}
                    disabled={statusMutation.isPending || active}
                    onPress={() => statusMutation.mutate(s)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        { color: colors.text },
                        active && { color: stColors.text },
                      ]}
                    >
                      {STATUS_LABEL[s] ?? s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {statusMutation.isPending && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.statusLoader} />
            )}
          </View>
        )}
      </ScrollView>

      {canManage && (
        <ScheduleNewBookingModal
          visible={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          selectedDay={bookingDateToLocalDay(b.booking_date)}
          isPending={updateScheduleMut.isPending}
          onCreate={() => {}}
          onUpdate={(id, payload) => updateScheduleMut.mutate({ id: Number(id), payload })}
          editingId={b.id}
          initialBooking={b}
          activeServices={activeServices}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700' },

  heroCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroService: { flex: 1, fontSize: 18, fontWeight: '700' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  heroPrice: { marginTop: 12, fontSize: 28, fontWeight: '700' },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  heroActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroActionBtnText: { fontSize: 14, fontWeight: '700' },
  heroActionBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroActionBtnTextDanger: { fontSize: 14, fontWeight: '700' },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  linkSmall: { fontSize: 13, fontWeight: '700' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoValue: { fontSize: 14, fontWeight: '700' },

  clientName: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  contactText: { fontSize: 14, fontWeight: '700' },

  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceLabel: { fontSize: 14, fontWeight: '600' },
  priceValue: { fontSize: 14, fontWeight: '700' },

  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  discountLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountText: { fontSize: 14, fontWeight: '700' },
  discountValue: { fontSize: 14, fontWeight: '700' },

  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  promoText: { fontSize: 13, fontWeight: '700' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },

  notesText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  createdText: { fontSize: 13, fontWeight: '600' },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
  },
  statusBtnText: { fontSize: 13, fontWeight: '700' },
  statusLoader: { marginTop: 12 },
});
