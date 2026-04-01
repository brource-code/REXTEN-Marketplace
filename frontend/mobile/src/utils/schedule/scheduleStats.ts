import { getScheduleSlotMonetaryTotal, SlotWithPrice } from './slotMonetaryTotal';

export type StatsDateRange = {
  start: Date;
  end: Date;
};

export type ScheduleStatsResult = {
  nonCancelledSum: number;
  completedSum: number;
  inProgress: number;
  inProgressRevenue: number;
  completed: number;
  total: number;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Слот попадает в [start, end) по полю start (ISO). */
export function computeScheduleStats(
  slots: Array<{ start?: string; status?: string } & SlotWithPrice>,
  dateRange: StatsDateRange | null
): ScheduleStatsResult {
  if (!dateRange?.start || !dateRange?.end) {
    return {
      nonCancelledSum: 0,
      completedSum: 0,
      inProgress: 0,
      inProgressRevenue: 0,
      completed: 0,
      total: 0,
    };
  }

  const startMs = startOfDay(dateRange.start).getTime();
  const endMs = dateRange.end.getTime();

  const filteredSlots = slots.filter((slot) => {
    if (!slot.start) return false;
    const t = new Date(slot.start).getTime();
    if (Number.isNaN(t)) return false;
    return t >= startMs && t < endMs;
  });

  const nonCancelled = filteredSlots.filter((s) => s.status !== 'cancelled');
  const completed = filteredSlots.filter((s) => s.status === 'completed');
  const inProgress = filteredSlots.filter(
    (s) => s.status === 'new' || s.status === 'pending' || s.status === 'confirmed'
  );

  const nonCancelledSum = nonCancelled.reduce((sum, slot) => sum + getScheduleSlotMonetaryTotal(slot), 0);
  const completedSum = completed.reduce((sum, slot) => sum + getScheduleSlotMonetaryTotal(slot), 0);
  const inProgressRevenue = inProgress.reduce((sum, slot) => sum + getScheduleSlotMonetaryTotal(slot), 0);

  return {
    nonCancelledSum,
    completedSum,
    inProgress: inProgress.length,
    inProgressRevenue,
    completed: completed.length,
    total: filteredSlots.length,
  };
}

/** Календарный месяц (текущая дата): [1-е число 00:00, 1-е следующего месяца 00:00). */
export function getCalendarMonthRange(anchor: Date): StatsDateRange {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
}

/** Неделя, содержащая anchor: [weekStart 00:00, weekStart+7 дней). weekStartsOn: 0=Вс, 1=Пн */
export function getWeekRangeContaining(anchor: Date, weekStartsOn: number): StatsDateRange {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function formatRangeLabel(dateRange: StatsDateRange | null): { start: string | null; end: string | null } {
  if (!dateRange?.start || !dateRange?.end) {
    return { start: null, end: null };
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (x: Date) => `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
  const start = startOfDay(dateRange.start);
  const endExclusive = new Date(dateRange.end);
  const lastInclusive = new Date(endExclusive.getTime() - 1);
  if (lastInclusive < start) {
    return { start: null, end: null };
  }
  return { start: fmt(start), end: fmt(lastInclusive) };
}
