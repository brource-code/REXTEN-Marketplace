import { csvFormatRows } from 'd3-dsv'
import { formatDateLocalized } from '@/utils/dateTime'
import {
    billingStatusUiKey,
    bookingPaymentDisplayStatus,
    getBillingTransactionDescription,
} from '@/utils/businessBillingHelpers'

function fmtMoney(n) {
    if (n == null || Number.isNaN(Number(n))) return ''
    return Number(n).toFixed(2)
}

function earningsStatusLabel(tx, t) {
    const displayStatus = bookingPaymentDisplayStatus(tx)
    const statusKey = billingStatusUiKey(displayStatus)
    return t(`statuses.${statusKey}`, { defaultValue: displayStatus })
}

function expensesStatusLabel(tx, t) {
    const statusKey = billingStatusUiKey(tx.status)
    return t(`statuses.${statusKey}`, { defaultValue: tx.status })
}

/**
 * @param {'earnings'|'expenses'} section
 * @param {object[]} transactions filtered list
 * @param {function} t useTranslations('business.billing')
 * @param {function} tSub useTranslations('business.subscription')
 */
export function buildBusinessBillingAoa(section, transactions, t, tSub, billingTxTimezone, locale) {
    if (section === 'earnings') {
        const headers = [
            t('columns.date'),
            t('export.columns.bookingType'),
            t('export.columns.service'),
            t('export.columns.client'),
            t('export.columns.grossAmount'),
            t('export.columns.platformFee'),
            t('export.columns.netAmount'),
            t('export.columns.currency'),
            t('columns.status'),
        ]
        const rows = transactions.map((tx) => {
            const net = tx.net_amount != null ? tx.net_amount : tx.amount
            return [
                formatDateLocalized(tx.created, billingTxTimezone, locale),
                t('earningsDescription', { defaultValue: 'Booking payment' }),
                tx.service_name ?? '',
                tx.client_name ?? '',
                fmtMoney(tx.amount),
                fmtMoney(tx.platform_fee ?? 0),
                fmtMoney(net),
                (tx.currency || 'USD').toUpperCase(),
                earningsStatusLabel(tx, t),
            ]
        })
        return [headers, ...rows]
    }

    const headers = [
        t('columns.date'),
        t('columns.type'),
        t('columns.description'),
        t('columns.amount'),
        t('export.columns.currency'),
        t('columns.status'),
    ]
    const rows = transactions.map((tx) => {
        const raw = Number(tx.amount) || 0
        const signed = tx.type === 'refund' ? -raw : raw
        return [
            formatDateLocalized(tx.created, billingTxTimezone, locale),
            t(`types.${tx.type}`, { defaultValue: tx.type }),
            getBillingTransactionDescription(tx, t, tSub),
            fmtMoney(signed),
            (tx.currency || 'USD').toUpperCase(),
            expensesStatusLabel(tx, t),
        ]
    })
    return [headers, ...rows]
}

export function downloadBillingCsv(filename, aoa) {
    const csv = '\uFEFF' + csvFormatRows(aoa)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export async function downloadBillingXlsx(filename, sheetName, aoa) {
    const XLSX = await import('xlsx')
    const safeName = sheetName.replace(/[:\\/?*[\]]/g, '_').slice(0, 31)
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, safeName || 'Sheet1')
    XLSX.writeFile(wb, filename)
}

export function billingExportFilename(section, ext) {
    const d = new Date().toISOString().slice(0, 10)
    return `billing-${section}-${d}.${ext}`
}
