'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import ModeSwitcher from './ModeSwitcher'
import LayoutSwitcher from './LayoutSwitcher'
import ContentWidthSwitcher from './ContentWidthSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import useResponsive from '@/utils/hooks/useResponsive'

const ThemeConfigurator = memo(() => {
    const t = useTranslations('themeConfig')
    const { larger } = useResponsive()
    const isMobile = !larger.md // md breakpoint = 768px
    
    return (
        <div className="flex flex-col gap-y-10">
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
            {!isMobile && (
                <div>
                    <h6 className="mb-1">{t('contentWidth')}</h6>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-3">
                        {t('contentWidthDesc')}
                    </span>
                    <ContentWidthSwitcher />
                </div>
            )}
        </div>
    )
})

ThemeConfigurator.displayName = 'ThemeConfigurator'

export default ThemeConfigurator
