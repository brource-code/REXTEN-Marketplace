/**
 * Базовый префикс Dashboard (test vs live) по id объекта Stripe.
 */
export function stripeDashboardPrefix(stripeObjectId) {
    if (!stripeObjectId || typeof stripeObjectId !== 'string') {
        return 'https://dashboard.stripe.com'
    }
    return stripeObjectId.includes('_test_')
        ? 'https://dashboard.stripe.com/test'
        : 'https://dashboard.stripe.com'
}

export function stripePaymentIntentDashboardUrl(piId) {
    if (!piId) return null
    return `${stripeDashboardPrefix(piId)}/payments/${encodeURIComponent(piId)}`
}

export function stripeChargeDashboardUrl(chargeId) {
    if (!chargeId) return null
    return `${stripeDashboardPrefix(chargeId)}/payments/${encodeURIComponent(chargeId)}`
}

export function stripeCheckoutSessionSearchUrl(sessionId) {
    if (!sessionId) return null
    const p = stripeDashboardPrefix(sessionId)
    return `${p}/search?query=${encodeURIComponent(sessionId)}`
}

/**
 * Connect: платёж на connected account.
 */
export function stripeConnectPaymentDashboardUrl(connectAccountId, piId) {
    if (!connectAccountId || !piId) return null
    const p = stripeDashboardPrefix(piId)
    return `${p}/connect/accounts/${encodeURIComponent(connectAccountId)}/payments/${encodeURIComponent(piId)}`
}
