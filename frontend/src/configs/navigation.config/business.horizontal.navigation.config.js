import {
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_DIVIDER,
} from '@/constants/navigation.constant'
import { BUSINESS_OWNER } from '@/constants/roles.constant'

/**
 * Горизонтальная навигация для бизнеса (topBar layout)
 * Группирует пункты в dropdown-меню для экономии места
 */
const businessHorizontalNavigationConfig = [
    // Дашборд - отдельный пункт (главная страница)
    {
        key: 'business.dashboard',
        path: '/business/dashboard',
        title: 'Дашборд',
        translateKey: 'nav.business.dashboard',
        icon: 'dashboard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [BUSINESS_OWNER],
        permission: 'view_dashboard',
        subMenu: [],
    },
    // Работа - группа: Расписание, Бронирования, Маршруты
    {
        key: 'business.work',
        path: '',
        title: 'Работа',
        translateKey: 'nav.business.groups.work',
        icon: 'calendar',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [BUSINESS_OWNER],
        meta: {
            horizontalMenu: {
                layout: 'default',
            },
        },
        subMenu: [
            {
                key: 'business.schedule',
                path: '/business/schedule',
                title: 'Расписание',
                translateKey: 'nav.business.schedule.schedule',
                icon: 'calendar',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'view_schedule',
                subMenu: [],
            },
            {
                key: 'business.bookings',
                path: '/business/bookings',
                title: 'Бронирования',
                translateKey: 'nav.business.bookings',
                icon: 'orderList',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'view_schedule',
                subMenu: [],
            },
            {
                key: 'business.routes',
                path: '/business/routes',
                title: 'Маршруты',
                translateKey: 'nav.business.routes',
                icon: 'routes',
                type: NAV_ITEM_TYPE_ITEM,
                permission: ['view_routes', 'view_schedule'],
                meta: {
                    requiredFeature: 'routes',
                    upgradeBadge: 'Pro',
                },
                subMenu: [],
            },
        ],
    },
    // Клиенты - группа: Клиенты, Отчеты
    {
        key: 'business.crm',
        path: '',
        title: 'Клиенты',
        translateKey: 'nav.business.groups.crm',
        icon: 'customers',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [BUSINESS_OWNER],
        meta: {
            horizontalMenu: {
                layout: 'default',
            },
        },
        subMenu: [
            {
                key: 'business.clients',
                path: '/business/clients',
                title: 'Клиенты',
                translateKey: 'nav.business.clients',
                icon: 'customers',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'view_clients',
                subMenu: [],
            },
            {
                key: 'business.reports',
                path: '/business/schedule/reports',
                title: 'Отчеты',
                translateKey: 'nav.business.reports',
                icon: 'reports',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'view_reports',
                meta: {
                    requiredFeature: 'analytics',
                    upgradeBadge: 'Pro',
                },
                subMenu: [],
            },
        ],
    },
    // Маркетинг - группа: Объявления, Скидки, Отзывы
    {
        key: 'business.marketing',
        path: '',
        title: 'Маркетинг',
        translateKey: 'nav.business.groups.marketing',
        icon: 'advertisements',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [BUSINESS_OWNER],
        meta: {
            horizontalMenu: {
                layout: 'default',
            },
        },
        subMenu: [
            {
                key: 'business.advertisements.list',
                path: '/business/advertisements',
                title: 'Объявления',
                translateKey: 'nav.business.advertisements.advertisements',
                icon: 'advertisements',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'manage_settings',
                subMenu: [],
            },
            {
                key: 'business.discounts',
                path: '/business/discounts',
                title: 'Скидки',
                translateKey: 'nav.business.discounts',
                icon: 'orders',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'manage_settings',
                subMenu: [],
            },
            {
                key: 'business.reviews',
                path: '/business/reviews',
                title: 'Отзывы',
                translateKey: 'nav.business.reviews',
                icon: 'reviews',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'view_reviews',
                subMenu: [],
            },
        ],
    },
    // Настройки - группа: Биллинг, Настройки, База знаний, Поддержка
    {
        key: 'business.system',
        path: '',
        title: 'Ещё',
        translateKey: 'nav.business.groups.more',
        icon: 'settings',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [BUSINESS_OWNER],
        meta: {
            horizontalMenu: {
                layout: 'default',
            },
        },
        subMenu: [
            {
                key: 'business.subscription',
                path: '/business/subscription',
                title: 'Подписка',
                translateKey: 'nav.business.subscription',
                icon: 'subscription',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'manage_settings',
                subMenu: [],
            },
            {
                key: 'business.billing',
                path: '/business/billing',
                title: 'Биллинг',
                translateKey: 'nav.business.billing',
                icon: 'billing',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'manage_settings',
                subMenu: [],
            },
            {
                key: 'business.settings',
                path: '/business/settings',
                title: 'Настройки',
                translateKey: 'nav.business.settings',
                icon: 'settings',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'manage_settings',
                subMenu: [],
            },
            {
                key: 'business.nav.divider.knowledge',
                type: NAV_ITEM_TYPE_DIVIDER,
                subMenu: [],
            },
            {
                key: 'business.knowledge',
                path: '/business/knowledge',
                title: 'База знаний',
                translateKey: 'nav.business.knowledge',
                icon: 'guide',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'business.notifications',
                path: '/business/notifications',
                title: 'Уведомления',
                translateKey: 'nav.business.notifications',
                icon: 'notifications',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'business.support',
                path: '/business/support',
                title: 'Поддержка',
                translateKey: 'nav.business.support',
                icon: 'support',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'business.api',
                path: '/business/api',
                title: 'API',
                translateKey: 'nav.business.api',
                icon: 'code',
                type: NAV_ITEM_TYPE_ITEM,
                permission: 'manage_settings',
                meta: {
                    requiredFeature: 'api_access',
                    upgradeBadge: 'Enterprise',
                    upgradeBadgeTone: 'enterprise',
                },
                subMenu: [],
            },
        ],
    },
]

export default businessHorizontalNavigationConfig
