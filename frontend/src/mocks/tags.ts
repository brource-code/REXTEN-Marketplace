export const tagKeys = [
    'premium',
    'online-booking',
    'open-now',
    'has-reviews',
    'has-portfolio',
    'online-payment',
    'russian-speaking',
] as const

export type TagKey = (typeof tagKeys)[number]

export const tagI18nKey: Record<string, string> = {
    'premium': 'tagPremium',
    'online-booking': 'tagOnlineBooking',
    'open-now': 'tagOpenNow',
    'has-reviews': 'tagHasReviews',
    'has-portfolio': 'tagHasPortfolio',
    'online-payment': 'tagOnlinePayment',
    'russian-speaking': 'tagRussianSpeaking',
}

export function getTagLabel(tag: string, t?: (key: string) => string): string {
    if (t && tagI18nKey[tag]) return t(tagI18nKey[tag])
    return tag
}

export function getBadges(tags: string[] | undefined | null, t?: (key: string) => string) {
    const safeTags = tags || []
    const badges: { label: string; color: string }[] = []
    if (safeTags.includes('premium')) {
        badges.push({ label: 'Premium', color: 'bg-yellow-500' })
    }
    if (safeTags.includes('online-booking')) {
        badges.push({ label: t ? t('tagOnlineBooking') : 'Online Booking', color: 'bg-emerald-600' })
    }
    if (safeTags.includes('russian-speaking')) {
        badges.push({ label: 'RU', color: 'bg-black/70' })
    }
    return badges
}

/** Карточки каталога: только «Онлайн-запись» и «RU», под локацией (не на фото). */
export function getCatalogListingBadges(tags: string[] | undefined | null, t?: (key: string) => string) {
    const safeTags = tags || []
    const badges: { label: string; color: string }[] = []
    if (safeTags.includes('online-booking')) {
        badges.push({ label: t ? t('tagOnlineBooking') : 'Online Booking', color: 'bg-emerald-600' })
    }
    if (safeTags.includes('russian-speaking')) {
        badges.push({ label: 'RU', color: 'bg-black/70' })
    }
    return badges
}
