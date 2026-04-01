'use client'
import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import ToggleDrawer from '@/components/shared/ToggleDrawer'
import SettingsMenu from './SettingsMenu'

const SettingMobileMenu = () => {
    const t = useTranslations('accountSettings')
    const drawerRef = useRef(null)

    return (
        <>
            <div>
                <ToggleDrawer ref={drawerRef} title={t('navigation')}>
                    <SettingsMenu
                        onChange={() => {
                            drawerRef.current?.handleCloseDrawer()
                        }}
                    />
                </ToggleDrawer>
            </div>
        </>
    )
}

export default SettingMobileMenu
