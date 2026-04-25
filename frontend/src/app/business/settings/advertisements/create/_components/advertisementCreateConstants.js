import {
    PiInfo,
    PiCurrencyDollar,
    PiCalendar,
    PiUsers,
    PiImages,
} from 'react-icons/pi'

/** Стабильная ссылка для `useQuery` без `data` — не подставлять новый `[]` на каждый рендер. */
export const STABLE_EMPTY_ARRAY = []

/** Порядок шагов мастера создания объявления (slug секции → ключ в переводах `sections.*`). */
export const ADVERTISEMENT_CREATE_SECTION_IDS = [
    'general',
    'pricing',
    'services',
    'schedule',
    'team',
    'portfolio',
]

export const ADVERTISEMENT_CREATE_SECTION_ICONS = {
    general: PiInfo,
    pricing: PiCurrencyDollar,
    services: PiCalendar,
    schedule: PiCalendar,
    team: PiUsers,
    portfolio: PiImages,
}
