import {
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const businessNavigationConfig = [
    {
        key: 'business',
        path: '',
        title: 'Бизнес',
        translateKey: 'nav.business.business',
        icon: 'business',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [SUPERADMIN], // Только для суперадмина (папка), для бизнеса используется плоский список из index.js
        meta: {
            description: {
                translateKey: 'nav.business.businessDesc',
                label: 'Панель управления бизнесом',
            },
        },
        subMenu: [
            {
                key: 'business.dashboard',
                path: '/business/dashboard',
                title: 'Дашборд',
                translateKey: 'nav.business.dashboard',
                icon: 'dashboard',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'business.schedule',
                path: '/business/schedule',
                title: 'Расписание',
                translateKey: 'nav.business.schedule.schedule',
                icon: 'calendar',
                type: NAV_ITEM_TYPE_COLLAPSE,
                subMenu: [
                    {
                        key: 'business.schedule.calendar',
                        path: '/business/schedule',
                        title: 'Календарь',
                        translateKey: 'nav.business.schedule.calendar',
                        type: NAV_ITEM_TYPE_ITEM,
                        subMenu: [],
                    },
                    {
                        key: 'business.schedule.reports',
                        path: '/business/schedule/reports',
                        title: 'Отчеты',
                        translateKey: 'nav.business.schedule.reports.title',
                        type: NAV_ITEM_TYPE_ITEM,
                        subMenu: [],
                    },
                ],
            },
            {
                key: 'business.clients',
                path: '/business/clients',
                title: 'Клиенты',
                translateKey: 'nav.business.clients',
                icon: 'customers',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'business.advertisements',
                path: '/business/advertisements',
                title: 'Объявления',
                translateKey: 'nav.business.advertisements.advertisements',
                icon: 'advertisements',
                type: NAV_ITEM_TYPE_COLLAPSE,
                subMenu: [
                    {
                        key: 'business.advertisements.list',
                        path: '/business/advertisements',
                        translateKey: 'nav.business.advertisements.list',
                        type: NAV_ITEM_TYPE_ITEM,
                        subMenu: [],
                    },
                    {
                        key: 'business.advertisements.ads',
                        path: '/business/advertisements/ads',
                        translateKey: 'nav.business.advertisements.ads',
                        type: NAV_ITEM_TYPE_ITEM,
                        subMenu: [],
                    },
                ],
            },
            {
                key: 'business.reviews',
                path: '/business/reviews',
                title: 'Отзывы',
                translateKey: 'nav.business.reviews',
                icon: 'reviews',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'business.settings',
                path: '/business/settings',
                title: 'Настройки',
                translateKey: 'nav.business.settings',
                icon: 'settings',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
        ],
    },
]

export default businessNavigationConfig

