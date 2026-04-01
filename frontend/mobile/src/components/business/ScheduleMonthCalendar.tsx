import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { DateData, MarkedDates } from 'react-native-calendars/src/types';
import { useTheme } from '../../contexts/ThemeContext';

let localeReady = false;
function ensureRuLocale() {
  if (localeReady) return;
  LocaleConfig.locales.ru = {
    monthNames: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    monthNamesShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    dayNames: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    today: 'Сегодня',
  };
  LocaleConfig.defaultLocale = 'ru';
  localeReady = true;
}

type Props = {
  current: string;
  markedDates: MarkedDates;
  firstDay: 0 | 1;
  onDayPress: (day: DateData) => void;
  onMonthChange: (month: DateData) => void;
  subtitle?: string;
  /** Внутри родительской карточки — без собственной рамки (как на дашборде). */
  embedded?: boolean;
};

export function ScheduleMonthCalendar(props: Props) {
  const { colors } = useTheme();
  ensureRuLocale();

  const calendarTheme = useMemo(() => ({
    backgroundColor: colors.background,
    calendarBackground: colors.background,
    textSectionTitleColor: colors.textSecondary,
    textSectionTitleDisabledColor: colors.textMuted,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: colors.buttonText,
    todayTextColor: colors.primary,
    todayBackgroundColor: colors.backgroundTertiary,
    dayTextColor: colors.text,
    textDisabledColor: colors.textMuted,
    dotColor: colors.primary,
    selectedDotColor: colors.buttonText,
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    indicatorColor: colors.primary,
    textDayFontFamily: undefined,
    textMonthFontFamily: undefined,
    textDayHeaderFontFamily: undefined,
    textDayFontWeight: '700' as const,
    textMonthFontWeight: '700' as const,
    textDayHeaderFontWeight: '700' as const,
    textDayFontSize: 15,
    textMonthFontSize: 17,
    textDayHeaderFontSize: 12,
  }), [colors]);

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }, props.embedded && styles.wrapEmbedded]}>
      <Calendar
        current={props.current}
        firstDay={props.firstDay}
        markedDates={props.markedDates}
        markingType="multi-dot"
        hideExtraDays
        enableSwipeMonths
        onDayPress={props.onDayPress}
        onMonthChange={props.onMonthChange}
        theme={calendarTheme}
        style={styles.calendar}
      />
      {props.subtitle ? <Text style={[styles.sub, { color: colors.textSecondary }]}>{props.subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  wrapEmbedded: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  calendar: {
    paddingBottom: 4,
  },
  sub: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 4,
  },
});
