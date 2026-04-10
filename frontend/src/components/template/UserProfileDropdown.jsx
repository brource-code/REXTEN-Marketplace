'use client'
import { useTranslations } from 'next-intl'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Link from 'next/link'
import { useLogout } from '@/hooks/api/useAuth'
import { useUserStore, useAuthStore } from '@/store'
import { useQuery } from '@tanstack/react-query'
import { getCurrentSubscription } from '@/lib/api/stripe'
import {
    PiUserDuotone,
    PiGearDuotone,
    PiSignOutDuotone,
    PiCrown,
} from 'react-icons/pi'

const _UserDropdown = () => {
    const t = useTranslations('userDropdown')
    const { user } = useUserStore()
    const { userRole } = useAuthStore()
    const logoutMutation = useLogout()

    const isBusiness = userRole === 'BUSINESS_OWNER'

    const { data: subData } = useQuery({
        queryKey: ['current-subscription'],
        queryFn: getCurrentSubscription,
        staleTime: 5 * 60 * 1000,
        enabled: isBusiness,
    })

    const activeSub = subData?.subscription

    const dropdownItemList = [
        {
            label: t('accountSettings'),
            path: '/account/settings',
            icon: <PiGearDuotone />,
        },
    ]

    const handleSignOut = async () => {
        logoutMutation.mutate()
    }

    const userName = user?.name || 
        (user?.firstName || user?.lastName 
            ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() 
            : null) ||
        user?.userName || 
        t('anonymous')
    const userEmail = user?.email || t('emailNotSpecified')
    const userAvatar = user?.avatar || user?.image || null

    const getRoleLabel = (role) => {
        switch (role) {
            case 'BUSINESS_OWNER':
                return t('roles.businessOwner')
            case 'SUPERADMIN':
                return t('roles.superadmin')
            case 'CLIENT':
                return t('roles.client')
            default:
                return role
        }
    }

    const planBadgeColors = {
        starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        professional: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
        enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    }

    const avatarProps = {
        ...(userAvatar
            ? { src: userAvatar }
            : { icon: <PiUserDuotone /> }),
    }

    return (
        <Dropdown
            className="flex"
            toggleClassName="flex items-center"
            renderTitle={
                <div className="cursor-pointer flex items-center">
                    <Avatar size={32} {...avatarProps} />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item variant="header">
                <div className="py-2 px-3 flex items-center gap-3">
                    <Avatar {...avatarProps} />
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {userName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {userEmail}
                        </div>
                        {userRole && (
                            <div className="text-xs mt-1 flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {getRoleLabel(userRole)}
                                </span>
                                {isBusiness && activeSub?.is_active && (
                                    <Link href="/business/subscription" className="max-w-full">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${planBadgeColors[activeSub.plan] || planBadgeColors.starter}`}>
                                            <PiCrown size={12} className="flex-shrink-0" />
                                            {t(`plans.${activeSub.plan}`, { defaultValue: activeSub.plan })}
                                        </span>
                                    </Link>
                                )}
                                {isBusiness && !activeSub?.is_active && (
                                    <Link href="/business/subscription" className="max-w-full">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-pointer bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:opacity-80 transition-opacity">
                                            <PiCrown size={12} className="flex-shrink-0" />
                                            {t('freePlan')}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            {dropdownItemList.map((item) => (
                <Dropdown.Item
                    key={item.label}
                    eventKey={item.label}
                    className="px-0"
                >
                    <Link className="flex h-full w-full px-2" href={item.path}>
                        <span className="flex gap-2 items-center w-full">
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.label}</span>
                        </span>
                    </Link>
                </Dropdown.Item>
            ))}
            <Dropdown.Item variant="divider" />
            <Dropdown.Item
                eventKey="Sign Out"
                className="gap-2"
                onClick={handleSignOut}
            >
                <span className="text-xl">
                    <PiSignOutDuotone />
                </span>
                <span>{t('signOut')}</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
