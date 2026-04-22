import React, { useMemo, useState, useCallback } from 'react';
import {
  Platform,
  TouchableOpacity,
  Text,
  View,
  Modal,
  StyleSheet,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useThemedStyles } from '../../hooks/useThemedStyles';

/** Типы пакета не всегда совпадают с iOS/Android union props */
const TimePicker = DateTimePicker as React.ComponentType<Record<string, unknown>>;

type Props = {
  value: string;
  onChange: (hhmm: string) => void;
  stepMinutes?: number;
  placeholder?: string;
};

function parseToDate(hhmm: string): Date {
  const d = new Date();
  const [sh, sm] = (hhmm || '00:00').split(':');
  const h = Math.min(23, Math.max(0, parseInt(sh, 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(sm, 10) || 0));
  d.setHours(h, m, 0, 0);
  return d;
}

function toHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function snapDate(d: Date, stepMinutes: number): Date {
  const step = Math.max(1, stepMinutes || 15);
  const total = d.getHours() * 60 + d.getMinutes();
  const snapped = Math.floor(total / step) * step;
  const out = new Date(d);
  out.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
  return out;
}

const IOS_MINUTE_INTERVALS = new Set([1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30]);

/**
 * Выбор времени в формате «часы:минуты» для API (HH:mm), как нативный пикер в веб-драйвере бронирования:
 * iOS/Android показывают системный time picker; отображение подписи — по локали устройства (12/24h).
 */
export function NativeHHmmTimeField({
  value,
  onChange,
  stepMinutes = 15,
  placeholder = '—',
}: Props) {
  const { colors, text } = useThemedStyles();
  const [androidOpen, setAndroidOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(() => snapDate(parseToDate(value), stepMinutes));

  const minuteInterval = useMemo(() => {
    const s = Math.max(1, stepMinutes || 15);
    return IOS_MINUTE_INTERVALS.has(s) ? s : 15;
  }, [stepMinutes]);

  const label = useMemo(() => {
    if (!value || !/^\d{1,2}:\d{2}$/.test(value.trim())) return placeholder;
    const d = parseToDate(value);
    try {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return value;
    }
  }, [value, placeholder]);

  const openPicker = useCallback(() => {
    const base = snapDate(parseToDate(value), stepMinutes);
    setIosDraft(base);
    if (Platform.OS === 'android') {
      setAndroidOpen(true);
    } else {
      setIosOpen(true);
    }
  }, [value, stepMinutes]);

  const onAndroidChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setAndroidOpen(false);
      if (event.type === 'dismissed' || !date) return;
      onChange(toHHmm(snapDate(date, stepMinutes)));
    },
    [onChange, stepMinutes],
  );

  const commitIos = useCallback(() => {
    onChange(toHHmm(snapDate(iosDraft, stepMinutes)));
    setIosOpen(false);
  }, [iosDraft, onChange, stepMinutes]);

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        style={[local.touch, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <Text style={[text, local.touchText]}>{label}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && androidOpen && (
        <TimePicker
          value={snapDate(parseToDate(value), stepMinutes)}
          mode="time"
          display="default"
          onChange={onAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && iosOpen && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setIosOpen(false)}>
          <View style={local.modalBackdrop}>
            <View style={[local.modalCard, { backgroundColor: colors.card }]}>
              <TimePicker
                value={iosDraft}
                mode="time"
                display="spinner"
                // iOS: только фиксированный набор шагов минут
                minuteInterval={minuteInterval}
                onChange={(_e: DateTimePickerEvent, d?: Date) => {
                  if (d) setIosDraft(d);
                }}
              />
              <View style={local.modalActions}>
                <TouchableOpacity onPress={() => setIosOpen(false)} style={local.modalBtn}>
                  <Text style={[text, { color: colors.textSecondary }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={commitIos} style={local.modalBtn}>
                  <Text style={[text, { color: colors.primary, fontWeight: '700' }]}>Готово</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const local = StyleSheet.create({
  touch: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  touchText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
});
