/**
 * Перевод server-side сообщений API подписок в текст для toast.
 * Бэкенд отдаёт стабильный snake_case `code` (см. SubscriptionController),
 * а английский `message` — fallback на случай отсутствия перевода.
 *
 * Использование:
 *   import { getSubscriptionServerMessage } from '@/utils/subscriptionServerMessage'
 *   const t = useTranslations('business.subscription.serverMessages')
 *   const text = getSubscriptionServerMessage(error.response?.data, t, error.message)
 */

export function getSubscriptionServerMessage(payload, t, fallback = '') {
    const data = payload || {}
    const code = data.code

    if (code) {
        try {
            const translated = t(code, { defaultValue: '' })
            if (translated) return translated
        } catch (_) {
            // ignore — упадём на fallback ниже
        }
    }

    return data.message || data.error || fallback || ''
}
