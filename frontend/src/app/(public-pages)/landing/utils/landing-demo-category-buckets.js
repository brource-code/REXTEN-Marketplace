/**
 * Вкладки блока «Примеры» на лендинге — не совпадают с полем `group` в API
 * (там id категории). Сопоставляем по slug категории из /marketplace/categories.
 */
export const LANDING_DEMO_TAB_SLUGS = {
    beauty: [
        'beauty',
        'hair-services',
        'barbershop',
        'tattoo-piercing',
    ],
    wellness: [
        'massage-spa',
        'medical-services',
        'physical-therapy',
        'eldercare',
        'childcare',
    ],
    home: [
        'cleaning',
        'repair-construction',
        'electrical',
        'plumbing',
        'hvac',
        'landscaping',
        'snow-removal',
        'dry-cleaning',
        'laundry',
        'delivery',
        'moving',
        'it-support',
        'web-development',
        'pet-care',
        'legal-services',
        'accounting',
        'translation',
        'notary',
    ],
    auto: ['auto-service'],
    education: ['tutoring', 'language-learning', 'music-lessons'],
    events: ['event-planning', 'catering', 'photography', 'videography'],
}

export function buildSlugToDemoTabMap() {
    const map = {}
    for (const [tab, slugs] of Object.entries(LANDING_DEMO_TAB_SLUGS)) {
        for (const slug of slugs) {
            map[slug] = tab
        }
    }
    return map
}
