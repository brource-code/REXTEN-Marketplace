import {
    TbPresentation,
    TbSettings,
    TbStar,
    TbChartHistogram,
    TbCalendar,
    TbClipboardList,
    TbUsers,
    TbTag,
    TbSpeakerphone,
    TbCreditCard,
    TbBook,
    TbHelp,
} from 'react-icons/tb'

const TOPIC_ICONS = [
    <TbPresentation key="0" />,
    <TbSettings key="1" />,
    <TbStar key="2" />,
    <TbChartHistogram key="3" />,
    <TbCalendar key="4" />,
    <TbClipboardList key="5" />,
    <TbUsers key="6" />,
    <TbTag key="7" />,
    <TbSpeakerphone key="8" />,
    <TbCreditCard key="9" />,
    <TbBook key="10" />,
    <TbHelp key="11" />,
]

/** Иконка темы по индексу (fallback). */
export function getTopicIconByIndex(index) {
    return TOPIC_ICONS[index % TOPIC_ICONS.length]
}

const MODULE_KEY_TO_ICON = {
    'business.dashboard': <TbPresentation key="mod-dashboard" />,
    'business.schedule': <TbCalendar key="mod-schedule" />,
    'business.bookings': <TbClipboardList key="mod-bookings" />,
    'business.reports': <TbChartHistogram key="mod-reports" />,
    'business.clients': <TbUsers key="mod-clients" />,
    'business.discounts': <TbTag key="mod-discounts" />,
    'business.advertisements': <TbSpeakerphone key="mod-ads" />,
    'business.reviews': <TbStar key="mod-reviews" />,
    'business.billing': <TbCreditCard key="mod-billing" />,
    'business.settings': <TbSettings key="mod-settings" />,
    'business.knowledge': <TbBook key="mod-knowledge" />,
}

/**
 * Иконка по привязке темы к разделу продукта (module_key).
 * Без ключа — нейтральная иконка помощи.
 */
export function getTopicIconByModuleKey(moduleKey) {
    if (moduleKey != null && moduleKey !== '' && MODULE_KEY_TO_ICON[moduleKey]) {
        return MODULE_KEY_TO_ICON[moduleKey]
    }
    return <TbHelp key="mod-general" />
}

/** Иконка для строки статьи: module_key темы, иначе эвристика по slug. */
export function getTopicIconForArticle(topicSlug, topicModuleKey, index = 0) {
    if (topicModuleKey) {
        return getTopicIconByModuleKey(topicModuleKey)
    }
    if (!topicSlug) {
        return getTopicIconByIndex(index)
    }
    let h = 0
    for (let i = 0; i < topicSlug.length; i++) {
        h = (h + topicSlug.charCodeAt(i) * (i + 1)) % 997
    }
    return getTopicIconByIndex(h)
}
