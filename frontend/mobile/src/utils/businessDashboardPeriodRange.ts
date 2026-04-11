/** Границы периода как на вебе / Laravel DashboardController (ISO-неделя с понедельника). */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDdMmYyyy(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function startOfISOWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.setDate(diff))
}

function startOfCalendarQuarter(d: Date): Date {
  const m = d.getMonth()
  const startMonth = Math.floor(m / 3) * 3
  return new Date(d.getFullYear(), startMonth, 1)
}

export type BusinessPreset = 'today' | 'week' | 'month' | 'quarter' | 'year'

/**
 * Согласовано с frontend/src/utils/businessDashboardPeriodRange.js
 */
export function getBusinessPresetDateRange(preset: BusinessPreset): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const dateTo = toYmd(today)
  let fromDate: Date
  switch (preset) {
    case 'today':
      return { dateFrom: dateTo, dateTo }
    case 'week':
      fromDate = startOfISOWeek(today)
      break
    case 'month':
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    case 'quarter':
      fromDate = startOfCalendarQuarter(today)
      break
    case 'year':
      fromDate = new Date(today.getFullYear(), 0, 1)
      break
    default:
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
  }
  return { dateFrom: toYmd(fromDate), dateTo }
}

export function detectBusinessPresetFromDates(
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined
): BusinessPreset | null {
  if (!dateFrom || !dateTo) return null
  const presets: BusinessPreset[] = ['today', 'week', 'month', 'quarter', 'year']
  for (const p of presets) {
    const r = getBusinessPresetDateRange(p)
    if (r.dateFrom === dateFrom && r.dateTo === dateTo) return p
  }
  return null
}

export function getBusinessDashboardPeriodRange(
  period: 'thisWeek' | 'thisMonth' | 'thisYear'
): { from: string; to: string } {
  const map: Record<'thisWeek' | 'thisMonth' | 'thisYear', BusinessPreset> = {
    thisWeek: 'week',
    thisMonth: 'month',
    thisYear: 'year',
  }
  const preset = map[period] ?? 'month'
  const { dateFrom, dateTo } = getBusinessPresetDateRange(preset)
  const [yf, mf, df] = dateFrom.split('-').map(Number)
  const [yt, mt, dt] = dateTo.split('-').map(Number)
  return {
    from: formatDdMmYyyy(new Date(yf, mf - 1, df)),
    to: formatDdMmYyyy(new Date(yt, mt - 1, dt)),
  }
}
