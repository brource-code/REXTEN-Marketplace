/** Границы периода как на вебе / Laravel DashboardController (ISO-неделя с понедельника). */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDdMmYyyy(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function startOfISOWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export function getBusinessDashboardPeriodRange(
  period: 'thisWeek' | 'thisMonth' | 'thisYear'
): { from: string; to: string } {
  const today = new Date();
  const to = formatDdMmYyyy(today);
  let fromDate: Date;
  if (period === 'thisWeek') {
    fromDate = startOfISOWeek(today);
  } else if (period === 'thisMonth') {
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  } else {
    fromDate = new Date(today.getFullYear(), 0, 1);
  }
  return { from: formatDdMmYyyy(fromDate), to };
}
