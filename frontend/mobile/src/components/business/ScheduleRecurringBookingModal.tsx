import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  BusinessServiceItem,
  CreateRecurringBookingPayload,
  formatDateYmd,
  getBusinessClients,
  getTeamMembers,
} from '../../api/business';
import { useTheme } from '../../contexts/ThemeContext';

const PICKER_LIST_MAX_HEIGHT = 5 * 76;

type ClientMode = 'none' | 'crm' | 'manual';

type Freq = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'every_n_days';

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** По смыслу business.schedule.recurring.frequencies (en) */
const FREQUENCIES: { value: Freq; label: string }[] = [
  { value: 'weekly', label: 'Один раз в неделю' },
  { value: 'biweekly', label: 'Дважды в неделю' },
  { value: 'monthly', label: 'Один раз в месяц' },
  { value: 'bimonthly', label: 'Дважды в месяц' },
  { value: 'every_n_days', label: 'Каждые N дней' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Дата начала по умолчанию (выбранный день в календаре) */
  anchorDay: Date;
  isPending: boolean;
  onCreate: (payload: CreateRecurringBookingPayload) => void;
  activeServices: BusinessServiceItem[];
};

function normalizeTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t.trim();
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const T = {
  title: 'Регулярное бронирование',
  serviceSection: 'Услуга и специалист',
  service: 'Услуга',
  frequencySection: 'Повтор',
  frequency: 'Частота',
  daysWeek: 'Дни недели',
  dayMonth: 'Число месяца (1–31)',
  daysTwo: 'Два числа в месяце',
  intervalN: 'Интервал (дней)',
  intervalHint: 'Повтор каждые N дней',
  timeSection: 'Время и длительность',
  time: 'Время',
  duration: 'Длительность (мин)',
  priceSection: 'Цена и заметки',
  price: 'Цена',
  start: 'Дата начала',
  end: 'Дата окончания (пусто — бессрочно)',
  clientSection: 'Клиент',
  client: 'Клиент',
  none: 'Без клиента',
  crm: 'Из базы',
  manual: 'Вручную',
  specialist: 'Специалист',
  specNone: 'Не указан',
  notes: 'Заметки',
  notesPlaceholder: 'Внутренние заметки',
  cancel: 'Отмена',
  create: 'Создать цепочку',
  pickService: 'Выберите услугу',
  pickDays: 'Выберите хотя бы один день',
  pickDayMonth: 'Укажите число 1–31',
  pickTwo: 'Укажите два разных числа 1–31',
  pickInterval: 'Интервал от 1 дня',
  noServices: 'Нет активных услуг — создайте услугу в настройках.',
  namePh: 'Имя клиента',
  emailPh: 'Email',
  phonePh: 'Телефон',
};

export function ScheduleRecurringBookingModal(props: Props) {
  const { visible, onClose, anchorDay, isPending, onCreate, activeServices } = props;
  const { colors } = useTheme();

  const [selectedService, setSelectedService] = useState<BusinessServiceItem | null>(null);
  const [frequency, setFrequency] = useState<Freq>('weekly');
  const [daysWeek, setDaysWeek] = useState<number[]>([1]);
  const [dayOfMonth, setDayOfMonth] = useState('15');
  const [dayA, setDayA] = useState('1');
  const [dayB, setDayB] = useState('15');
  const [intervalDays, setIntervalDays] = useState('7');
  const [timeStr, setTimeStr] = useState('09:00');
  const [durationStr, setDurationStr] = useState('60');
  const [priceStr, setPriceStr] = useState('');
  const [startDateStr, setStartDateStr] = useState(() => formatDateYmd(new Date()));
  const [endDateStr, setEndDateStr] = useState('');
  const [clientMode, setClientMode] = useState<ClientMode>('none');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [specialistId, setSpecialistId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const clientsQ = useQuery({
    queryKey: ['business-clients-select', 'recurring-modal'],
    queryFn: () => getBusinessClients({ pageSize: 200 }),
    enabled: visible && clientMode === 'crm',
  });

  const teamQ = useQuery({
    queryKey: ['business-team', 'recurring-modal'],
    queryFn: getTeamMembers,
    enabled: visible,
  });

  const clients = clientsQ.data?.data ?? [];

  const reset = useCallback(() => {
    setSelectedService(null);
    setFrequency('weekly');
    setDaysWeek([1]);
    setDayOfMonth('15');
    setDayA('1');
    setDayB('15');
    setIntervalDays('7');
    setTimeStr('09:00');
    setDurationStr('60');
    setPriceStr('');
    setStartDateStr(formatDateYmd(anchorDay));
    setEndDateStr('');
    setClientMode('none');
    setSelectedClientId(null);
    setManualName('');
    setManualEmail('');
    setManualPhone('');
    setSpecialistId(null);
    setNotes('');
  }, [anchorDay]);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  useEffect(() => {
    if (selectedService) {
      setDurationStr(String(Math.max(15, selectedService.duration || 60)));
      setPriceStr(String(selectedService.price ?? ''));
    }
  }, [selectedService]);

  const toggleDay = useCallback((d: number) => {
    setDaysWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }, []);

  const submit = useCallback(() => {
    if (!selectedService) {
      Alert.alert('Услуга', T.pickService);
      return;
    }
    const booking_time = normalizeTime(timeStr);
    if (!/^\d{2}:\d{2}$/.test(booking_time)) {
      Alert.alert('Время', 'Формат ЧЧ:ММ');
      return;
    }
    const duration_minutes = Math.max(15, parseInt(durationStr, 10) || 60);
    const rawPrice = parseFloat(priceStr.replace(',', '.'));
    const price = Number.isFinite(rawPrice) ? Math.max(0, rawPrice) : 0;

    const payload: CreateRecurringBookingPayload = {
      service_id: selectedService.id,
      frequency,
      booking_time,
      duration_minutes,
      price,
      start_date: startDateStr.trim(),
      specialist_id: specialistId ?? undefined,
      notes: notes.trim() || undefined,
    };

    if (endDateStr.trim()) {
      payload.end_date = endDateStr.trim();
    }

    if (clientMode === 'crm' && selectedClientId) {
      payload.user_id = selectedClientId;
    } else if (clientMode === 'manual') {
      payload.client_name = manualName.trim() || undefined;
      payload.client_email = manualEmail.trim() || undefined;
      payload.client_phone = manualPhone.trim() || undefined;
    }

    if (frequency === 'weekly' || frequency === 'biweekly') {
      if (daysWeek.length === 0) {
        Alert.alert('Дни', T.pickDays);
        return;
      }
      payload.days_of_week = daysWeek;
    } else if (frequency === 'monthly') {
      const n = parseInt(dayOfMonth, 10);
      if (!Number.isFinite(n) || n < 1 || n > 31) {
        Alert.alert('Число', T.pickDayMonth);
        return;
      }
      payload.day_of_month = n;
    } else if (frequency === 'bimonthly') {
      const a = parseInt(dayA, 10);
      const b = parseInt(dayB, 10);
      if (!Number.isFinite(a) || a < 1 || a > 31 || !Number.isFinite(b) || b < 1 || b > 31 || a === b) {
        Alert.alert('Числа', T.pickTwo);
        return;
      }
      payload.days_of_month = [a, b].sort((x, y) => x - y);
    } else if (frequency === 'every_n_days') {
      const n = parseInt(intervalDays, 10);
      if (!Number.isFinite(n) || n < 1) {
        Alert.alert('Интервал', T.pickInterval);
        return;
      }
      payload.interval_days = n;
    }

    onCreate(payload);
  }, [
    selectedService,
    frequency,
    timeStr,
    durationStr,
    priceStr,
    startDateStr,
    endDateStr,
    clientMode,
    selectedClientId,
    manualName,
    manualEmail,
    manualPhone,
    specialistId,
    notes,
    daysWeek,
    dayOfMonth,
    dayA,
    dayB,
    intervalDays,
    onCreate,
  ]);

  const freqBlock = useMemo(() => {
    if (frequency === 'weekly' || frequency === 'biweekly') {
      return (
        <View style={styles.block}>
          <Text style={[styles.section, { color: colors.text }]}>{T.daysWeek}</Text>
          <View style={styles.daysGrid}>
            {DAY_LABELS.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayChip,
                  { borderColor: colors.border },
                  daysWeek.includes(i) && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                ]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[styles.dayChipTxt, { color: colors.textSecondary }, daysWeek.includes(i) && { color: colors.controlSelectedText }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    if (frequency === 'monthly') {
      return (
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{T.dayMonth}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="number-pad"
            placeholder="15"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      );
    }
    if (frequency === 'bimonthly') {
      return (
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{T.daysTwo}</Text>
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, styles.half, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={dayA}
              onChangeText={setDayA}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.half, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={dayB}
              onChangeText={setDayB}
              keyboardType="number-pad"
              placeholder="15"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      );
    }
    if (frequency === 'every_n_days') {
      return (
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{T.intervalN}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{T.intervalHint}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
            value={intervalDays}
            onChangeText={setIntervalDays}
            keyboardType="number-pad"
            placeholder="7"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      );
    }
    return null;
  }, [frequency, daysWeek, dayOfMonth, dayA, dayB, intervalDays, toggleDay, colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{T.title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.section, { color: colors.text }]}>{T.serviceSection}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.service}</Text>
            {activeServices.length === 0 ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{T.noServices}</Text>
            ) : (
              <ScrollView
                style={[styles.pickerScrollArea, { maxHeight: PICKER_LIST_MAX_HEIGHT, borderColor: colors.border, backgroundColor: colors.card }]}
                contentContainerStyle={styles.pickerScrollContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {activeServices.map((s) => {
                  const selected = selectedService?.id === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.serviceCard,
                        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                        selected && { borderColor: colors.controlSelectedBorder, backgroundColor: colors.controlSelectedBg },
                        styles.serviceCardSpacing,
                      ]}
                      onPress={() => setSelectedService(s)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.serviceCardInner}>
                        <View style={styles.serviceCardText}>
                          <Text style={[styles.svcTitle, { color: colors.text }]}>{s.name}</Text>
                          <Text style={[styles.meta, { color: colors.textSecondary }]}>
                            {s.duration} мин · ${Number(s.price).toFixed(2)}
                          </Text>
                        </View>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        ) : (
                          <View style={[styles.radioOuter, { borderColor: colors.textMuted }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={[styles.section, { color: colors.text }]}>{T.frequencySection}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.frequency}</Text>
            <View style={styles.freqWrap}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.freqChip,
                    { borderColor: colors.border },
                    frequency === f.value && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                  ]}
                  onPress={() => setFrequency(f.value)}
                >
                  <Text style={[styles.freqChipTxt, { color: colors.textSecondary }, frequency === f.value && { color: colors.controlSelectedText }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {freqBlock}

            <Text style={[styles.section, { color: colors.text }]}>{T.timeSection}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.time}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={timeStr}
              onChangeText={setTimeStr}
              placeholder="09:00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.duration}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={durationStr}
              onChangeText={setDurationStr}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.section, { color: colors.text }]}>{T.priceSection}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.price}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={priceStr}
              onChangeText={setPriceStr}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.start}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={startDateStr}
              onChangeText={setStartDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.end}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={endDateStr}
              onChangeText={setEndDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.section, { color: colors.text }]}>{T.clientSection}</Text>
            <View style={styles.segRow}>
              <TouchableOpacity
                style={[
                  styles.segBtn,
                  { borderColor: colors.border },
                  clientMode === 'none' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                ]}
                onPress={() => {
                  setClientMode('none');
                  setSelectedClientId(null);
                }}
              >
                <Text style={[styles.segText, { color: colors.textSecondary }, clientMode === 'none' && { color: colors.controlSelectedText }]}>{T.none}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segBtn,
                  { borderColor: colors.border },
                  clientMode === 'crm' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                ]}
                onPress={() => setClientMode('crm')}
              >
                <Text style={[styles.segText, { color: colors.textSecondary }, clientMode === 'crm' && { color: colors.controlSelectedText }]}>{T.crm}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segBtn,
                  { borderColor: colors.border },
                  clientMode === 'manual' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                ]}
                onPress={() => setClientMode('manual')}
              >
                <Text style={[styles.segText, { color: colors.textSecondary }, clientMode === 'manual' && { color: colors.controlSelectedText }]}>{T.manual}</Text>
              </TouchableOpacity>
            </View>

            {clientMode === 'crm' ? (
              clientsQ.isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <ScrollView
                  style={[styles.pickerScrollArea, { maxHeight: PICKER_LIST_MAX_HEIGHT, borderColor: colors.border, backgroundColor: colors.card }]}
                  contentContainerStyle={styles.pickerScrollContent}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {clients.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.serviceCard,
                        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                        selectedClientId === c.id && { borderColor: colors.controlSelectedBorder, backgroundColor: colors.controlSelectedBg },
                        styles.serviceCardSpacing,
                      ]}
                      onPress={() => setSelectedClientId(c.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.serviceCardInner}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.svcTitle, { color: colors.text }]}>{c.name}</Text>
                          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {c.email}
                          </Text>
                        </View>
                        {selectedClientId === c.id ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                        ) : (
                          <View style={[styles.radioOuter, { borderColor: colors.textMuted }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )
            ) : null}

            {clientMode === 'manual' ? (
              <>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder={T.namePh}
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                  value={manualEmail}
                  onChangeText={setManualEmail}
                  placeholder={T.emailPh}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                  value={manualPhone}
                  onChangeText={setManualPhone}
                  placeholder={T.phonePh}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </>
            ) : null}

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.specialist}</Text>
            <ScrollView
              style={[styles.pickerScrollArea, { maxHeight: PICKER_LIST_MAX_HEIGHT, borderColor: colors.border, backgroundColor: colors.card }]}
              contentContainerStyle={styles.pickerScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <TouchableOpacity
                style={[
                  styles.specialistRow,
                  { borderBottomColor: colors.backgroundTertiary, backgroundColor: colors.card },
                  specialistId === null && { backgroundColor: colors.primaryLight, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 9 },
                  styles.serviceCardSpacing,
                ]}
                onPress={() => setSpecialistId(null)}
                activeOpacity={0.85}
              >
                <Text style={[styles.specialistRowTxt, { color: colors.textSecondary }, specialistId === null && { color: colors.primaryDark }]}>
                  {T.specNone}
                </Text>
              </TouchableOpacity>
              {(teamQ.data ?? []).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.specialistRow,
                    { borderBottomColor: colors.backgroundTertiary, backgroundColor: colors.card },
                    specialistId === m.id && { backgroundColor: colors.primaryLight, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 9 },
                    styles.serviceCardSpacing,
                  ]}
                  onPress={() => setSpecialistId(m.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.specialistRowTxt, { color: colors.textSecondary }, specialistId === m.id && { color: colors.primaryDark }]} numberOfLines={2}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.notes}</Text>
            <TextInput
              style={[styles.input, styles.notes, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={T.notesPlaceholder}
              placeholderTextColor={colors.textMuted}
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btnGhost, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.btnGhostTxt, { color: colors.textSecondary }]}>{T.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.primary }, isPending && { opacity: 0.6 }]}
              onPress={submit}
              disabled={isPending}
            >
              <Text style={[styles.btnPrimaryTxt, { color: colors.buttonText }]}>{isPending ? '…' : T.create}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  card: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '94%',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  hint: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  half: { flex: 1, marginHorizontal: 4 },
  row2: { flexDirection: 'row', marginTop: 6 },
  notes: { minHeight: 64, textAlignVertical: 'top' },
  meta: { fontSize: 13, fontWeight: '700' },
  pickerScrollArea: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  pickerScrollContent: { padding: 8, paddingBottom: 4 },
  serviceCardSpacing: { marginBottom: 8 },
  serviceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  serviceCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  serviceCardText: { flex: 1, minWidth: 0 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  svcTitle: { fontSize: 16, fontWeight: '700' },
  specialistRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  specialistRowTxt: { fontSize: 14, fontWeight: '700' },
  block: { marginTop: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayChipTxt: { fontSize: 13, fontWeight: '700' },
  freqWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  freqChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  freqChipTxt: { fontSize: 12, fontWeight: '700' },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segText: { fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  btnGhost: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnGhostTxt: { fontWeight: '700' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnPrimaryTxt: { fontWeight: '700', fontSize: 15 },
});
