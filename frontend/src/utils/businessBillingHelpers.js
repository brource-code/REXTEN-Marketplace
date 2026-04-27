/** Laravel Payment uses `cancelled`; Stripe uses `canceled`. i18n keys follow `canceled`. */
export function billingStatusUiKey(status) {
    return status === 'cancelled' ? 'canceled' : status
}

/** Статус строки «Доходы» (платёж по брони): после capture нельзя затирать refunded / partially_refunded. */
export function bookingPaymentDisplayStatus(tx) {
    const s = tx?.status
    if (s === 'refunded' || s === 'partially_refunded') {
        return s
    }
    if (tx?.capture_status === 'captured') {
        return 'succeeded'
    }
    return s ?? 'pending'
}

/** Типовые описания Charge из Stripe (англ.) → ключи business.billing.stripeChargeLabels.* */
function stripeChargeDescriptionToKey(line) {
    if (!line || typeof line !== 'string') return null
    const d = line.trim().toLowerCase()
    if (d === 'subscription update') return 'subscriptionUpdate'
    if (d === 'subscription creation') return 'subscriptionCreation'
    if (d === 'subscription' || d === 'subscription payment') return 'subscriptionGeneric'
    return null
}

function translateStripeChargeLine(line, tBilling) {
    const key = stripeChargeDescriptionToKey(line)
    if (!key) return line
    return tBilling(`stripeChargeLabels.${key}`, { defaultValue: line })
}

export function getBillingTransactionDescription(transaction, tBilling, tSub) {
    if (transaction.type === 'subscription' && transaction.plan) {
        const planName = tSub(`plans.${transaction.plan}.name`, {
            defaultValue: transaction.plan,
        })
        const periodLabel =
            transaction.interval === 'year'
                ? tBilling('periodLabelYear')
                : tBilling('periodLabelMonth')
        return tBilling('subscriptionPayment', { planName, periodLabel })
    }
    const desc = transaction.description || ''
    const refundMatch = /^Refund:\s*(.+)$/i.exec(desc)
    if (refundMatch) {
        const inner = refundMatch[1].trim()
        const innerTranslated = translateStripeChargeLine(inner, tBilling)
        return tBilling('stripeChargeLabels.refundOf', { label: innerTranslated })
    }
    const mapped = translateStripeChargeLine(desc.trim(), tBilling)
    if (mapped !== (desc.trim())) {
        return mapped
    }
    return desc
}
