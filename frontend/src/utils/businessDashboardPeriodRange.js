import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

/**
 * Границы периода для карточек обзора на бизнес-дашборде (совпадают с Laravel DashboardController@stats):
 * неделя — с понедельника текущей ISO-недели по сегодня,
 * месяц — с 1-го числа по сегодня,
 * год — с 1 января по сегодня.
 */
export function getBusinessDashboardPeriodRange(period) {
    const today = dayjs()
    const to = today.format('DD.MM.YYYY')
    let from
    if (period === 'thisWeek') {
        from = today.startOf('isoWeek').format('DD.MM.YYYY')
    } else if (period === 'thisMonth') {
        from = today.startOf('month').format('DD.MM.YYYY')
    } else {
        from = today.startOf('year').format('DD.MM.YYYY')
    }
    return { from, to }
}
