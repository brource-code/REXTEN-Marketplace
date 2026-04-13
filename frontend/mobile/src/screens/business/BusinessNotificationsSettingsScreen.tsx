import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getBusinessNotificationSettings,
  updateBusinessNotificationSettings,
  BusinessNotificationSettings,
} from '../../api/business';
import { ScreenContainer } from '../../components/ScreenContainer';

import { useTheme } from '../../contexts/ThemeContext';
const T = {
  title: 'Уведомления',
  description: 'Настройка каналов и событий',
  sections: {
    channels: 'Каналы доставки',
    events: 'События',
  },
  fields: {
    email: 'Email уведомления',
    emailDesc: 'Получать уведомления на email',
    telegram: 'Уведомления в Telegram',
    telegramDesc: 'Получать оповещения в Telegram',
    newBookings: 'Новые бронирования',
    newBookingsDesc: 'Уведомлять о новых записях',
    cancellations: 'Отмены',
    cancellationsDesc: 'Уведомлять об отменённых записях',
    payments: 'Платежи',
    paymentsDesc: 'Уведомлять о поступлении оплаты',
    reviews: 'Отзывы',
    reviewsDesc: 'Уведомлять о новых отзывах',
  },
  save: 'Сохранить изменения',
  success: 'Настройки сохранены',
};

export function BusinessNotificationsSettingsScreen() {
  
  const { colors } = useTheme();
const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<BusinessNotificationSettings | null>(null);

  const query = useQuery({
    queryKey: ['business-notif-settings'],
    queryFn: getBusinessNotificationSettings,
  });

  useEffect(() => {
    if (query.data) setDraft({ ...query.data });
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const saveMutation = useMutation({
    mutationFn: (d: BusinessNotificationSettings) => updateBusinessNotificationSettings(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-notif-settings'] });
      Alert.alert('Успех', T.success);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message),
  });

  const toggle = (key: keyof BusinessNotificationSettings) => (v: boolean) =>
    setDraft((d) => (d ? { ...d, [key]: v } : d));

  if (query.isLoading || !draft) {
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
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Секция: Каналы доставки */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="send-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.channels}</Text>
          </View>

          <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.switchIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.email}</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.emailDesc}</Text>
            </View>
            <Switch
              value={draft.email}
              onValueChange={toggle('email')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={draft.email ? colors.primary : colors.backgroundTertiary}
            />
          </View>

          <View style={[styles.switchItem, { borderBottomWidth: 0, borderBottomColor: colors.border }]}>
            <View style={[styles.switchIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.telegram}</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.telegramDesc}</Text>
            </View>
            <Switch
              value={!!draft.telegram}
              onValueChange={toggle('telegram')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={draft.telegram ? colors.primary : colors.backgroundTertiary}
            />
          </View>
        </View>

        {/* Секция: События */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.events}</Text>
          </View>

          <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.switchIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.success} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.newBookings}</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.newBookingsDesc}</Text>
            </View>
            <Switch
              value={draft.newBookings}
              onValueChange={toggle('newBookings')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={draft.newBookings ? colors.primary : colors.backgroundTertiary}
            />
          </View>

          <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.switchIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.cancellations}</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.cancellationsDesc}</Text>
            </View>
            <Switch
              value={draft.cancellations}
              onValueChange={toggle('cancellations')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={draft.cancellations ? colors.primary : colors.backgroundTertiary}
            />
          </View>

          <View style={[styles.switchItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.switchIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="card-outline" size={20} color={colors.warning} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.payments}</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.paymentsDesc}</Text>
            </View>
            <Switch
              value={draft.payments}
              onValueChange={toggle('payments')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={draft.payments ? colors.primary : colors.backgroundTertiary}
            />
          </View>

          <View style={[styles.switchItem, { borderBottomWidth: 0, borderBottomColor: colors.border }]}>
            <View style={[styles.switchIcon, { backgroundColor: colors.purpleLight }]}>
              <Ionicons name="star-outline" size={20} color={colors.purple} />
            </View>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.reviews}</Text>
              <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>{T.fields.reviewsDesc}</Text>
            </View>
            <Switch
              value={draft.reviews}
              onValueChange={toggle('reviews')}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={draft.reviews ? colors.primary : colors.backgroundTertiary}
            />
          </View>
        </View>
      </ScrollView>

      {/* Кнопка сохранения */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saveMutation.isPending && styles.saveBtnDisabled]}
          onPress={() => saveMutation.mutate(draft)}
          activeOpacity={0.8}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.buttonText} />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={20} color={colors.buttonText} />
              <Text style={[styles.saveBtnText, { color: colors.buttonText }]}>{T.save}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, fontWeight: '700' },
  switchDesc: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
