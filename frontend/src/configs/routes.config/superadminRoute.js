import { SUPERADMIN } from '@/constants/roles.constant'

const superadminRoute = {
    '/superadmin/dashboard': {
        key: 'superadmin.dashboard',
        authority: [SUPERADMIN],
    },
    '/superadmin/companies': {
        key: 'superadmin.companies',
        authority: [SUPERADMIN],
    },
    '/superadmin/companies/create': {
        key: 'superadmin.companies.create',
        authority: [SUPERADMIN],
    },
    '/superadmin/companies/[id]': {
        key: 'superadmin.companies.detail',
        authority: [SUPERADMIN],
    },
    '/superadmin/users': {
        key: 'superadmin.users',
        authority: [SUPERADMIN],
    },
    '/superadmin/advertisements': {
        key: 'superadmin.advertisements.list',
        authority: [SUPERADMIN],
    },
    '/superadmin/advertisements/ads': {
        key: 'superadmin.advertisements.ads',
        authority: [SUPERADMIN],
    },
    '/superadmin/activity-log': {
        key: 'superadmin.activityLog',
        authority: [SUPERADMIN],
    },
    '/superadmin/billing': {
        key: 'superadmin.billing',
        authority: [SUPERADMIN],
    },
    '/superadmin/categories': {
        key: 'superadmin.categories',
        authority: [SUPERADMIN],
    },
    '/superadmin/reviews': {
        key: 'superadmin.reviews',
        authority: [SUPERADMIN],
    },
    '/superadmin/settings': {
        key: 'superadmin.settings',
        authority: [SUPERADMIN],
    },
    '/superadmin/support': {
        key: 'superadmin.support',
        authority: [SUPERADMIN],
    },
    '/superadmin/support/[id]': {
        key: 'superadmin.support',
        authority: [SUPERADMIN],
        dynamicRoute: true,
    },
    '/superadmin/knowledge': {
        key: 'superadmin.knowledge',
        authority: [SUPERADMIN],
    },
    '/superadmin/knowledge/[topicId]': {
        key: 'superadmin.knowledge',
        authority: [SUPERADMIN],
    },
    '/superadmin/knowledge/topics/new': {
        key: 'superadmin.knowledge',
        authority: [SUPERADMIN],
    },
    '/superadmin/knowledge/topics/[id]/edit': {
        key: 'superadmin.knowledge',
        authority: [SUPERADMIN],
    },
    '/superadmin/knowledge/articles/new': {
        key: 'superadmin.knowledge',
        authority: [SUPERADMIN],
    },
    '/superadmin/knowledge/articles/[articleId]/edit': {
        key: 'superadmin.knowledge',
        authority: [SUPERADMIN],
    },
}

export default superadminRoute

