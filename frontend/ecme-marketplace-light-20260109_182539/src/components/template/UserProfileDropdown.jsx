'use client'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Link from 'next/link'
import { useLogout } from '@/hooks/api/useAuth'
import { useUserStore, useAuthStore } from '@/store'
import {
    PiUserDuotone,
    PiGearDuotone,
    PiPulseDuotone,
    PiSignOutDuotone,
} from 'react-icons/pi'

const dropdownItemList = [
    {
        label: 'Account Settings',
        path: '/account/settings',
        icon: <PiGearDuotone />,
    },
]

const _UserDropdown = () => {
    const { user } = useUserStore()
    const { userRole } = useAuthStore()
    const logoutMutation = useLogout()

    const handleSignOut = async () => {
        logoutMutation.mutate()
    }

    // Формируем имя пользователя из firstName и lastName, если name отсутствует
    const userName = user?.name || 
        (user?.firstName || user?.lastName 
            ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() 
            : null) ||
        user?.userName || 
        'Анонимный'
    const userEmail = user?.email || 'Email не указан'
    const userAvatar = user?.avatar || user?.image || null

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
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                            {userName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {userEmail}
                        </div>
                        {userRole && (
                            <div className="text-xs mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {userRole === 'BUSINESS_OWNER' ? 'Владелец бизнеса' : 
                                     userRole === 'SUPERADMIN' ? 'Суперадмин' : 
                                     userRole}
                                </span>
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
                <span>Sign Out</span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
