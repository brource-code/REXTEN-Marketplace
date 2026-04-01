'use client'
import Menu from '@/components/ui/Menu'
import ScrollBar from '@/components/ui/ScrollBar'
import { useSettingsStore } from '../_store/settingsStore'
import { useTranslations } from 'next-intl'
import {
    TbUserSquare,
    TbLock,
} from 'react-icons/tb'
import { useSearchParams } from 'next/navigation'

const { MenuItem } = Menu

export const SettingsMenu = ({ onChange }) => {
    const t = useTranslations('accountSettings')
    const searchParams = useSearchParams()
    const { currentView, setCurrentView } = useSettingsStore()

    const menuList = [
        { label: t('profile'), value: 'profile', icon: <TbUserSquare /> },
        { label: t('security'), value: 'security', icon: <TbLock /> },
    ]

    const currentPath =
        searchParams.get('category') || searchParams.get('label') || 'inbox'

    const handleSelect = (value) => {
        setCurrentView(value)
        onChange?.()
    }

    return (
        <div className="flex flex-col justify-between h-full">
            <ScrollBar className="h-full overflow-y-auto">
                <Menu className="mx-2 mb-10">
                    {menuList.map((menu) => (
                        <MenuItem
                            key={menu.value}
                            eventKey={menu.value}
                            className={`mb-2 ${
                                currentView === menu.value
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : ''
                            }`}
                            isActive={currentPath === menu.value}
                            onSelect={() => handleSelect(menu.value)}
                        >
                            <span className="text-2xl ltr:mr-2 rtl:ml-2">
                                {menu.icon}
                            </span>
                            <span>{menu.label}</span>
                        </MenuItem>
                    ))}
                </Menu>
            </ScrollBar>
        </div>
    )
}

export default SettingsMenu
