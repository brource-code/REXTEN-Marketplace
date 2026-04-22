import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getScheduleSettings,
  updateScheduleSettings,
  ScheduleSettings,
  DayScheduleSlot,
} from '../../api/business';
import { NativeHHmmTimeField } from '../../components/business/NativeHHmmTimeField';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useTheme } from '../../contexts/ThemeContext';

const T = {
  title: 'Часы работы',
  description: 'Настройка рабочего расписания',
  sections: {
    workHours: 'Рабочие дни',
    break: 'Перерыв',
    settings: 'Настройки бронирования',
  },
  days: {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
  } as Record<string, string>,
  daysShort: {
    monday: 'Пн',
    tuesday: 'Вт',
    wednesday: 'Ср',
    thursday: 'Чт',
    friday: 'Пт',
    saturday: 'Сб',
    sunday: 'Вс',
  } as Record<string, string>,
  fields: {
    enableBreak: 'Включить перерыв',
    blockPast: 'Блокировать прошедшие слоты',
    minHours: 'Мин. часов до брони',
    maxDays: 'Макс. дней вперёд',
  },
  dayOff: 'Выходной',
  save: 'Сохранить изменения',
  success: 'Настройки сохранены',
};

const DAYS: (keyof Pick<
  ScheduleSettings,
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
>)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function cloneSettings(s: ScheduleSettings): ScheduleSettings {
  return JSON.parse(JSON.stringify(s));
}

export function BusinessScheduleSettingsScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<ScheduleSettings | null>(null);

  const query = useQuery({
    queryKey: ['business-schedule-settings'],
    queryFn: getScheduleSettings,
  });

  useEffect(() => {
    if (query.data) setDraft(cloneSettings(query.data));
  }, [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const saveMutation = useMutation({
    mutationFn: (data: ScheduleSettings) => updateScheduleSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-schedule-settings'] });
      Alert.alert('Успех', T.success);
    },
    onError: (e: Error) => Alert.alert('Ошибка', e.message || 'Не удалось сохранить'),
  });

  const setDay = (key: keyof ScheduleSettings, patch: Partial<DayScheduleSlot>) => {
    if (!draft) return;
    const day = draft[key];
    if (typeof day === 'object' && day !== null && 'enabled' in day) {
      setDraft({
        ...draft,
        [key]: { ...(day as DayScheduleSlot), ...patch },
      });
    }
  };

  const setMinHours = (text: string) => {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    setDraft((d) => (d ? { ...d, minBookingHours: Number.isFinite(n) ? n : 0 } : d));
  };

  const setMaxDays = (text: string) => {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    setDraft((d) => (d ? { ...d, maxBookingDays: Number.isFinite(n) ? n : 1 } : d));
  };

  if (query.isLoading || !draft) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const breakStepMinutes = Number(draft.slot_step_minutes) || 15;

  return (
    <ScreenContainer edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Заголовок */}
        <View style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{T.title}</Text>
          <Text style={[styles.pageDesc, { color: colors.textSecondary }]}>{T.description}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Секция: Рабочие дни */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.workHours}</Text>
            </View>

            {DAYS.map((key) => {
              const day = draft[key] as DayScheduleSlot;
              return (
                <View key={key} style={[styles.dayCard, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayInfo}>
                      <Text style={[styles.dayName, { color: colors.text }]}>{T.days[key]}</Text>
                      {!day.enabled && <Text style={[styles.dayOffText, { color: colors.textMuted }]}>{T.dayOff}</Text>}
                    </View>
                    <Switch
                      value={day.enabled}
                      onValueChange={(v) => setDay(key, { enabled: v })}
                      trackColor={{ false: colors.border, true: colors.primaryLight }}
                      thumbColor={day.enabled ? colors.primary : colors.backgroundTertiary}
                    />
                  </View>
                  {day.enabled && (
                    <View style={styles.timeRow}>
                      <TextInput
                        style={[styles.timeInput, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBackground }]}
                        value={day.from}
                        onChangeText={(t) => setDay(key, { from: t })}
                        placeholder="09:00"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>—</Text>
                      <TextInput
                        style={[styles.timeInput, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBackground }]}
                        value={day.to}
                        onChangeText={(t) => setDay(key, { to: t })}
                        placeholder="18:00"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Секция: Перерыв */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="cafe-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.break}</Text>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.enableBreak}</Text>
              <Switch
                value={draft.breakEnabled}
                onValueChange={(v) => setDraft({ ...draft, breakEnabled: v })}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.breakEnabled ? colors.primary : colors.backgroundTertiary}
              />
            </View>

            {draft.breakEnabled && (
              <View style={styles.timeRow}>
                <NativeHHmmTimeField
                  value={draft.breakFrom}
                  onChange={(v) => setDraft({ ...draft, breakFrom: v })}
                  stepMinutes={breakStepMinutes}
                  placeholder="13:00"
                />
                <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>—</Text>
                <NativeHHmmTimeField
                  value={draft.breakTo}
                  onChange={(v) => setDraft({ ...draft, breakTo: v })}
                  stepMinutes={breakStepMinutes}
                  placeholder="14:00"
                />
              </View>
            )}
          </View>

          {/* Секция: Настройки бронирования */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{T.sections.settings}</Text>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>{T.fields.blockPast}</Text>
              <Switch
                value={draft.blockPastSlots}
                onValueChange={(v) => setDraft({ ...draft, blockPastSlots: v })}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={draft.blockPastSlots ? colors.primary : colors.backgroundTertiary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formItem, styles.formItemHalf]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.minHours}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  keyboardType="number-pad"
                  value={String(draft.minBookingHours)}
                  onChangeText={setMinHours}
                />
              </View>
              <View style={[styles.formItem, styles.formItemHalf]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>{T.fields.maxDays}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  keyboardType="number-pad"
                  value={String(draft.maxBookingDays)}
                  onChangeText={setMaxDays}
                />
              </View>
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
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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

  dayCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayInfo: { flex: 1 },
  dayName: { fontSize: 15, fontWeight: '700' },
  dayOffText: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeSeparator: { fontWeight: '700', fontSize: 16 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },

  formRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  formItem: { marginBottom: 0 },
  formItemHalf: { flex: 1 },
  formLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

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
