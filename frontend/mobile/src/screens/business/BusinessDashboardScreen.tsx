import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessStats,
  getChartData,
  getRecentBookings,
  BusinessStats,
  DashboardPeriodMetric,
} from '../../api/business';
import { useBusiness } from '../../contexts/BusinessContext';
import { ScreenContainer } from '../../components/ScreenContainer';
import { DashboardLineChart } from '../../components/business/DashboardLineChart';
import { getBusinessDashboardPeriodRange } from '../../utils/businessDashboardPeriodRange';
import { getPublicWebBaseUrl } from '../../api/config';
import { BusinessTabParamList } from '../../navigation/BusinessTabNavigator';
import { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';

import { useTheme } from '../../contexts/ThemeContext';
type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<BusinessTabParamList, 'BusinessDashboard'>,
  NativeStackNavigationProp<BusinessStackParamList>
>;

const T = {
  title: 'Дашборд',
  overview: 'Обзор бизнеса',
  statsLifetime: 'За всё время',
  statsCurrent: 'Сейчас',
  hintLifetime: 'Всё накопленное с начала учёта.',
  hintCurrent: 'Предстоящие брони, оценка по незавершённым записям, объявления.',
  totalClients: 'Клиенты',
  totalRevenue: 'Выручка',
  totalBookings: 'Бронирования',
  activeBookings: 'Предстоящие брони',
  revenueInWork: 'В работе',
  activeAdvertisements: 'Объявления',
  includingOverdue: (amount: string) => `+ ${amount} просроч.`,
  overviewBlock: 'Обзор бизнеса',
  periods: {
    thisWeek: 'Эта неделя',
    thisMonth: 'Этот месяц',
    thisYear: 'Этот год',
  },
  stats: {
    revenue: 'Доходы',
    bookings: 'Бронирования',
    newClients: 'Новые клиенты',
    comparedTo: 'к прошлому периоду',
    revenueFootnote: 'Завершённые брони за период (по дате услуги).',
    periodRange: (from: string, to: string) => `Показатели: ${from} — ${to}`,
  },
  chart: {
    error: 'Ошибка загрузки данных графика',
    noData: 'Нет данных для отображения',
  },
  recent: {
    title: 'Последние бронирования',
    viewAll: 'Все брони',
    noBookings: 'Нет бронирований',
    service: 'Услуга',
  },
  quick: {
    title: 'Быстрые действия',
    viewProfile: 'Профиль',
    newBooking: 'Новое бронирование',
    newBookingDesc: 'Создать бронирование вручную',
    addClient: 'Добавить клиента',
    addClientDesc: 'Зарегистрировать нового клиента',
    settings: 'Настройки',
    settingsDesc: 'Управление настройками бизнеса',
    schedule: 'Расписание',
    scheduleDesc: 'Управление расписанием',
  },
  status: {
    new: 'Новый',
    pending: 'Ожидание',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено',
  },
  loadingBusiness: 'Загрузка бизнеса…',
  error: 'Ошибка',
};


function fmtUsd(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

function fmtCompact(n: number): string {
  try {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(n);
  }
}

function formatDateRu(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y}`;
}

function formatTimeShort(timeStr: string): string {
  if (!timeStr) return '';
  const [h, mm] = timeStr.split(':');
  return `${h}:${(mm ?? '00').slice(0, 2)}`;
}

function shouldShowGrow(gs: number | undefined): boolean {
  return gs != null && Number.isFinite(gs);
}

function GrowRow({ value }: { value: number }) {
  const { colors } = useTheme();
  const positive = value >= 0;
  return (
    <Text style={[styles.growText, { color: positive ? colors.success : colors.error }]}>
      {positive ? '+' : ''}
      {value.toFixed(1)}%
    </Text>
  );
}

type PeriodKey = 'thisWeek' | 'thisMonth' | 'thisYear';
type CatKey = 'revenue' | 'bookings' | 'clients';

export function BusinessDashboardScreen() {
  
  const { colors } = useTheme();
  const chartColors = {
    revenue: colors.success,
    bookings: colors.primary,
    clients: colors.purple,
  };
  const statusStyle: Record<string, { bg: string; text: string }> = {
    new: { bg: colors.primaryLight, text: colors.primaryDark },
    pending: { bg: colors.warningLight, text: colors.warning },
    confirmed: { bg: colors.warningLight, text: colors.warning },
    completed: { bg: colors.successLight, text: colors.successDark },
    cancelled: { bg: colors.errorLight, text: colors.error },
  };
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { isReady, isLoading: bootLoading, error: bootError, profile } = useBusiness();

  const [statsView, setStatsView] = useState<'lifetime' | 'current'>('lifetime');
  const [selectedCategory, setSelectedCategory] = useState<CatKey>('revenue');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('thisMonth');

  const statsQuery = useQuery({
    queryKey: ['business-stats'],
    queryFn: getBusinessStats,
    enabled: isReady && !!profile,
  });

  const chartQuery = useQuery({
    queryKey: ['business-chart', selectedCategory, selectedPeriod],
    queryFn: () => getChartData(selectedCategory, selectedPeriod),
    enabled: isReady && !!profile,
  });

  const recentQuery = useQuery({
    queryKey: ['business-recent-bookings'],
    queryFn: () => getRecentBookings(5),
    enabled: isReady && !!profile,
  });

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['business-stats'] }),
        queryClient.refetchQueries({ queryKey: ['business-chart'] }),
        queryClient.refetchQueries({ queryKey: ['business-recent-bookings'] }),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [queryClient]);

  const overviewData = useMemo(() => {
    const stats = statsQuery.data;
    if (!stats) return null;
    const z = (): DashboardPeriodMetric => ({ value: 0, growShrink: 0 });
    return {
      revenue: {
        thisWeek: stats.revenue?.thisWeek ?? z(),
        thisMonth: stats.revenue?.thisMonth ?? z(),
        thisYear: stats.revenue?.thisYear ?? z(),
      },
      bookings: {
        thisWeek: stats.bookings?.thisWeek ?? z(),
        thisMonth: stats.bookings?.thisMonth ?? z(),
        thisYear: stats.bookings?.thisYear ?? z(),
      },
      clients: {
        thisWeek: stats.clients?.thisWeek ?? z(),
        thisMonth: stats.clients?.thisMonth ?? z(),
        thisYear: stats.clients?.thisYear ?? z(),
      },
    };
  }, [statsQuery.data]);

  const periodRangeLine = useMemo(() => {
    const { from, to } = getBusinessDashboardPeriodRange(selectedPeriod);
    return T.stats.periodRange(from, to);
  }, [selectedPeriod]);

  const chartSeries = chartQuery.data?.series?.[0];
  const chartValues = chartSeries?.data?.length ? chartSeries.data : [];
  const chartLabels = (chartQuery.data?.date?.length ? chartQuery.data.date : chartQuery.data?.categories) ?? [];

  const businessSlug =
    profile?.slug ||
    (profile?.name ? profile.name.toLowerCase().replace(/\s+/g, '-') : 'my-business');

  const openPublicProfile = useCallback(() => {
    const base = getPublicWebBaseUrl();
    const url = `${base}/marketplace/company/${businessSlug}`;
    void Linking.openURL(url);
  }, [businessSlug]);

  if (bootLoading || !isReady) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{T.loadingBusiness}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (bootError) {
    return (
      <ScreenContainer>
        <View style={styles.padded}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{T.error}</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{bootError.message}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const s: BusinessStats | undefined = statsQuery.data;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{T.overview}</Text>

        {/* Сегмент + карточки BusinessStats */}
        <View style={[styles.segmentWrap, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              { backgroundColor: 'transparent' },
              statsView === 'lifetime' && { backgroundColor: colors.card },
            ]}
            onPress={() => setStatsView('lifetime')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentLabel, { color: colors.textSecondary }, statsView === 'lifetime' && { color: colors.text, fontWeight: '700' }]}>{T.statsLifetime}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              { backgroundColor: 'transparent' },
              statsView === 'current' && { backgroundColor: colors.card },
            ]}
            onPress={() => setStatsView('current')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentLabel, { color: colors.textSecondary }, statsView === 'current' && { color: colors.text, fontWeight: '700' }]}>{T.statsCurrent}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{statsView === 'lifetime' ? T.hintLifetime : T.hintCurrent}</Text>

        {statsView === 'lifetime' ? (
          <View style={styles.statsGrid}>
            <StatCard
              title={T.totalClients}
              valueText={String(s?.activeClients ?? 0)}
              icon="people-outline"
              iconBg={colors.successLight}
              iconColor={colors.success}
            />
            <StatCard
              title={T.totalRevenue}
              valueText={fmtUsd(s?.totalRevenue ?? 0)}
              icon="cash-outline"
              iconBg={colors.warningLight}
              iconColor={colors.warning}
            />
            <StatCard
              title={T.totalBookings}
              valueText={String(s?.totalBookings ?? 0)}
              icon="time-outline"
              iconBg={colors.purpleLight}
              iconColor={colors.purple}
            />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              title={T.activeBookings}
              valueText={String(s?.upcomingBookings ?? 0)}
              icon="calendar-outline"
              iconBg={colors.primaryLight}
              iconColor={colors.primary}
            />
            <View>
              <StatCard
                title={T.revenueInWork}
                valueText={fmtUsd(s?.revenueInWork ?? 0)}
              icon="cash-outline"
              iconBg={colors.successLight}
              iconColor={colors.success}
              />
              {(s?.overdueBookings?.revenue ?? 0) > 0 ? (
                <Text style={[styles.overdue, { color: colors.error }]}>
                  {T.includingOverdue(
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                      s!.overdueBookings!.revenue
                    )
                  )}
                </Text>
              ) : null}
            </View>
            <StatCard
              title={T.activeAdvertisements}
              valueText={String(s?.activeAdvertisements ?? 0)}
              icon="megaphone-outline"
              iconBg={colors.primaryLight}
              iconColor={colors.primary}
            />
          </View>
        )}

        {/* Обзор + график */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>{T.overviewBlock}</Text>
            <View style={styles.periodChips}>
              {(['thisWeek', 'thisMonth', 'thisYear'] as PeriodKey[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder },
                    selectedPeriod === p && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                  ]}
                  onPress={() => setSelectedPeriod(p)}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, selectedPeriod === p && { color: colors.controlSelectedText }]}>{T.periods[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.rangeHint, { color: colors.textSecondary }]}>{periodRangeLine}</Text>

          {statsQuery.isLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : overviewData ? (
            <>
              <View style={styles.metricRow}>
                <MetricPill
                  title={T.stats.revenue}
                  value={fmtUsd(overviewData.revenue[selectedPeriod].value)}
                  footnote={T.stats.revenueFootnote}
                  grow={overviewData.revenue[selectedPeriod].growShrink}
                  active={selectedCategory === 'revenue'}
                  onPress={() => setSelectedCategory('revenue')}
                  icon="cash-outline"
                  tone="emerald"
                />
                <MetricPill
                  title={T.stats.bookings}
                  value={String(overviewData.bookings[selectedPeriod].value)}
                  grow={overviewData.bookings[selectedPeriod].growShrink}
                  active={selectedCategory === 'bookings'}
                  onPress={() => setSelectedCategory('bookings')}
                  icon="calendar-outline"
                  tone="blue"
                />
                <MetricPill
                  title={T.stats.newClients}
                  value={fmtCompact(overviewData.clients[selectedPeriod].value)}
                  grow={overviewData.clients[selectedPeriod].growShrink}
                  active={selectedCategory === 'clients'}
                  onPress={() => setSelectedCategory('clients')}
                  icon="people-outline"
                  tone="purple"
                />
              </View>

              {chartQuery.isLoading ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : chartQuery.isError ? (
                <Text style={[styles.chartMuted, { color: colors.textSecondary }]}>{T.chart.error}</Text>
              ) : (
                <DashboardLineChart
                  data={chartValues}
                  labels={chartLabels}
                  color={chartColors[selectedCategory]}
                  emptyLabel={T.chart.noData}
                />
              )}
            </>
          ) : null}
        </View>

        {/* Последние бронирования */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>{T.recent.title}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BusinessBookings')}>
              <Text style={[styles.link, { color: colors.primary }]}>{T.recent.viewAll}</Text>
            </TouchableOpacity>
          </View>
          {recentQuery.isLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : recentQuery.data?.length === 0 ? (
            <Text style={[styles.chartMuted, { color: colors.textSecondary }]}>{T.recent.noBookings}</Text>
          ) : (
            recentQuery.data?.map((b) => {
              const st = b.status || 'new';
              const stStyle = statusStyle[st] ?? statusStyle.new;
              return (
                <View key={`rb-${b.id}`} style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.bookingTop}>
                    <Text style={[styles.bookingId, { color: colors.text }]}>#{b.id}</Text>
                    <View style={[styles.statusTag, { backgroundColor: stStyle.bg }]}>
                      <Text style={[styles.statusTagText, { color: stStyle.text }]}>
                        {T.status[st as keyof typeof T.status] ?? st}
                      </Text>
                    </View>
                    <Text style={[styles.bookingAmount, { color: colors.text }]}>{fmtUsd(b.amount)}</Text>
                  </View>
                  <Text style={[styles.bookingMeta, { color: colors.textSecondary, borderTopColor: colors.border }]}>
                    {formatDateRu(b.date)} · {formatTimeShort(b.time)}
                  </Text>
                  <Text style={[styles.bookingCustomer, { color: colors.text }]}>{b.customer}</Text>
                  <Text style={[styles.bookingService, { color: colors.text }]}>
                    {T.recent.service}: {b.service}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Быстрые действия */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>{T.quick.title}</Text>
            <TouchableOpacity onPress={openPublicProfile} style={styles.profileBtn}>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
              <Text style={[styles.link, { color: colors.primary }]}>{T.quick.viewProfile}</Text>
            </TouchableOpacity>
          </View>
          <QuickRow
            first
            title={T.quick.newBooking}
            desc={T.quick.newBookingDesc}
            icon="calendar-outline"
            color={colors.primaryLight}
            iconColor={colors.primary}
            onPress={() => navigation.navigate('BusinessSchedule')}
          />
          <QuickRow
            title={T.quick.addClient}
            desc={T.quick.addClientDesc}
            icon="person-add-outline"
            color={colors.successLight}
            iconColor={colors.success}
            onPress={() => navigation.navigate('BusinessClients')}
          />
          <QuickRow
            title={T.quick.settings}
            desc={T.quick.settingsDesc}
            icon="settings-outline"
            color={colors.backgroundTertiary}
            iconColor={colors.textSecondary}
            onPress={() => navigation.navigate('BusinessProfileSettings')}
          />
          <QuickRow
            title={T.quick.schedule}
            desc={T.quick.scheduleDesc}
            icon="time-outline"
            color={colors.purpleLight}
            iconColor={colors.purple}
            onPress={() => navigation.navigate('BusinessSchedule')}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard(props: {
  title: string;
  valueText: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
      <View style={styles.statCardInner}>
        <View style={styles.statTextCol}>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{props.title}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{props.valueText}</Text>
        </View>
        <View style={[styles.statIconWrap, { backgroundColor: props.iconBg }]}>
          <Ionicons name={props.icon} size={26} color={props.iconColor} />
        </View>
      </View>
    </View>
  );
}

function MetricPill(props: {
  title: string;
  value: string;
  footnote?: string;
  grow: number;
  active: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'emerald' | 'blue' | 'purple';
}) {
  const { colors } = useTheme();
  const toneBg =
    props.tone === 'emerald' ? colors.successLight : props.tone === 'blue' ? colors.primaryLight : colors.purpleLight;
  const toneFg =
    props.tone === 'emerald' ? colors.success : props.tone === 'blue' ? colors.primary : colors.purple;
  const show = shouldShowGrow(props.grow);

  return (
    <TouchableOpacity
      style={[
        styles.metricPill,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        props.active && { borderColor: colors.controlSelectedBorder, borderWidth: 2 },
      ]}
      onPress={props.onPress}
      activeOpacity={0.85}
    >
      <View style={styles.metricRowInner}>
        <View style={styles.metricTextBlock}>
          <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{props.title}</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>{props.value}</Text>
          {props.footnote ? <Text style={[styles.metricFootnote, { color: colors.textSecondary }]}>{props.footnote}</Text> : null}
          {show ? (
            <View style={styles.growRow}>
              <GrowRow value={props.grow} />
              <Text style={[styles.compared, { color: colors.textSecondary }]}> {T.stats.comparedTo}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.metricIconCircle, { backgroundColor: toneBg }]}>
          <Ionicons name={props.icon} size={22} color={toneFg} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function QuickRow(props: {
  first?: boolean;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.quickRow, { borderTopColor: colors.border }, props.first && styles.quickRowFirst]}
      onPress={props.onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickIcon, { backgroundColor: props.color }]}>
        <Ionicons name={props.icon} size={24} color={props.iconColor} />
      </View>
      <View style={styles.quickTextCol}>
        <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>{props.title}</Text>
        <Text style={[styles.quickDesc, { color: colors.textMuted }]}>{props.desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padded: { padding: 16 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  muted: { marginTop: 12, fontWeight: '600', fontSize: 14 },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  segmentLabel: { fontSize: 14, fontWeight: '700' },
  segmentLabelActive: {},
  hint: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
  statsGrid: { gap: 12, marginBottom: 16 },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  statCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statTextCol: { flex: 1, minWidth: 0 },
  statTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdue: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  blockTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  periodChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipActive: {},
  chipText: { fontSize: 12, fontWeight: '700' },
  chipTextActive: {},
  rangeHint: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
  metricRow: { gap: 10, marginBottom: 12 },
  metricRowInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  metricTextBlock: { flex: 1, minWidth: 0, paddingRight: 4 },
  metricPill: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
  },
  metricPillActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  metricTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  metricFootnote: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  growRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  growText: { fontSize: 12, fontWeight: '700' },
  compared: { fontSize: 11, fontWeight: '700' },
  metricIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chartLoading: { paddingVertical: 32, alignItems: 'center' },
  chartMuted: { textAlign: 'center', fontWeight: '700', paddingVertical: 24 },
  bookingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  bookingTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  bookingId: { fontSize: 14, fontWeight: '700' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 12, fontWeight: '700' },
  bookingAmount: { marginLeft: 'auto', fontSize: 14, fontWeight: '700' },
  bookingMeta: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  bookingCustomer: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  bookingService: { fontSize: 13, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '700' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  quickRowFirst: { borderTopWidth: 0, paddingTop: 4 },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextCol: { flex: 1, minWidth: 0 },
  quickTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  quickDesc: { fontSize: 12, fontWeight: '600' },
});
