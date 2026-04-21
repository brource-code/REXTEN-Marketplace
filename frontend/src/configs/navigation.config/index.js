import dashboardsNavigationConfig from './dashboards.navigation.config'
import uiComponentNavigationConfig from './ui-components.navigation.config'
import conceptsNavigationConfig from './concepts.navigation.config'
import authNavigationConfig from './auth.navigation.config'
import othersNavigationConfig from './others.navigation.config'
import guideNavigationConfig from './guide.navigation.config'
// clientNavigationConfig убран - клиенты не используют админку, они на публичном сайте
import businessNavigationConfig from './business.navigation.config'
import superadminNavigationConfig from './superadmin.navigation.config'
import {
    NAV_ITEM_TYPE_COLLAPSE,
} from '@/constants/navigation.constant'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

/** Рекурсивно задаёт authority для дерева бизнес-меню (в т.ч. группы NAV_ITEM_TYPE_TITLE). */
function withBusinessAuthority(items) {
    return (items || []).map((item) => ({
        ...item,
        authority: [BUSINESS_OWNER],
        subMenu:
            item.subMenu && item.subMenu.length > 0
                ? withBusinessAuthority(item.subMenu)
                : item.subMenu,
    }))
}

// Бизнес — группы с подписями (см. business.navigation.config.js)
const businessNavigationFlatConfig = withBusinessAuthority(
    businessNavigationConfig[0]?.subMenu || [],
)

// Суперадмин - без папки "Суперадмин", каждый пункт отдельно со своей иконкой (как в бизнесе)
// "Объявления" остаётся collapse с подпунктами (list, ads)
const superadminNavigationFlatConfig = (superadminNavigationConfig[0]?.subMenu || []).map(item => ({
    ...item,
    authority: [SUPERADMIN],
}))

// Демо-страницы для суперадмина (скрыты в папку "Примеры")
// Объединяет все демо-страницы: дашборды, концепты, компоненты, гайды, аутентификацию, прочее
const superadminDemoPagesConfig = [
    {
        key: 'demo',
        path: '',
        title: 'Примеры',
        translateKey: 'nav.examples',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [SUPERADMIN],
        meta: {
            description: {
                translateKey: 'nav.examplesDesc',
                label: 'Демо-страницы и примеры',
            },
        },
        subMenu: [
            // Дашборды
            ...(dashboardsNavigationConfig[0]?.subMenu || []),
            // Концепты
            ...(conceptsNavigationConfig[0]?.subMenu || []),
            // Компоненты
            ...(uiComponentNavigationConfig[0]?.subMenu || []),
            // Гайды
            ...(guideNavigationConfig[0]?.subMenu || []),
            // Аутентификация (извлекаем элементы из subMenu)
            ...(authNavigationConfig[0]?.subMenu || []),
            // Прочее (извлекаем элементы из subMenu)
            ...(othersNavigationConfig[0]?.subMenu || []),
        ],
    },
]

// ВАЖНО: clientNavigationConfig убран - клиенты не используют админку
// Они используют публичный сайт для своего личного кабинета
const navigationConfig = [
    // Для бизнеса: элементы без папки (плоский список) - видно только BUSINESS_OWNER
    ...businessNavigationFlatConfig,
    // Для суперадмина: пункты без папки (плоский список, как в бизнесе)
    ...superadminNavigationFlatConfig,
    // Для суперадмина: все демо-страницы в папке "Примеры"
    ...superadminDemoPagesConfig,
]

export default navigationConfig
