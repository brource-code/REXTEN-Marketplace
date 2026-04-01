'use client'

import { lazy, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import SettingsMenu from './SettingsMenu'
import SettingMobileMenu from './SettingMobileMenu'
import Loading from '@/components/shared/Loading'
import { useSettingsStore } from '../_store/settingsStore'

const Profile = lazy(() => import('./SettingsProfile'))
const Security = lazy(() => import('./SettingsSecurity'))
const Notification = lazy(() => import('./SettingsNotification'))
const Billing = lazy(() => import('./SettingsBilling'))
const Integration = lazy(() => import('./SettingIntegration'))

const Settings = () => {
    const t = useTranslations('accountSettings')
    const { currentView } = useSettingsStore()

    return (
        <AdaptiveCard className="h-full">
            <div className="flex flex-col gap-4 h-full min-h-0">
                <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('pageTitle')}</h4>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('pageDescription')}</p>
                </div>
                <div className="flex flex-auto h-full min-h-0">
                    <div className="w-[200px] xl:w-[280px] hidden lg:block shrink-0">
                        <SettingsMenu />
                    </div>
                    <div className="xl:ltr:pl-6 xl:rtl:pr-6 flex-1 min-w-0 py-2">
                        <div className="mb-6 lg:hidden">
                            <SettingMobileMenu />
                        </div>
                        <Suspense
                            fallback={<Loading loading={true} className="w-full" />}
                        >
                            {currentView === 'profile' && <Profile />}
                            {currentView === 'security' && <Security />}
                        </Suspense>
                    </div>
                </div>
            </div>
        </AdaptiveCard>
    )
}

export default Settings
