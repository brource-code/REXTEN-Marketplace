/** Laravel Payment uses `cancelled`; Stripe uses `canceled`. i18n keys follow `canceled`. */
export function billingStatusUiKey(status) {
    return status === 'cancelled' ? 'canceled' : status
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
    return transaction.description
}
