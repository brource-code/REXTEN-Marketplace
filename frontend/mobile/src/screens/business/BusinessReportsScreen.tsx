import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getReportsOverview,
  getRevenueReport,
  getBookingsReport,
  getClientsReport,
  getSpecialistsReport,
  getSalaryReport,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Отчёты',
  description: 'Аналитика и статистика бизнеса',
  selectPeriod: 'Выберите период для просмотра отчётов',
  selectPeriodHint: 'Используйте быстрый выбор или укажите даты вручную',
  period: 'Период',
  dateFrom: 'С',
  dateTo: 'По',
  periods: {
    today: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц',
    quarter: 'Квартал',
    year: 'Год',
  },
  sections: {
    overview: 'Сводка',
    bookings: 'Брони по статусам',
    clients: 'Топ клиентов',
    revenue: 'Выручка по услугам',
    team: 'Команда и зарплата',
  },
  overview: {
    totalBookings: 'Всего броней',
    completedBookings: 'Завершено',
    cancelledBookings: 'Отменено',
    activeBookings: 'Активных',
    totalRevenue: 'Выручка',
    averageCheck: 'Средний чек',
    uniqueClients: 'Клиентов',
    activeSpecialists: 'Специалистов',
  },
  clients: {
    bookings: 'броней',
  },
  team: {
    salary: 'Зарплата',
    totalSalary: 'Всего начислено',
    specialists: 'Специалистов',
    bookings: 'броней',
    revenue: 'выручка',
  },
  noData: 'Нет данных',
  cancel: 'Отмена',
  done: 'Выбрать',
  selectDate: 'Выберите дату',
};

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatCurrency(value: number | string | undefined): string {
  if (value === undefined || value === null) return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function toApiDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: 'Новые',
    pending: 'Ожидают',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
  };
  return labels[status] || status;
}


function getPeriodDates(period: Period): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { dateFrom: today, dateTo: today };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { dateFrom: weekAgo, dateTo: today };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { dateFrom: monthAgo, dateTo: today };
    }
    case 'quarter': {
      const quarterAgo = new Date(today);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return { dateFrom: quarterAgo, dateTo: today };
    }
    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: yearStart, dateTo: today };
    }
    default:
      return { dateFrom: today, dateTo: today };
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

interface DatePickerModalProps {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

function DatePickerModal({ visible, initialDate, onClose, onSelect }: DatePickerModalProps) {
  const { colors } = useTheme();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (day: number) => {
    setSelectedDate(new Date(viewYear, viewMonth, day));
  };

  const confirm = () => {
    onSelect(selectedDate);
    onClose();
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={[pickerStyles.container, { backgroundColor: colors.card }]}>
          <Text style={[pickerStyles.title, { color: colors.text }]}>{T.selectDate}</Text>

          {/* Month/Year navigation */}
          <View style={pickerStyles.header}>
            <TouchableOpacity onPress={prevMonth} style={pickerStyles.navBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[pickerStyles.monthYear, { color: colors.text }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={pickerStyles.navBtn}>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={pickerStyles.weekRow}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <Text key={d} style={[pickerStyles.weekDay, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={pickerStyles.daysGrid}>
            {days.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  pickerStyles.dayCell,
                  day && isSelected(day) && { backgroundColor: colors.primary },
                  day && isToday(day) && !isSelected(day) && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => day && selectDay(day)}
                disabled={!day}
                activeOpacity={0.7}
              >
                {day && (
                  <Text
                    style={[
                      pickerStyles.dayText,
                      { color: colors.text },
                      isSelected(day) && { color: colors.buttonText },
                      isToday(day) && !isSelected(day) && { color: colors.primary },
                    ]}
                  >
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={pickerStyles.actions}>
            <TouchableOpacity style={[pickerStyles.cancelBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={onClose}>
              <Text style={[pickerStyles.cancelText, { color: colors.textSecondary }]}>{T.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[pickerStyles.confirmBtn, { backgroundColor: colors.primary }]} onPress={confirm}>
              <Text style={[pickerStyles.confirmText, { color: colors.buttonText }]}>{T.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export function BusinessReportsScreen() {
  
  const { colors } = useTheme();

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      new: colors.primary,
      pending: colors.warning,
      confirmed: colors.purple,
      completed: colors.success,
      cancelled: colors.error,
    };
    return map[status] || colors.textSecondary;
  };

  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'from' | 'to'>('from');

  const hasPeriod = dateFrom && dateTo;

  const filters = useMemo(() => {
    if (!hasPeriod) return null;
    return {
      date_from: toApiDate(dateFrom),
      date_to: toApiDate(dateTo),
    };
  }, [dateFrom, dateTo, hasPeriod]);

  const overviewQuery = useQuery({
    queryKey: ['business-reports-overview', filters],
    queryFn: () => getReportsOverview(filters || undefined),
    enabled: !!hasPeriod,
  });
  const revenueQuery = useQuery({
    queryKey: ['business-reports-revenue', filters],
    queryFn: () => getRevenueReport(filters || undefined),
    enabled: !!hasPeriod,
  });
  const bookingsQuery = useQuery({
    queryKey: ['business-reports-bookings', filters],
    queryFn: () => getBookingsReport(filters || undefined),
    enabled: !!hasPeriod,
  });
  const clientsQuery = useQuery({
    queryKey: ['business-reports-clients', filters],
    queryFn: () => getClientsReport(filters || undefined),
    enabled: !!hasPeriod,
  });
  const specialistsQuery = useQuery({
    queryKey: ['business-reports-specialists', filters],
    queryFn: () => getSpecialistsReport(filters || undefined),
    enabled: !!hasPeriod,
  });
  const salaryQuery = useQuery({
    queryKey: ['business-reports-salary', filters],
    queryFn: () => getSalaryReport(filters || undefined),
    enabled: !!hasPeriod,
  });

  const loading =
    overviewQuery.isLoading ||
    revenueQuery.isLoading ||
    bookingsQuery.isLoading ||
    clientsQuery.isLoading ||
    specialistsQuery.isLoading ||
    salaryQuery.isLoading;

  const onRefresh = useCallback(async () => {
    if (!hasPeriod) return;
    setRefreshing(true);
    await Promise.all([
      overviewQuery.refetch(),
      revenueQuery.refetch(),
      bookingsQuery.refetch(),
      clientsQuery.refetch(),
      specialistsQuery.refetch(),
      salaryQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [hasPeriod, overviewQuery, revenueQuery, bookingsQuery, clientsQuery, specialistsQuery, salaryQuery]);

  const handlePeriodSelect = (period: Period) => {
    const { dateFrom: from, dateTo: to } = getPeriodDates(period);
    setDateFrom(from);
    setDateTo(to);
    setSelectedPeriod(period);
  };

  const openDatePicker = (field: 'from' | 'to') => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const handleDateSelect = (date: Date) => {
    if (datePickerField === 'from') {
      setDateFrom(date);
    } else {
      setDateTo(date);
    }
    setSelectedPeriod(null);
  };

  const o = overviewQuery.data;
  const r = revenueQuery.data;
  const b = bookingsQuery.data;
  const c = clientsQuery.data;
  const sp = specialistsQuery.data;
  const sal = salaryQuery.data;

  return (
    <ScreenContainer edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Заголовок */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>

        {/* Фильтр периода */}
        <View style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Быстрый выбор периода */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{T.period}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.periodScroll}
            contentContainerStyle={styles.periodContent}
          >
            {(['today', 'week', 'month', 'quarter', 'year'] as Period[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodChip,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                  selectedPeriod === period && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                ]}
                onPress={() => handlePeriodSelect(period)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    { color: colors.textSecondary },
                    selectedPeriod === period && { color: colors.controlSelectedText },
                  ]}
                >
                  {T.periods[period]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Поля дат */}
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{T.dateFrom}</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}
                onPress={() => openDatePicker('from')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.dateInputText, { color: colors.text }, !dateFrom && { color: colors.textMuted }]}>
                  {dateFrom ? formatDate(dateFrom) : 'дд.мм.гггг'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateSeparator}>
              <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>—</Text>
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{T.dateTo}</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}
                onPress={() => openDatePicker('to')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.dateInputText, { color: colors.text }, !dateTo && { color: colors.textMuted }]}>
                  {dateTo ? formatDate(dateTo) : 'дд.мм.гггг'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Контент */}
        {!hasPeriod ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{T.selectPeriod}</Text>
            <Text style={[styles.emptyStateHint, { color: colors.textSecondary }]}>{T.selectPeriodHint}</Text>
          </View>
        ) : loading && !o ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Сводка */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.overview}</Text>
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Ionicons name="cash-outline" size={22} color={colors.success} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(o?.totalRevenue)}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{T.overview.totalRevenue}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>{o?.totalBookings ?? 0}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{T.overview.totalBookings}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>{o?.completedBookings ?? 0}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{T.overview.completedBookings}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                  <Ionicons name="people-outline" size={22} color={colors.info} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>{o?.uniqueClients ?? 0}</Text>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{T.overview.uniqueClients}</Text>
                </View>
              </View>
            </View>

            {/* Брони по статусам */}
            {b?.byStatus?.length ? (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.bookings}</Text>
                <View style={styles.statusList}>
                  {b.byStatus.map((x: any, i: number) => (
                    <View key={`st-${i}`} style={[styles.statusItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(x.status) }]} />
                      <Text style={[styles.statusLabel, { color: colors.text }]}>{getStatusLabel(x.status)}</Text>
                      <Text style={[styles.statusValue, { color: colors.text }]}>{x.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Топ клиентов */}
            {c?.topByBookings?.length ? (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.clients}</Text>
                <View style={styles.clientsList}>
                  {c.topByBookings.slice(0, 10).map((x: any, i: number) => (
                    <View key={`tb-${i}`} style={[styles.clientItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={[styles.clientRank, { backgroundColor: colors.backgroundSecondary }]}>
                        <Text style={[styles.clientRankText, { color: colors.text }]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>{x.clientName}</Text>
                      <Text style={[styles.clientBookings, { color: colors.textSecondary }]}>{x.bookings} {T.clients.bookings}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Выручка по услугам */}
            {r?.byService?.length ? (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.revenue}</Text>
                <View style={styles.revenueList}>
                  {r.byService.slice(0, 10).map((s: any, index: number) => (
                    <View key={`svc-${s.serviceId}-${index}`} style={[styles.revenueItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.revenueName, { color: colors.text }]} numberOfLines={1}>{s.serviceName}</Text>
                      <Text style={[styles.revenueValue, { color: colors.text }]}>{formatCurrency(s.revenue)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Команда и зарплата */}
            {(sp?.length || sal) ? (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.team}</Text>

                {sal && (
                  <View style={[styles.salaryBlock, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
                    <View style={styles.salaryRow}>
                      <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>{T.team.totalSalary}</Text>
                      <Text style={[styles.salaryValue, { color: colors.text }]}>{formatCurrency(sal.totalSalary)}</Text>
                    </View>
                    <View style={styles.salaryRow}>
                      <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>{T.team.specialists}</Text>
                      <Text style={[styles.salaryValueSmall, { color: colors.text }]}>{sal.totalSpecialists}</Text>
                    </View>
                  </View>
                )}

                {sp?.length ? (
                  <View style={styles.teamList}>
                    {sp.slice(0, 10).map((x: any) => (
                      <View key={x.id} style={[styles.teamItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <View style={[styles.teamAvatar, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.teamAvatarText, { color: colors.primary }]}>
                            {x.name?.charAt(0).toUpperCase() || 'S'}
                          </Text>
                        </View>
                        <View style={styles.teamInfo}>
                          <Text style={[styles.teamName, { color: colors.text }]}>{x.name}</Text>
                          <Text style={[styles.teamMeta, { color: colors.textSecondary }]}>
                            {x.bookingsCount} {T.team.bookings} · {formatCurrency(x.revenue)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Custom Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        initialDate={datePickerField === 'from' ? (dateFrom || new Date()) : (dateTo || new Date())}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateSelect}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 16 },

  filterCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  filterLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },

  periodScroll: { marginBottom: 14 },
  periodContent: { gap: 8 },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  periodChipActive: {},
  periodChipText: { fontSize: 13, fontWeight: '700' },
  periodChipTextActive: {},

  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputText: { fontSize: 14, fontWeight: '600' },
  dateInputPlaceholder: {},
  dateSeparator: {
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  dateSeparatorText: { fontSize: 16, fontWeight: '600' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptyStateHint: { fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  loadingBlock: { alignItems: 'center', paddingVertical: 48 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  metricCardPrimary: {},
  metricValue: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  metricLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  statusList: { gap: 8 },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  statusValue: { fontSize: 16, fontWeight: '700' },

  clientsList: { gap: 8 },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  clientRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientRankText: { fontSize: 12, fontWeight: '700' },
  clientName: { flex: 1, fontSize: 14, fontWeight: '600' },
  clientBookings: { fontSize: 13, fontWeight: '700' },

  revenueList: { gap: 8 },
  revenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  revenueName: { flex: 1, fontSize: 14, fontWeight: '600' },
  revenueValue: { fontSize: 15, fontWeight: '700' },

  salaryBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  salaryLabel: { fontSize: 13, fontWeight: '600' },
  salaryValue: { fontSize: 18, fontWeight: '700' },
  salaryValueSmall: { fontSize: 15, fontWeight: '700' },

  teamList: { gap: 8 },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamAvatarText: { fontSize: 14, fontWeight: '700' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 14, fontWeight: '700' },
  teamMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
