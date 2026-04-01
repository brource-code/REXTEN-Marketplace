import {
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { ADMIN, USER } from '@/constants/roles.constant'

const clientNavigationConfig = [
    {
        key: 'client',
        path: '',
        title: 'Клиент',
        translateKey: 'nav.client.client',
        icon: 'user',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [ADMIN, USER],
        meta: {
            description: {
                translateKey: 'nav.client.clientDesc',
                label: 'Личный кабинет клиента',
            },
        },
        subMenu: [
            {
                key: 'client.profile',
                path: '/client/profile',
                title: 'Профиль',
                translateKey: 'nav.client.profile',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'client.orders',
                path: '/client/orders',
                title: 'Мои заказы',
                translateKey: 'nav.client.orders',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
            {
                key: 'client.booking',
                path: '/client/booking',
                title: 'Бронирование',
                translateKey: 'nav.client.booking',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                subMenu: [],
            },
        ],
    },
]

export default clientNavigationConfig

