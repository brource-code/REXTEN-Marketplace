import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const accountRoute = {
    '/account/settings': {
        key: 'account.settings',
        authority: [BUSINESS_OWNER, SUPERADMIN],
        meta: {
            pageContainerType: 'contained',
        },
    },
}

export default accountRoute

