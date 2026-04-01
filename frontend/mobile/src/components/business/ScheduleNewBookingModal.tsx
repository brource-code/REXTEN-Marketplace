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
  BusinessBooking,
  BusinessServiceItem,
  CreateScheduleSlotPayload,
  formatDateYmd,
  getBusinessClients,
  getTeamMembers,
  ScheduleSlot,
} from '../../api/business';
import { getPublicWebBaseUrl } from '../../api/config';
import { useTheme } from '../../contexts/ThemeContext';

/** Высота зоны выбора: ~5 строк карточки (~76px каждая) */
const PICKER_LIST_MAX_HEIGHT = 5 * 76;

type ClientMode = 'none' | 'crm' | 'manual';

export type ScheduleNewBookingModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDay: Date;
  isPending: boolean;
  onCreate: (payload: CreateScheduleSlotPayload) => void;
  activeServices: BusinessServiceItem[];
  /** Режим редактирования (тот же id, что у брони в API) */
  editingId?: string | number | null;
  initialSlot?: ScheduleSlot | null;
  initialBooking?: BusinessBooking | null;
  onUpdate?: (id: string | number, payload: Partial<CreateScheduleSlotPayload>) => void;
};

function normalizeTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t.trim();
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function slotToYmd(slot: ScheduleSlot): string | null {
  if (slot.booking_date) return String(slot.booking_date).slice(0, 10);
  if (slot.start) return slot.start.slice(0, 10);
  return null;
}

function formatTimeFromSlot(slot: ScheduleSlot): string {
  if (slot.booking_time) {
    const s = String(slot.booking_time);
    return s.length >= 5 ? s.slice(0, 5) : s;
  }
  if (slot.start && slot.start.length >= 16) return slot.start.slice(11, 16);
  return '09:00';
}

function formatTimeFromBooking(t: string): string {
  if (!t) return '09:00';
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function formatUsd(n: number): string {
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

/** Тексты по смыслу business.schedule.modal (en) — русские формулировки */
const T = {
  newBooking: 'Новая запись',
  editBooking: 'Редактировать запись',
  date: 'Дата (ГГГГ-ММ-ДД)',
  time: 'Время',
  duration: 'Длительность (мин)',
  eventType: 'Тип записи',
  service: 'Услуга',
  customEvent: 'Своё событие',
  price: 'Цена ($)',
  titleLabel: 'Название',
  titlePlaceholder: 'Название события',
  clientBlock: 'Клиент',
  clientNone: 'Без клиента',
  clientCrm: 'Из базы',
  clientManual: 'Вручную',
  clientReadonly: 'Клиент (из записи; смена через CRM на вебе)',
  specialist: 'Специалист',
  specialistNone: 'Не указан',
  specialistNoneHint: 'Без назначенного специалиста',
  notes: 'Заметки',
  notesPlaceholder: 'Внутренние заметки к записи',
  status: 'Статус',
  cancel: 'Отмена',
  create: 'Создать',
  save: 'Сохранить',
  noServices: 'Нет активных услуг — выберите «Своё событие»',
  pickService: 'Выберите услугу',
  namePh: 'Имя клиента',
  emailPh: 'Email',
  phonePh: 'Телефон',
  subtotal: 'Промежуточная сумма',
  discount: 'Скидка',
  total: 'Итого',
  addOns: 'Доп. услуги',
  reviewTitle: 'Ссылка на отзыв для клиента',
  reviewHint: 'Отправьте клиенту; удерживайте текст для копирования',
  addOnLine: (name: string, q: number, sum: string) => `${name} × ${q} — ${sum}`,
  economySection: 'Сумма по записи',
};

function discountCaption(e: {
  discountSource: string | null | undefined;
  promoCode: string | null | undefined;
  tierName: string | null | undefined;
}): string {
  if (e.discountSource === 'promo_code' && e.promoCode) return `Промокод ${e.promoCode}`;
  if (e.discountSource === 'loyalty_tier' && e.tierName) return `Лояльность (${e.tierName})`;
  return 'Скидка';
}

const STATUS_OPTIONS: Array<{ id: NonNullable<CreateScheduleSlotPayload['status']>; label: string }> = [
  { id: 'new', label: 'Новый' },
  { id: 'pending', label: 'Ожидает' },
  { id: 'confirmed', label: 'Подтверждён' },
  { id: 'completed', label: 'Завершено' },
  { id: 'cancelled', label: 'Отменено' },
];

export function ScheduleNewBookingModal(props: ScheduleNewBookingModalProps) {
  const {
    visible,
    onClose,
    selectedDay,
    isPending,
    onCreate,
    onUpdate,
    activeServices,
    editingId,
    initialSlot,
    initialBooking,
  } = props;

  const { colors } = useTheme();
  const isEdit = Boolean(editingId != null && onUpdate);

  const [mode, setMode] = useState<'service' | 'custom'>('service');
  const [dateStr, setDateStr] = useState(() => formatDateYmd(selectedDay));
  const [timeStr, setTimeStr] = useState('09:00');
  const [durationStr, setDurationStr] = useState('60');
  const [customTitle, setCustomTitle] = useState('');
  const [customPriceStr, setCustomPriceStr] = useState('');
  const [servicePriceStr, setServicePriceStr] = useState('');
  const [selectedService, setSelectedService] = useState<BusinessServiceItem | null>(null);
  const [serviceMissingLabel, setServiceMissingLabel] = useState<string | null>(null);
  const [clientMode, setClientMode] = useState<ClientMode>('none');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [specialistId, setSpecialistId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<NonNullable<CreateScheduleSlotPayload['status']>>('confirmed');

  const clientsQ = useQuery({
    queryKey: ['business-clients-select', 'schedule-modal'],
    queryFn: () => getBusinessClients({ pageSize: 200 }),
    enabled: visible && clientMode === 'crm' && !isEdit,
  });

  const teamQ = useQuery({
    queryKey: ['business-team', 'schedule-modal'],
    queryFn: getTeamMembers,
    enabled: visible,
  });

  const clients = clientsQ.data?.data ?? [];

  const reset = useCallback(() => {
    setMode('service');
    setDateStr(formatDateYmd(selectedDay));
    setTimeStr('09:00');
    setDurationStr('60');
    setCustomTitle('');
    setCustomPriceStr('');
    setServicePriceStr('');
    setSelectedService(null);
    setServiceMissingLabel(null);
    setClientMode('none');
    setSelectedClientId(null);
    setManualName('');
    setManualEmail('');
    setManualPhone('');
    setSpecialistId(null);
    setNotes('');
    setStatus('confirmed');
  }, [selectedDay]);

  const applyFromSlot = useCallback(
    (slot: ScheduleSlot) => {
      setDateStr(slotToYmd(slot) || formatDateYmd(selectedDay));
      setTimeStr(formatTimeFromSlot(slot));
      setDurationStr(String(Math.max(15, slot.duration_minutes ?? 60)));
      setStatus((slot.status as CreateScheduleSlotPayload['status']) || 'confirmed');
      setNotes(slot.notes?.trim() ? String(slot.notes) : '');
      setSpecialistId(
        slot.specialist_id != null && slot.specialist_id !== ''
          ? Number(slot.specialist_id)
          : null
      );

      const sid = slot.service_id;
      const isCustom = !sid && Boolean(slot.title);
      if (isCustom) {
        setMode('custom');
        setCustomTitle(slot.title || '');
        const p = slot.price ?? slot.total_price;
        const num = typeof p === 'string' ? parseFloat(p) : Number(p);
        setCustomPriceStr(Number.isFinite(num) && num > 0 ? String(num) : '');
        setSelectedService(null);
        setServiceMissingLabel(null);
      } else {
        setMode('service');
        const found = activeServices.find((s) => String(s.id) === String(sid));
        if (found) {
          setSelectedService(found);
          setServiceMissingLabel(null);
        } else {
          setSelectedService(null);
          setServiceMissingLabel(slot.service?.name || 'Услуга');
        }
        const p = slot.price ?? slot.total_price;
        const num = typeof p === 'string' ? parseFloat(p) : Number(p);
        setServicePriceStr(Number.isFinite(num) ? String(num) : '');
      }

      if (slot.user_id) {
        setClientMode('crm');
        setSelectedClientId(slot.user_id);
      } else if (slot.client_name || slot.client?.name || slot.client?.email || slot.client?.phone) {
        setClientMode('manual');
        setManualName(slot.client_name || slot.client?.name || '');
        setManualEmail(slot.client?.email || '');
        setManualPhone(slot.client?.phone || '');
      } else {
        setClientMode('none');
        setSelectedClientId(null);
        setManualName('');
        setManualEmail('');
        setManualPhone('');
      }
    },
    [activeServices, selectedDay]
  );

  const applyFromBooking = useCallback(
    (b: BusinessBooking) => {
      setDateStr(b.booking_date.slice(0, 10));
      setTimeStr(formatTimeFromBooking(b.booking_time));
      setDurationStr(String(Math.max(15, b.duration_minutes || 60)));
      setStatus((b.status as CreateScheduleSlotPayload['status']) || 'confirmed');
      setNotes(b.notes?.trim() ? String(b.notes) : '');
      setSpecialistId(b.specialist?.id != null ? Number(b.specialist.id) : null);
      setMode('service');
      const found = activeServices.find((s) => s.id === b.service.id);
      if (found) {
        setSelectedService(found);
        setServiceMissingLabel(null);
      } else {
        setSelectedService(null);
        setServiceMissingLabel(b.service.name);
      }
      setServicePriceStr(String(b.price ?? ''));
      if (b.client?.id) {
        setClientMode('crm');
        setSelectedClientId(b.client.id);
      } else {
        setClientMode('none');
        setSelectedClientId(null);
      }
    },
    [activeServices]
  );

  useEffect(() => {
    if (!visible) return;
    if (isEdit && initialBooking) {
      applyFromBooking(initialBooking);
    } else if (isEdit && initialSlot) {
      applyFromSlot(initialSlot);
    } else {
      reset();
    }
  }, [visible, isEdit, initialBooking?.id, initialSlot?.id, applyFromBooking, applyFromSlot, reset]);

  /** Выбор услуги: длительность и цена как в каталоге (в т.ч. при редактировании записи). */
  const pickService = useCallback((s: BusinessServiceItem) => {
    setSelectedService(s);
    if (mode === 'service') {
      setDurationStr(String(Math.max(15, s.duration || 60)));
      const n = Number(s.price);
      if (Number.isFinite(n)) {
        setServicePriceStr(n.toFixed(2));
      } else {
        setServicePriceStr('');
      }
    }
  }, [mode]);

  const bookingDateStr = useMemo(() => formatDateYmd(selectedDay), [selectedDay]);

  /** Скидки / итог / отзыв — только просмотр при редактировании (данные с API, как в ScheduleSlotModal на вебе). */
  const editEconomics = useMemo(() => {
    if (!isEdit) return null;
    const s = initialSlot;
    const b = initialBooking;
    const reviewToken = (s?.review_token ?? b?.review_token) || null;
    const discountAmount = Number(s?.discount_amount ?? b?.discount_amount ?? 0);
    const discountSource = s?.discount_source ?? b?.discount_source ?? null;
    const tierName = s?.discount_tier_name ?? b?.discount_tier_name ?? null;
    const promoCode = s?.promo_code ?? b?.promo_code ?? null;
    const base = Number(s?.price ?? b?.price ?? 0);
    const total = Number(s?.total_price ?? b?.total_price ?? base);
    const rawAdd = s?.additional_services ?? b?.additional_services;
    const addOns = Array.isArray(rawAdd) ? rawAdd : [];
    return {
      reviewToken,
      discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      discountSource,
      tierName,
      promoCode,
      base: Number.isFinite(base) ? base : 0,
      total: Number.isFinite(total) ? total : base,
      addOns,
    };
  }, [isEdit, initialSlot, initialBooking]);

  const showEditEconomyBlock = useMemo(() => {
    if (!isEdit || !editEconomics) return false;
    const e = editEconomics;
    return (
      Boolean(e.reviewToken) ||
      e.discountAmount > 0 ||
      e.addOns.length > 0 ||
      (e.base > 0 && Math.abs(e.total - e.base) > 0.005)
    );
  }, [isEdit, editEconomics]);

  const buildUpdatePayload = useCallback((): Partial<CreateScheduleSlotPayload> => {
    const booking_date = dateStr.trim();
    const booking_time = normalizeTime(timeStr);
    const duration_minutes = Math.max(15, parseInt(durationStr, 10) || 60);
    const out: Partial<CreateScheduleSlotPayload> = {
      booking_date,
      booking_time,
      duration_minutes,
      status,
      notes: notes.trim() || undefined,
      /** null снимает специалиста; undefined не отправляем — здесь всегда явное значение */
      specialist_id: specialistId === null ? null : specialistId,
    };
    if (mode === 'service' && selectedService) {
      out.service_id = selectedService.id;
      out.advertisement_id = selectedService.advertisement_id ?? null;
    }
    if (mode === 'custom') {
      out.title = customTitle.trim();
      const raw = parseFloat(customPriceStr.replace(',', '.'));
      const price = Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
      out.price = price > 0 ? price : undefined;
    } else if (servicePriceStr.trim()) {
      const raw = parseFloat(servicePriceStr.replace(',', '.'));
      if (Number.isFinite(raw) && raw >= 0) {
        out.price = Math.round(raw * 100) / 100;
      }
    }
    return out;
  }, [
    dateStr,
    timeStr,
    durationStr,
    status,
    notes,
    specialistId,
    mode,
    selectedService,
    customTitle,
    customPriceStr,
    servicePriceStr,
  ]);

  const submit = useCallback(() => {
    const booking_date = isEdit ? dateStr.trim() : bookingDateStr;
    const booking_time = normalizeTime(timeStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
      Alert.alert('Дата', 'Укажите дату в формате ГГГГ-ММ-ДД');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(booking_time)) {
      Alert.alert('Время', 'Укажите время в формате ЧЧ:ММ');
      return;
    }
    const duration_minutes = Math.max(15, parseInt(durationStr, 10) || 60);

    if (isEdit && editingId != null && onUpdate) {
      if (mode === 'custom' && !customTitle.trim()) {
        Alert.alert('Название', 'Введите название события');
        return;
      }
      onUpdate(editingId, buildUpdatePayload());
      return;
    }

    const base: CreateScheduleSlotPayload = {
      booking_date,
      booking_time,
      duration_minutes,
      status,
      specialist_id: specialistId ?? undefined,
      notes: notes.trim() || undefined,
    };

    if (clientMode === 'crm' && selectedClientId) {
      base.user_id = selectedClientId;
    } else if (clientMode === 'manual') {
      base.client_name = manualName.trim() || undefined;
      base.client_email = manualEmail.trim() || undefined;
      base.client_phone = manualPhone.trim() || undefined;
    }

    if (mode === 'service') {
      if (!selectedService) {
        Alert.alert('Услуга', T.pickService);
        return;
      }
      const raw = parseFloat(servicePriceStr.replace(',', '.'));
      const fromField = Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) / 100 : NaN;
      const servicePrice = Number.isFinite(fromField) ? fromField : Number(selectedService.price ?? 0);
      onCreate({
        ...base,
        duration_minutes: selectedService.duration ? selectedService.duration : duration_minutes,
        service_id: selectedService.id,
        price: servicePrice,
        advertisement_id: selectedService.advertisement_id ?? undefined,
      });
      return;
    }

    const title = customTitle.trim();
    if (!title) {
      Alert.alert('Название', 'Введите название события');
      return;
    }
    const raw = parseFloat(customPriceStr.replace(',', '.'));
    const price = Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0;
    onCreate({
      ...base,
      duration_minutes,
      title,
      price: price > 0 ? price : undefined,
    });
  }, [
    isEdit,
    dateStr,
    bookingDateStr,
    timeStr,
    durationStr,
    mode,
    selectedService,
    customTitle,
    customPriceStr,
    servicePriceStr,
    onCreate,
    clientMode,
    selectedClientId,
    manualName,
    manualEmail,
    manualPhone,
    specialistId,
    notes,
    status,
    editingId,
    onUpdate,
    buildUpdatePayload,
  ]);

  const titleText = isEdit ? T.editBooking : T.newBooking;
  const primaryLabel = isEdit ? T.save : T.create;
  const showDatePicker = isEdit;

  const readonlyClientLine = useMemo(() => {
    if (!isEdit) return null;
    if (initialBooking?.client?.name) {
      return `${initialBooking.client.name}${initialBooking.client.phone ? ` · ${initialBooking.client.phone}` : ''}`;
    }
    if (initialSlot?.client?.name) {
      return `${initialSlot.client.name}`;
    }
    if (initialSlot?.client_name) return initialSlot.client_name;
    return null;
  }, [isEdit, initialBooking, initialSlot]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{titleText}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.date}</Text>
            {showDatePicker ? (
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2026-03-27"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            ) : (
              <Text style={[styles.readonly, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}>{bookingDateStr}</Text>
            )}

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
              placeholder="60"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.eventType}</Text>
            <View style={styles.segRow}>
              <TouchableOpacity
                style={[
                  styles.segBtn,
                  { borderColor: colors.border },
                  mode === 'service' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                  isEdit && styles.segDisabled,
                ]}
                onPress={() => !isEdit && setMode('service')}
                disabled={isEdit}
              >
                <Text style={[styles.segText, { color: colors.textSecondary }, mode === 'service' && { color: colors.controlSelectedText }]}>{T.service}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segBtn,
                  { borderColor: colors.border },
                  mode === 'custom' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                  isEdit && styles.segDisabled,
                ]}
                onPress={() => !isEdit && setMode('custom')}
                disabled={isEdit}
              >
                <Text style={[styles.segText, { color: colors.textSecondary }, mode === 'custom' && { color: colors.controlSelectedText }]}>{T.customEvent}</Text>
              </TouchableOpacity>
            </View>
            {mode === 'custom' ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{T.titleLabel}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder={T.titlePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  editable={mode === 'custom'}
                />
                <Text style={[styles.label, { color: colors.textSecondary }]}>{T.price}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                  value={customPriceStr}
                  onChangeText={setCustomPriceStr}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  editable={mode === 'custom'}
                />
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{T.service}</Text>
                {activeServices.length === 0 && !serviceMissingLabel ? (
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
                          onPress={() => pickService(s)}
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
                    {serviceMissingLabel ? (
                      <View style={[styles.serviceCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }, styles.serviceCardDisabled, styles.serviceCardSpacing]}>
                        <Text style={[styles.svcTitle, { color: colors.text }]}>{serviceMissingLabel}</Text>
                        <Text style={[styles.meta, { color: colors.textSecondary }]}>Нет в списке активных услуг</Text>
                      </View>
                    ) : null}
                  </ScrollView>
                )}
                {(isEdit || selectedService) && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{T.price}</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
                      value={servicePriceStr}
                      onChangeText={setServicePriceStr}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </>
                )}
              </>
            )}

            <Text style={[styles.section, { color: colors.text }]}>{T.status}</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={[
                    styles.statusChip,
                    { borderColor: colors.border },
                    status === o.id && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                  ]}
                  onPress={() => setStatus(o.id)}
                >
                  <Text style={[styles.statusChipTxt, { color: colors.textSecondary }, status === o.id && { color: colors.controlSelectedText }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isEdit ? (
              <View style={styles.readonlyBlock}>
                <Text style={[styles.section, { color: colors.text }]}>{T.clientBlock}</Text>
                <Text style={[styles.hint, { color: colors.textMuted }]}>{T.clientReadonly}</Text>
                <Text style={[styles.readonlyClientText, { color: colors.text }]}>{readonlyClientLine || '—'}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.section, { color: colors.text }]}>{T.clientBlock}</Text>
                <View style={styles.segRow}>
                  <TouchableOpacity
                    style={[
                      styles.segBtnSm,
                      { borderColor: colors.border },
                      clientMode === 'none' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                    ]}
                    onPress={() => {
                      setClientMode('none');
                      setSelectedClientId(null);
                    }}
                  >
                    <Text style={[styles.segText, { color: colors.textSecondary }, clientMode === 'none' && { color: colors.controlSelectedText }]}>{T.clientNone}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segBtnSm,
                      { borderColor: colors.border },
                      clientMode === 'crm' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                    ]}
                    onPress={() => setClientMode('crm')}
                  >
                    <Text style={[styles.segText, { color: colors.textSecondary }, clientMode === 'crm' && { color: colors.controlSelectedText }]}>{T.clientCrm}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segBtnSm,
                      { borderColor: colors.border },
                      clientMode === 'manual' && { backgroundColor: colors.controlSelectedBg, borderColor: colors.controlSelectedBorder },
                    ]}
                    onPress={() => setClientMode('manual')}
                  >
                    <Text style={[styles.segText, { color: colors.textSecondary }, clientMode === 'manual' && { color: colors.controlSelectedText }]}>{T.clientManual}</Text>
                  </TouchableOpacity>
                </View>

                {clientMode === 'crm' ? (
                  clientsQ.isLoading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                  ) : clients.length === 0 ? (
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>Клиентов не найдено</Text>
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
                        >
                          <View style={styles.serviceCardInner}>
                            <View>
                              <Text style={[styles.svcTitle, { color: colors.text }]}>{c.name}</Text>
                              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                                {c.email}
                              </Text>
                            </View>
                            {selectedClientId === c.id ? (
                              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                            ) : (
                              <View style={[styles.radioOuterSm, { borderColor: colors.textMuted }]} />
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
              </>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.specialist}</Text>
            {teamQ.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView
                style={[styles.pickerScrollArea, { maxHeight: PICKER_LIST_MAX_HEIGHT, borderColor: colors.border, backgroundColor: colors.card }]}
                contentContainerStyle={styles.pickerScrollContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <TouchableOpacity
                  style={[
                    styles.serviceCard,
                    { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                    specialistId === null && { borderColor: colors.controlSelectedBorder, backgroundColor: colors.controlSelectedBg },
                    styles.serviceCardSpacing,
                  ]}
                  onPress={() => setSpecialistId(null)}
                  activeOpacity={0.85}
                >
                  <View style={styles.serviceCardInner}>
                    <View style={styles.serviceCardText}>
                      <Text style={[styles.svcTitle, { color: colors.text }]}>{T.specialistNone}</Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>{T.specialistNoneHint}</Text>
                    </View>
                    {specialistId === null ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    ) : (
                      <View style={[styles.radioOuter, { borderColor: colors.textMuted }]} />
                    )}
                  </View>
                </TouchableOpacity>
                {(teamQ.data ?? []).map((m) => {
                  const mid = Number(m.id);
                  const selected = specialistId !== null && specialistId === mid;
                  const metaLine = [m.role, m.email].filter(Boolean).join(' · ');
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.serviceCard,
                        { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                        selected && { borderColor: colors.controlSelectedBorder, backgroundColor: colors.controlSelectedBg },
                        styles.serviceCardSpacing,
                      ]}
                      onPress={() => setSpecialistId(mid)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.serviceCardInner}>
                        <View style={styles.serviceCardText}>
                          <Text style={[styles.svcTitle, { color: colors.text }]}>{m.name}</Text>
                          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
                            {metaLine || '—'}
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

            {isEdit && showEditEconomyBlock && editEconomics ? (
              <View style={[styles.economyReadonly, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.section, { color: colors.text }]}>{T.economySection}</Text>
                {editEconomics.base > 0 ? (
                  <View style={styles.economyRow}>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>{T.subtotal}</Text>
                    <Text style={[styles.economyValue, { color: colors.text }]}>{formatUsd(editEconomics.base)}</Text>
                  </View>
                ) : null}
                {editEconomics.addOns.map((row, idx) => {
                  const q = Math.max(1, Number(row.quantity ?? 1));
                  const unit = Number(row.price ?? 0);
                  const name = row.name ?? `Доп. #${row.id ?? idx}`;
                  return (
                    <View key={`${row.id ?? idx}-${idx}`} style={styles.economyRow}>
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
                        {T.addOnLine(name, q, formatUsd(unit * q))}
                      </Text>
                    </View>
                  );
                })}
                {editEconomics.discountAmount > 0 ? (
                  <View style={styles.economyRow}>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>{discountCaption(editEconomics)}</Text>
                    <Text style={[styles.economyDiscount, { color: colors.error }]}>−{formatUsd(editEconomics.discountAmount)}</Text>
                  </View>
                ) : null}
                {editEconomics.total > 0 || editEconomics.discountAmount > 0 ? (
                  <View style={styles.economyRow}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{T.total}</Text>
                    <Text style={[styles.economyValue, { color: colors.text }]}>{formatUsd(editEconomics.total)}</Text>
                  </View>
                ) : null}
                {editEconomics.reviewToken ? (
                  <View style={[styles.reviewBlock, { borderTopColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{T.reviewTitle}</Text>
                    <Text style={[styles.reviewHint, { color: colors.textSecondary }]}>{T.reviewHint}</Text>
                    <Text selectable style={[styles.reviewUrl, { color: colors.primary }]}>
                      {`${getPublicWebBaseUrl()}/review/${editEconomics.reviewToken}`}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.textSecondary }]}>{T.notes}</Text>
            <TextInput
              style={[styles.input, styles.notes, { borderColor: colors.border, color: colors.inputText, backgroundColor: colors.inputBackground }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={T.notesPlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
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
              <Text style={[styles.btnPrimaryTxt, { color: colors.buttonText }]}>{isPending ? '…' : primaryLabel}</Text>
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
    maxHeight: '92%',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  hint: { fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 4 },
  readonly: {
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: '700',
  },
  readonlyBlock: { marginTop: 4 },
  readonlyClientText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  meta: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segBtnSm: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segDisabled: { opacity: 0.85 },
  segText: { fontWeight: '700', fontSize: 13 },
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
  serviceCardDisabled: { opacity: 0.9 },
  serviceCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  serviceCardText: { flex: 1, minWidth: 0 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  radioOuterSm: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  svcTitle: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusChipTxt: { fontSize: 12, fontWeight: '700' },
  economyReadonly: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  economyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  economyValue: { fontSize: 14, fontWeight: '700' },
  economyDiscount: { fontSize: 14, fontWeight: '700' },
  reviewBlock: { marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  reviewHint: { fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 8 },
  reviewUrl: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnGhost: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnGhostTxt: { fontWeight: '700' },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnPrimaryTxt: { fontWeight: '700', fontSize: 16 },
});
