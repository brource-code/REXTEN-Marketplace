import {
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { SUPERADMIN } from '@/constants/roles.constant'

const superadminNavigationConfig = [
    {
        key: 'superadmin',
        path: '',
        title: 'Суперадмин',
        translateKey: 'nav.superadmin.superadmin',
        icon: 'admin',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [SUPERADMIN],
        meta: {
            description: {
                translateKey: 'nav.superadmin.superadminDesc',
                label: 'Панель суперадминистратора',
            },
        },
        subMenu: [
            {
                key: 'superadmin.dashboard',
                path: '/superadmin/dashboard',
                title: 'Дашборд',
                translateKey: 'nav.superadmin.dashboard',
                icon: 'dashboard',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.activityLog',
                path: '/superadmin/activity-log',
                title: 'Журнал активности',
                translateKey: 'nav.superadmin.activityLog',
                icon: 'activityLog',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.companies',
                path: '/superadmin/companies',
                title: 'Компании',
                translateKey: 'nav.superadmin.companies',
                icon: 'companies',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.users',
                path: '/superadmin/users',
                title: 'Пользователи',
                translateKey: 'nav.superadmin.users',
                icon: 'users',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.advertisements',
                path: '/superadmin/advertisements',
                title: 'Объявления',
                translateKey: 'nav.superadmin.advertisements.advertisements',
                icon: 'advertisements',
                type: NAV_ITEM_TYPE_COLLAPSE,
                subMenu: [
                    {
                        key: 'superadmin.advertisements.list',
                        path: '/superadmin/advertisements',
                        translateKey: 'nav.superadmin.advertisements.list',
                        icon: 'advertisements',
                        type: NAV_ITEM_TYPE_ITEM,
                        subMenu: [],
                    },
                    {
                        key: 'superadmin.advertisements.ads',
                        path: '/superadmin/advertisements/ads',
                        translateKey: 'nav.superadmin.advertisements.ads',
                        icon: 'advertisements',
                        type: NAV_ITEM_TYPE_ITEM,
                        subMenu: [],
                    },
                ],
            },
            {
                key: 'superadmin.billing',
                path: '/superadmin/billing',
                title: 'Биллинг',
                translateKey: 'nav.superadmin.billing',
                icon: 'billing',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.categories',
                path: '/superadmin/categories',
                title: 'Категории',
                translateKey: 'nav.superadmin.categories',
                icon: 'categories',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.reviews',
                path: '/superadmin/reviews',
                title: 'Отзывы',
                translateKey: 'nav.superadmin.reviews',
                icon: 'reviews',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'superadmin.settings',
                path: '/superadmin/settings',
                title: 'Настройки',
                translateKey: 'nav.superadmin.settings',
                icon: 'settings',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
        ],
    },
]

export default superadminNavigationConfig

