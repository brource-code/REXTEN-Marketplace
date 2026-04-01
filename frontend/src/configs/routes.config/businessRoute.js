import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const businessRoute = {
    '/business/dashboard': {
        key: 'business.dashboard',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/schedule': {
        key: 'business.schedule',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/bookings': {
        key: 'business.bookings',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/schedule/reports': {
        key: 'business.reports',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/clients': {
        key: 'business.clients',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/discounts': {
        key: 'business.discounts',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/advertisements': {
        key: 'business.advertisements.list',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/advertisements/ads': {
        key: 'business.advertisements.ads',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/reviews': {
        key: 'business.reviews',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
    '/business/settings': {
        key: 'business.settings',
        authority: [BUSINESS_OWNER, SUPERADMIN],
    },
}

export default businessRoute

