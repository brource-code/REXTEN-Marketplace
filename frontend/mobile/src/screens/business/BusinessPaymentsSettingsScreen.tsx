import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Платежи',
  description: 'Настройки Stripe и транзакции',
  sections: {
    stripe: 'Stripe Connect',
    actions: 'Действия',
  },
  stripeInfo: 'Управление подключением Stripe выполняется через веб-кабинет. В мобильном приложении вы можете просматривать историю транзакций.',
  stripeStatus: 'Статус подключения',
  stripeConnected: 'Подключено',
  stripeNotConnected: 'Не подключено',
  viewTransactions: 'История транзакций',
  viewTransactionsDesc: 'Просмотр всех платежей и выплат',
  webRequired: 'Требуется веб-версия',
  webRequiredDesc: 'Для подключения Stripe используйте веб-кабинет',
};

export function BusinessPaymentsSettingsScreen() {
  
  const { colors } = useTheme();
const navigation = useNavigation<NativeStackNavigationProp<BusinessStackParamList>>();

  return (
    <ScreenContainer edges={['bottom']}>
      {/* Заголовок */}
      <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
        <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Секция: Stripe Connect */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.stripe}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.primaryLight }]}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: colors.primaryDark }]}>{T.stripeInfo}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>{T.stripeStatus}</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>{T.stripeConnected}</Text>
            </View>
          </View>
        </View>

        {/* Секция: Действия */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.actions}</Text>
          </View>

          <TouchableOpacity
            style={[styles.actionCard, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('BusinessBilling')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="receipt-outline" size={22} color={colors.success} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{T.viewTransactions}</Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{T.viewTransactionsDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.actionCard, { borderBottomColor: colors.border }]}>
            <View style={[styles.actionIconWrap, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="desktop-outline" size={22} color={colors.textSecondary} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{T.webRequired}</Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{T.webRequiredDesc}</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textMuted} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerFixed: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  pageDesc: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  infoIconWrap: { marginTop: 2 },
  infoText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: { fontSize: 15, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionDesc: { fontSize: 13, fontWeight: '600', marginTop: 2 },
});
