import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  getScheduleSlots,
  filterSlotsByDay,
  ScheduleSlot,
  getBusinessServices,
  createScheduleSlot,
  createRecurringBooking,
  deleteScheduleSlot,
  updateScheduleSlot,
  formatDateYmd,
  getScheduleSettings,
  type CreateScheduleSlotPayload,
} from '../../api/business';
import { useBusiness } from '../../contexts/BusinessContext';
import { ScreenContainer } from '../../components/ScreenContainer';
import type { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';
import type { BusinessTabParamList } from '../../navigation/BusinessTabNavigator';
import { getScheduleSlotMonetaryTotal } from '../../utils/schedule/slotMonetaryTotal';
import { computeScheduleStats, getCalendarMonthRange } from '../../utils/schedule/scheduleStats';
import { buildScheduleEventTitle } from '../../utils/schedule/eventTitle';
import { ScheduleMonthCalendar } from '../../components/business/ScheduleMonthCalendar';
import { ScheduleNewBookingModal } from '../../components/business/ScheduleNewBookingModal';
import { ScheduleRecurringBookingModal } from '../../components/business/ScheduleRecurringBookingModal';
import type { DateData, MarkedDates } from 'react-native-calendars/src/types';

import { useTheme } from '../../contexts/ThemeContext';
type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BusinessTabParamList, 'BusinessSchedule'>,
  NativeStackNavigationProp<BusinessStackParamList>
>;

const S = {
  title: 'Расписание',
  description: 'Управление бронированиями и доступностью',
  sectionStats: 'Статистика',
  sectionCalendar: 'Календарь',
  sectionBookings: 'Бронирования',
  newBooking: 'Новое бронирование',
  newRecurring: 'Регулярное',
  recurringList: 'Список регулярных',
  sumExcludingCancelled: 'Сумма без отмен',
  sumCompleted: 'Сумма завершённых',
  inProgress: 'В работе',
  completed: 'Завершено',
  total: 'Всего',
  statuses: {
    new: 'Новый',
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
  },
  emptyDay: 'На этот день нет записей',
  clientFallback: 'Клиент',
  today: 'Сегодня',
  entriesForDay: (d: Date) =>
    `Записи на ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
};


/** Порядок точек в календаре (слева направо). */
const STATUS_ORDER = ['new', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

function dateFromYmd(ymd: string): Date {
  const parts = ymd.split('-').map((x) => parseInt(x, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function formatTime(slot: ScheduleSlot): string {
  if (slot.booking_time) {
    const s = String(slot.booking_time);
    return s.length >= 5 ? s.slice(0, 5) : s;
  }
  if (slot.start && slot.start.length >= 16) return slot.start.slice(11, 16);
  return '—';
}

function fmtUsd(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function slotToYmd(slot: ScheduleSlot): string | null {
  if (slot.booking_date) return String(slot.booking_date).slice(0, 10);
  if (slot.start) return slot.start.slice(0, 10);
  return null;
}

export function BusinessScheduleScreen() {
  
  const { colors } = useTheme();
  const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = useMemo(() => ({
    new: { bg: colors.primaryLight, border: colors.primary, text: colors.primaryDark },
    pending: { bg: colors.warningLight, border: colors.warning, text: colors.warning },
    confirmed: { bg: colors.warningLight, border: colors.warning, text: colors.warning },
    completed: { bg: colors.successLight, border: colors.success, text: colors.successDark },
    cancelled: { bg: colors.errorLight, border: colors.error, text: colors.error },
  }), [colors]);
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { isReady, isLoading: bootLoading, error: bootError, profile } = useBusiness();

  const [selectedDay, setSelectedDay] = useState(() => new Date());
  /** Какой месяц показывать в календаре (yyyy-MM-dd, любой день месяца). */
  const [visibleMonth, setVisibleMonth] = useState(() => formatDateYmd(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);

  const canManage =
    !profile?.permissions?.length || profile.permissions.includes('manage_schedule');

  const slotsQuery = useQuery({
    queryKey: ['business-schedule-slots'],
    queryFn: getScheduleSlots,
    enabled: isReady && !!profile,
  });

  const servicesQuery = useQuery({
    queryKey: ['business-services'],
    queryFn: getBusinessServices,
    enabled: isReady && !!profile,
  });

  const settingsQuery = useQuery({
    queryKey: ['business-schedule-settings'],
    queryFn: getScheduleSettings,
    enabled: isReady && !!profile,
  });

  const weekStartsOn = settingsQuery.data?.weekStartsOn ?? 1;

  const statsDateRange = useMemo(
    () => getCalendarMonthRange(dateFromYmd(visibleMonth)),
    [visibleMonth]
  );

  const stats = useMemo(
    () => computeScheduleStats(slotsQuery.data ?? [], statsDateRange),
    [slotsQuery.data, statsDateRange]
  );

  const markedDates = useMemo(() => {
    const slots = slotsQuery.data ?? [];
    const selectedKey = formatDateYmd(selectedDay);
    const byDay = new Map<string, ScheduleSlot[]>();
    slots.forEach((s) => {
      const y = slotToYmd(s);
      if (!y) return;
      const arr = byDay.get(y);
      if (arr) arr.push(s);
      else byDay.set(y, [s]);
    });

    const out: MarkedDates = {};
    byDay.forEach((daySlots, k) => {
      const statuses = new Set(daySlots.map((s) => s.status || 'new'));
      let dots = STATUS_ORDER.filter((st) => statuses.has(st)).map((st) => ({
        key: st,
        color: STATUS_COLOR[st]?.border ?? STATUS_COLOR.new.border,
      }));
      if (dots.length === 0) {
        dots = [{ key: 'new', color: STATUS_COLOR.new.border }];
      }

      if (k === selectedKey) {
        out[k] = {
          marked: true,
          selected: true,
          selectedColor: colors.primary,
          selectedTextColor: colors.buttonText,
          dots,
        };
      } else {
        out[k] = { marked: true, dots };
      }
    });

    if (!out[selectedKey]) {
      out[selectedKey] = {
        selected: true,
        selectedColor: colors.primaryLight,
        selectedTextColor: colors.primaryDark,
      };
    }
    return out;
  }, [slotsQuery.data, selectedDay]);

  const services = servicesQuery.data ?? [];
  const activeServices = useMemo(
    () => services.filter((s) => s.status !== 'inactive'),
    [services]
  );

  const slotsForDay = useMemo(
    () => filterSlotsByDay(slotsQuery.data ?? [], selectedDay),
    [slotsQuery.data, selectedDay]
  );

  const sortedSlots = useMemo(() => {
    return [...slotsForDay].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  }, [slotsForDay]);

  const createMut = useMutation({
    mutationFn: (payload: CreateScheduleSlotPayload) => createScheduleSlot(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
      setModalOpen(false);
      setEditingSlot(null);
    },
    onError: (e: any) => {
      const code = e?.response?.data?.error;
      const msg = e?.response?.data?.message || e?.message || 'Не удалось создать запись';
      if (code === 'past_date') {
        Alert.alert('Ошибка', String(msg));
        setModalOpen(false);
        setEditingSlot(null);
      } else if (code === 'slot_occupied') {
        Alert.alert('Внимание', `${msg}. Измените время или дату.`);
      } else {
        Alert.alert('Ошибка', String(msg));
        setModalOpen(false);
        setEditingSlot(null);
      }
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<CreateScheduleSlotPayload> }) =>
      updateScheduleSlot(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
      setModalOpen(false);
      setEditingSlot(null);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Не удалось сохранить запись';
      Alert.alert('Ошибка', String(msg));
    },
  });

  const recurringMut = useMutation({
    mutationFn: createRecurringBooking,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['business-recurring'] });
      setRecurringModalOpen(false);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Не удалось создать регулярное бронирование';
      Alert.alert('Ошибка', String(msg));
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteScheduleSlot,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || 'Не удалось удалить';
      Alert.alert('Ошибка', String(msg));
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      slotsQuery.refetch(),
      servicesQuery.refetch(),
      settingsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [slotsQuery, servicesQuery, settingsQuery]);

  const openModal = useCallback(() => {
    setEditingSlot(null);
    setModalOpen(true);
  }, []);

  const openEditSlot = useCallback((slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setModalOpen(true);
  }, []);

  const requestDeleteSlot = useCallback(
    (item: ScheduleSlot) => {
      if (!canManage) return;
      Alert.alert('Удалить бронирование?', buildScheduleEventTitle(item, services, S.clientFallback), [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => deleteMut.mutate(item.id),
        },
      ]);
    },
    [deleteMut, canManage, services]
  );

  const goToday = useCallback(() => {
    const t = new Date();
    setSelectedDay(t);
    setVisibleMonth(formatDateYmd(t));
  }, []);

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDay(new Date(day.year, day.month - 1, day.day));
    setVisibleMonth(day.dateString);
  }, []);

  const handleMonthChange = useCallback((m: DateData) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    setVisibleMonth(`${m.year}-${pad(m.month)}-01`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ScheduleSlot }) => {
      const st = item.status || 'new';
      const statusStyle = STATUS_COLOR[st] ?? STATUS_COLOR.new;
      const title = buildScheduleEventTitle(item, services, S.clientFallback);
      const amount = getScheduleSlotMonetaryTotal(item);
      const specName = item.specialist?.name || item.specialistName;

      return (
        <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('BusinessBookingDetail', { bookingId: Number(item.id) })}
            activeOpacity={0.7}
          >
            <View style={styles.bookingTop}>
              <Text style={[styles.bookingTime, { color: colors.text }]}>{formatTime(item)}</Text>
              <View style={[styles.statusTag, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusTagText, { color: statusStyle.text }]}>
                  {S.statuses[st as keyof typeof S.statuses] ?? st}
                </Text>
              </View>
              <Text style={[styles.bookingAmount, { color: colors.text }]}>{amount > 0 ? fmtUsd(amount) : ''}</Text>
            </View>
            <Text style={[styles.bookingTitle, { color: colors.primary }]} numberOfLines={2}>
              {title}
            </Text>
            {specName ? (
              <Text style={[styles.bookingSecondary, { color: colors.textSecondary }]} numberOfLines={1}>
                {specName}
              </Text>
            ) : null}
          </TouchableOpacity>
          {canManage ? (
            <View style={[styles.bookingActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.bookingActionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}
                onPress={() => openEditSlot(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Редактировать"
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[styles.bookingActionBtnText, { color: colors.primary }]}>Изм.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bookingActionBtn, { backgroundColor: colors.errorLight, borderColor: colors.errorLight }]}
                onPress={() => requestDeleteSlot(item)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Удалить"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.bookingActionBtnText, { color: colors.error }]}>Удал.</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      );
    },
    [navigation, requestDeleteSlot, openEditSlot, services, canManage, colors]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{S.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{S.description}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.outlineBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate('BusinessRecurringList')}
            activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={18} color={colors.primary} />
            <Text style={[styles.outlineBtnText, { color: colors.primary }]}>{S.recurringList}</Text>
          </TouchableOpacity>
          {canManage ? (
            <>
              <TouchableOpacity
                style={[styles.outlineBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => setRecurringModalOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="repeat-outline" size={18} color={colors.primary} />
                <Text style={[styles.outlineBtnText, { color: colors.primary }]}>{S.newRecurring}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={openModal} activeOpacity={0.85}>
                <Ionicons name="calendar-outline" size={18} color={colors.buttonText} />
                <Text style={[styles.primaryBtnText, { color: colors.buttonText }]}>{S.newBooking}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>{S.sectionStats}</Text>

          <View style={styles.statsGrid}>
            <StatMini
              label={S.sumExcludingCancelled}
              value={fmtUsd(stats.nonCancelledSum)}
              icon="remove-circle-outline"
              tone={colors.warning}
            />
            <StatMini
              label={S.sumCompleted}
              value={fmtUsd(stats.completedSum)}
              icon="cash-outline"
              tone={colors.success}
            />
            <StatMini
              label={S.inProgress}
              value={String(stats.inProgress)}
              subtitle={stats.inProgressRevenue > 0 ? fmtUsd(stats.inProgressRevenue) : undefined}
              icon="time-outline"
              tone={colors.primary}
            />
            <StatMini label={S.completed} value={String(stats.completed)} icon="checkmark-circle-outline" tone={colors.purple} />
            <StatMini label={S.total} value={String(stats.total)} icon="calendar-outline" tone={colors.warning} />
          </View>

          <View style={[styles.legend, { borderTopColor: colors.border }]}>
            {Object.entries(STATUS_COLOR).map(([key]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[key].border }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{S.statuses[key as keyof typeof S.statuses] ?? key}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>{S.sectionCalendar}</Text>
          <View style={styles.todayRow}>
            <TouchableOpacity onPress={goToday} style={[styles.todayBtnWide, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]} activeOpacity={0.85}>
              <Ionicons name="today-outline" size={18} color={colors.primary} />
              <Text style={[styles.todayBtnWideText, { color: colors.primary }]}>{S.today}</Text>
            </TouchableOpacity>
          </View>
          <ScheduleMonthCalendar
            embedded
            current={visibleMonth}
            markedDates={markedDates}
            firstDay={weekStartsOn === 0 ? 0 : 1}
            onDayPress={handleDayPress}
            onMonthChange={handleMonthChange}
            subtitle={S.entriesForDay(selectedDay)}
          />
        </View>

        <Text style={[styles.listSectionTitle, { color: colors.text }]}>{S.sectionBookings}</Text>
      </View>
    ),
    [
      navigation,
      canManage,
      openModal,
      stats,
      selectedDay,
      goToday,
      visibleMonth,
      markedDates,
      weekStartsOn,
      handleDayPress,
      handleMonthChange,
      colors,
    ]
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
        <View style={{ padding: 16 }}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{bootError.message}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (slotsQuery.isLoading && !slotsQuery.data) {
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
        data={sortedSlots}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{S.emptyDay}</Text>
          </View>
        }
      />

      <ScheduleNewBookingModal
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSlot(null);
        }}
        selectedDay={selectedDay}
        isPending={createMut.isPending || updateMut.isPending}
        onCreate={(payload) => createMut.mutate(payload)}
        onUpdate={(id, payload) => updateMut.mutate({ id, payload })}
        editingId={editingSlot?.id ?? null}
        initialSlot={editingSlot}
        activeServices={activeServices}
      />

      <ScheduleRecurringBookingModal
        visible={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        anchorDay={selectedDay}
        isPending={recurringMut.isPending}
        onCreate={(payload) => recurringMut.mutate(payload)}
        activeServices={activeServices}
      />
    </ScreenContainer>
  );
}

function StatMini(props: {
  label: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statMini, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
      <View style={styles.statMiniInner}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]} numberOfLines={3}>
            {props.label}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={2}>
            {props.value}
          </Text>
          {props.subtitle ? (
            <Text style={[styles.statSubValue, { color: colors.textSecondary }]} numberOfLines={1}>
              {props.subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statMiniIcon, { backgroundColor: `${props.tone}22` }]}>
          <Ionicons name={props.icon} size={22} color={props.tone} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 32, paddingHorizontal: 16 },
  headerBlock: { paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '700', marginTop: 6, marginBottom: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  blockTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 0 },
  statMini: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  statMiniInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  statTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statSubValue: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  statMiniIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '700' },
  todayRow: { marginBottom: 12 },
  todayBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  todayBtnWideText: { fontSize: 14, fontWeight: '700' },
  bookingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    width: '100%',
  },
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bookingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  bookingActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookingTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  bookingTime: { fontSize: 14, fontWeight: '700' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  bookingAmount: { marginLeft: 'auto', fontSize: 14, fontWeight: '700' },
  bookingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  bookingSecondary: { fontSize: 13, fontWeight: '700' },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '700' },
});
