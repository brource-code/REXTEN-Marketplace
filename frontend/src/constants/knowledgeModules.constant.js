/**
 * Привязка тем базы знаний к разделам бизнес-панели (ключи навигации).
 * labelKey — ключ в superadmin.knowledge.moduleLabels.*
 */
export const KNOWLEDGE_MODULE_OPTIONS = [
    { key: '', labelKey: 'general' },
    { key: 'business.dashboard', labelKey: 'dashboard' },
    { key: 'business.schedule', labelKey: 'schedule' },
    { key: 'business.bookings', labelKey: 'bookings' },
    { key: 'business.reports', labelKey: 'reports' },
    { key: 'business.clients', labelKey: 'clients' },
    { key: 'business.discounts', labelKey: 'discounts' },
    { key: 'business.advertisements', labelKey: 'advertisements' },
    { key: 'business.reviews', labelKey: 'reviews' },
    { key: 'business.billing', labelKey: 'billing' },
    { key: 'business.settings', labelKey: 'settings' },
    { key: 'business.knowledge', labelKey: 'knowledge' },
]

export function findModuleLabelKey(moduleKey) {
    if (moduleKey == null || moduleKey === '') {
        return 'general'
    }
    const row = KNOWLEDGE_MODULE_OPTIONS.find((o) => o.key === moduleKey)
    return row?.labelKey ?? 'general'
}

/** Опции для `Select` (react-select): фильтр списка тем в суперадминке */
export function getModuleFilterSelectOptions(t) {
    return [
        { value: '', label: t('moduleLabels.all') },
        { value: '__general__', label: t('moduleLabels.general') },
        ...KNOWLEDGE_MODULE_OPTIONS.filter((o) => o.key).map((opt) => ({
            value: opt.key,
            label: t(`moduleLabels.${opt.labelKey}`),
        })),
    ]
}

/** Опции для формы темы: привязка к разделу продукта */
export function getModuleKeyFormSelectOptions(t) {
    return KNOWLEDGE_MODULE_OPTIONS.map((opt) => ({
        value: opt.key,
        label: t(`moduleLabels.${opt.labelKey}`),
    }))
}
