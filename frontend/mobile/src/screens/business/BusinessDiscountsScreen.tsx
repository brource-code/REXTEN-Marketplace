import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessDiscountSettings,
  getBusinessDiscountTiers,
  getBusinessPromoCodes,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Скидки и лояльность',
  description: 'Управление скидками и промокодами',
  hint: 'Редактирование доступно через веб-кабинет',
  sections: {
    settings: 'Настройки лояльности',
    tiers: 'Уровни скидок',
    promos: 'Промокоды',
  },
  settings: {
    bookingRule: 'Правило подсчёта броней',
    completed: 'Только завершённые',
    notCancelled: 'Все неотменённые',
  },
  tier: {
    bookings: 'Броней',
    discount: 'Скидка',
    active: 'Активен',
    inactive: 'Неактивен',
  },
  promo: {
    used: 'Использовано',
    unlimited: 'Без лимита',
    active: 'Активен',
    inactive: 'Неактивен',
  },
  empty: {
    tiers: 'Нет уровней скидок',
    promos: 'Нет промокодов',
  },
};

type Tab = 'tiers' | 'promos';

export function BusinessDiscountsScreen() {
  
  const { colors } = useTheme();
const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('tiers');

  const settingsQuery = useQuery({
    queryKey: ['business-discount-settings'],
    queryFn: getBusinessDiscountSettings,
  });

  const tiersQuery = useQuery({
    queryKey: ['business-discount-tiers'],
    queryFn: getBusinessDiscountTiers,
  });

  const promosQuery = useQuery({
    queryKey: ['business-promo-codes'],
    queryFn: getBusinessPromoCodes,
  });

  const loading = settingsQuery.isLoading || tiersQuery.isLoading || promosQuery.isLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      settingsQuery.refetch(),
      tiersQuery.refetch(),
      promosQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [settingsQuery, tiersQuery, promosQuery]);

  const stats = useMemo(() => {
    const tiersCount = tiersQuery.data?.length ?? 0;
    const activeTiers = tiersQuery.data?.filter((t) => t.is_active).length ?? 0;
    const promosCount = promosQuery.data?.length ?? 0;
    const activePromos = promosQuery.data?.filter((p) => p.is_active).length ?? 0;
    return { tiersCount, activeTiers, promosCount, activePromos };
  }, [tiersQuery.data, promosQuery.data]);

  if (loading && !settingsQuery.data) {
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

        {/* Подсказка */}
        <View style={[styles.hintCard, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.primaryDark }]}>{T.hint}</Text>
        </View>

        {/* Статистика */}
        <View style={[styles.statsRow, { backgroundColor: colors.background }]}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Уровней</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.tiersCount}</Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>активных: {stats.activeTiers}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Промокодов</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.promosCount}</Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>активных: {stats.activePromos}</Text>
          </View>
        </View>

        {/* Настройки лояльности */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.settings}</Text>
          </View>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>{T.settings.bookingRule}</Text>
            <View style={styles.settingsValueRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.settingsValue, { color: colors.text }]}>
                {settingsQuery.data?.loyalty_booking_count_rule === 'completed'
                  ? T.settings.completed
                  : T.settings.notCancelled}
              </Text>
            </View>
          </View>
        </View>

        {/* Табы */}
        <View style={[styles.tabsRow, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tiers' && styles.tabActive, activeTab === 'tiers' && { backgroundColor: colors.card }]}
            onPress={() => setActiveTab('tiers')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={activeTab === 'tiers' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'tiers' && { color: colors.primary }]}>
              {T.sections.tiers}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'promos' && styles.tabActive, activeTab === 'promos' && { backgroundColor: colors.card }]}
            onPress={() => setActiveTab('promos')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="ticket-outline"
              size={16}
              color={activeTab === 'promos' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'promos' && { color: colors.primary }]}>
              {T.sections.promos}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Контент табов */}
        {activeTab === 'tiers' && (
          <View style={styles.tabContent}>
            {tiersQuery.data?.length ? (
              tiersQuery.data.map((tier) => (
                <View key={tier.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.tierIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{tier.name}</Text>
                      <View
                        style={[
                          styles.statusTag,
                          { backgroundColor: tier.is_active ? colors.successLight : colors.backgroundSecondary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            { color: tier.is_active ? colors.success : colors.textSecondary },
                          ]}
                        >
                          {tier.is_active ? T.tier.active : T.tier.inactive}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.cardDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{T.tier.bookings}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {tier.min_bookings}
                        {tier.max_bookings != null ? ` – ${tier.max_bookings}` : '+'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{T.tier.discount}</Text>
                      <Text style={[styles.detailValueHighlight, { color: colors.success }]}>
                        {tier.discount_type === 'percentage'
                          ? `${tier.discount_value}%`
                          : `$${tier.discount_value}`}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="layers-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty.tiers}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'promos' && (
          <View style={styles.tabContent}>
            {promosQuery.data?.length ? (
              promosQuery.data.map((promo) => (
                <View key={promo.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.promoIcon, { backgroundColor: colors.purpleLight }]}>
                      <Ionicons name="ticket-outline" size={20} color={colors.purple} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.promoCode, { color: colors.purple }]}>{promo.code}</Text>
                      <View
                        style={[
                          styles.statusTag,
                          { backgroundColor: promo.is_active ? colors.successLight : colors.backgroundSecondary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            { color: promo.is_active ? colors.success : colors.textSecondary },
                          ]}
                        >
                          {promo.is_active ? T.promo.active : T.promo.inactive}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.promoDiscount, { color: colors.success }]}>
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value}%`
                        : `$${promo.discount_value}`}
                    </Text>
                  </View>

                  <View style={[styles.cardDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{T.promo.used}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {promo.used_count}
                        {promo.usage_limit != null ? ` / ${promo.usage_limit}` : ` (${T.promo.unlimited})`}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="ticket-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{T.empty.promos}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 12 },

  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  hintText: { flex: 1, fontSize: 13, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  settingsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  settingsLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  settingsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsValue: { fontSize: 15, fontWeight: '700' },

  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: { fontSize: 14, fontWeight: '700' },

  tabContent: {},

  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  promoCode: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  promoDiscount: { fontSize: 18, fontWeight: '700' },

  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: { fontSize: 11, fontWeight: '700' },

  cardDetails: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 14, fontWeight: '700' },
  detailValueHighlight: { fontSize: 16, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 12 },
});
