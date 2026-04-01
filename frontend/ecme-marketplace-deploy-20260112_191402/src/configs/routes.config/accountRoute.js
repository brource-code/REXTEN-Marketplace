import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'
import SettingsTitle from '@/app/(protected-pages)/account/settings/_components/SettingsTitle'

const accountRoute = {
    '/account/settings': {
        key: 'account.settings',
        authority: [BUSINESS_OWNER, SUPERADMIN],
        meta: {
            header: {
                title: SettingsTitle,
            },
            pageContainerType: 'contained',
        },
    },
}

export default accountRoute

