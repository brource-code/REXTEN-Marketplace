import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BusinessStackParamList } from '../../navigation/BusinessStackNavigator';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  getStripeConnectStatus,
  createStripeConnectAccount,
  refreshStripeConnectLink,
  getStripeDashboardLink,
  disconnectStripeAccount,
  StripeConnectStatus,
} from '../../api/stripe';

const T = {
  title: 'Платежи',
  description: 'Stripe Connect и приём оплаты',
  notConnected: 'Stripe не подключён',
  connectHint: 'Подключите Stripe, чтобы принимать оплату от клиентов.',
  connectBtn: 'Подключить Stripe',
  pending: 'Онбординг Stripe не завершён',
  restricted: 'Аккаунт Stripe ограничен',
  continueSetup: 'Продолжить настройку',
  requirements: 'Требуется',
  active: 'Stripe подключён',
  payouts: 'Выплаты',
  charges: 'Списания',
  yes: 'Да',
  no: 'Нет',
  dispute: 'Есть активный спор — новые платежи временно недоступны.',
  openDashboard: 'Панель Stripe',
  disconnect: 'Отключить',
  disabled: 'Аккаунт отключён',
  billing: 'История и биллинг',
  billingDesc: 'Транзакции и подписка',
  loadError: 'Не удалось загрузить статус',
  errConnect: 'Не удалось подключить',
  errRefresh: 'Не удалось обновить ссылку',
  errDashboard: 'Не удалось открыть панель',
  errDisconnect: 'Не удалось отключить',
};

export function BusinessPaymentsSettingsScreen() {
  const { colors, pageTitle, pageDescription, card, text, textSecondary, primaryButton, primaryButtonText } =
    useThemedStyles();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<BusinessStackParamList>>();

  const { data: status, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['stripe-connect-status'],
    queryFn: getStripeConnectStatus,
    staleTime: 30_000,
  });

  const openUrl = useCallback(async (url: string) => {
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  }, []);

  const connectMut = useMutation({
    mutationFn: createStripeConnectAccount,
    onSuccess: (data) => {
      if (data.url) openUrl(data.url);
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e ? String((e as any).response?.data?.message) : '';
      Alert.alert(T.errConnect, msg || T.errConnect);
    },
  });

  const refreshMut = useMutation({
    mutationFn: refreshStripeConnectLink,
    onSuccess: (data) => {
      if (data.url) openUrl(data.url);
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e ? String((e as any).response?.data?.message) : '';
      Alert.alert(T.errRefresh, msg || T.errRefresh);
    },
  });

  const dashboardMut = useMutation({
    mutationFn: getStripeDashboardLink,
    onSuccess: (data) => {
      if (data.url) openUrl(data.url);
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e ? String((e as any).response?.data?.message) : '';
      Alert.alert(T.errDashboard, msg || T.errDashboard);
    },
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectStripeAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripe-connect-status'] });
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'response' in e ? String((e as any).response?.data?.message) : '';
      Alert.alert(T.errDisconnect, msg || T.errDisconnect);
    },
  });

  const onDisconnect = () => {
    Alert.alert(
      'Отключить Stripe?',
      'Вы не сможете принимать платежи, пока снова не подключите аккаунт.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отключить',
          style: 'destructive',
          onPress: () => disconnectMut.mutate(),
        },
      ]
    );
  };

  const renderStatus = (s: StripeConnectStatus | undefined) => {
    if (!s) return null;
    const st = s.stripe_account_status || 'none';

    if (st === 'none') {
      return (
        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[text, { marginBottom: 8 }]}>{T.notConnected}</Text>
          <Text style={[textSecondary, { marginBottom: 16 }]}>{T.connectHint}</Text>
          <TouchableOpacity
            style={[primaryButton, connectMut.isPending && { opacity: 0.7 }]}
            onPress={() => connectMut.mutate()}
            disabled={connectMut.isPending}
          >
            {connectMut.isPending ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={primaryButtonText}>{T.connectBtn}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (st === 'pending' || st === 'restricted') {
      const due = s.requirements?.currently_due?.length ?? 0;
      return (
        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[text, { marginBottom: 8 }]}>{st === 'restricted' ? T.restricted : T.pending}</Text>
          {due > 0 ? (
            <Text style={[textSecondary, { marginBottom: 12 }]}>
              {T.requirements}: {due}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[primaryButton, refreshMut.isPending && { opacity: 0.7 }]}
            onPress={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
          >
            {refreshMut.isPending ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={primaryButtonText}>{T.continueSetup}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (st === 'disabled') {
      return (
        <View style={[styles.block, { borderColor: colors.border }]}>
          <Text style={[text, { marginBottom: 8 }]}>{T.disabled}</Text>
          {s.stripe_disabled_reason ? (
            <Text style={[textSecondary, { marginBottom: 12 }]}>{s.stripe_disabled_reason}</Text>
          ) : null}
          <View style={styles.rowBtns}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
              onPress={() => dashboardMut.mutate()}
              disabled={dashboardMut.isPending}
            >
              <Text style={[text, { fontSize: 14 }]}>{T.openDashboard}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.error, backgroundColor: colors.errorLight }]}
              onPress={onDisconnect}
              disabled={disconnectMut.isPending}
            >
              <Text style={[text, { fontSize: 14, color: colors.error }]}>{T.disconnect}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.block, { borderColor: colors.border }]}>
        <Text style={[text, { marginBottom: 12 }]}>{T.active}</Text>
        <View style={styles.kvRow}>
          <Text style={textSecondary}>{T.payouts}</Text>
          <Text style={text}>{s.stripe_payouts_enabled ? T.yes : T.no}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={textSecondary}>{T.charges}</Text>
          <Text style={text}>{s.stripe_charges_enabled ? T.yes : T.no}</Text>
        </View>
        {s.has_active_dispute ? (
          <View style={[styles.dispute, { backgroundColor: colors.errorLight }]}>
            <Text style={[text, { color: colors.error, fontSize: 13 }]}>{T.dispute}</Text>
          </View>
        ) : null}
        <View style={styles.rowBtns}>
          <TouchableOpacity
            style={[primaryButton, { flex: 1 }, dashboardMut.isPending && { opacity: 0.7 }]}
            onPress={() => dashboardMut.mutate()}
            disabled={dashboardMut.isPending}
          >
            {dashboardMut.isPending ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={primaryButtonText}>{T.openDashboard}</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.linkBtn, { marginTop: 12 }]}
          onPress={onDisconnect}
          disabled={disconnectMut.isPending}
        >
          <Text style={[textSecondary, { color: colors.error }]}>{T.disconnect}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={pageTitle}>{T.title}</Text>
            <Text style={pageDescription}>{T.description}</Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} hitSlop={12} accessibilityLabel="Refresh">
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[card, styles.center]}>
            <Text style={text}>{T.loadError}</Text>
            <TouchableOpacity style={[primaryButton, { marginTop: 16 }]} onPress={() => refetch()}>
              <Text style={primaryButtonText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[card, { marginBottom: 16 }]}>{renderStatus(status)}</View>
        )}

        <View style={[card, { padding: 0, overflow: 'hidden' }]}>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('BusinessBilling')}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.successLight }]}>
              <Ionicons name="receipt-outline" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={text}>{T.billing}</Text>
              <Text style={[textSecondary, { marginTop: 2 }]}>{T.billingDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {isRefetching && !isLoading ? (
          <Text style={[textSecondary, { textAlign: 'center', marginTop: 8 }]}>Обновление…</Text>
        ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center: { paddingVertical: 32, alignItems: 'center' },
  block: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  dispute: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  linkBtn: {
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
