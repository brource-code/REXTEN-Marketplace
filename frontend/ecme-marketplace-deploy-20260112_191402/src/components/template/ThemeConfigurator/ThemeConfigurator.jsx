'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import ModeSwitcher from './ModeSwitcher'
import LayoutSwitcher from './LayoutSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import CopyButton from './CopyButton'
import useResponsive from '@/utils/hooks/useResponsive'

const ThemeConfigurator = memo(({ callBackClose }) => {
    const t = useTranslations('themeConfig')
    const { larger } = useResponsive()
    const isMobile = !larger.md // md breakpoint = 768px
    
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="flex flex-col gap-y-10 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h6>{t('darkMode')}</h6>
                        <span>{t('darkModeDesc')}</span>
                    </div>
                    <ModeSwitcher />
                </div>
                <div>
                    <h6 className="mb-3">{t('theme')}</h6>
                    <ThemeSwitcher />
                </div>
                {!isMobile && (
                    <div>
                        <h6 className="mb-3">{t('layout')}</h6>
                        <LayoutSwitcher />
                    </div>
                )}
            </div>
            <CopyButton />
        </div>
    )
})

ThemeConfigurator.displayName = 'ThemeConfigurator'

export default ThemeConfigurator
