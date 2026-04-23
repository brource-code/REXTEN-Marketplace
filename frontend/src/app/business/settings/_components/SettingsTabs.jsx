'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import classNames from '@/utils/classNames'
import ProfileTab from './tabs/ProfileTab'
import TeamTab from './tabs/TeamTab'
import UsersTab from './tabs/UsersTab'
import RolesTab from './tabs/RolesTab'
import ScheduleTab from './tabs/ScheduleTab'
import NotificationsTab from './tabs/NotificationsTab'
import PaymentsTab from './tabs/PaymentsTab'
import MarketplaceTab from './tabs/MarketplaceTab'
import ServicesTab from './tabs/ServicesTab'
import {
    PiUser,
    PiUsers,
    PiUserCircle,
    PiShieldCheck,
    PiClock,
    PiBell,
    PiCreditCard,
    PiStorefront,
    PiListBullets,
} from 'react-icons/pi'

const SettingsTabs = () => {
    const t = useTranslations('business.settings')
    const [tab, setTab] = useState('profile')

    return (
        <AdaptiveCard>
            <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('description')}
                </p>
            </div>

            <div className="mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
                <SegmentTabBar
                    value={tab}
                    onChange={setTab}
                    items={[
                        {
                            value: 'profile',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiUser className="text-base shrink-0" />
                                    {t('tabs.profile')}
                                </span>
                            ),
                        },
                        {
                            value: 'users',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiUserCircle className="text-base shrink-0" />
                                    {t('tabs.users')}
                                </span>
                            ),
                        },
                        {
                            value: 'roles',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiShieldCheck className="text-base shrink-0" />
                                    {t('tabs.roles')}
                                </span>
                            ),
                        },
                        {
                            value: 'services',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiListBullets className="text-base shrink-0" />
                                    {t('tabs.services')}
                                </span>
                            ),
                        },
                        {
                            value: 'team',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiUsers className="text-base shrink-0" />
                                    {t('tabs.team')}
                                </span>
                            ),
                        },
                        {
                            value: 'schedule',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiClock className="text-base shrink-0" />
                                    {t('tabs.schedule')}
                                </span>
                            ),
                        },
                        {
                            value: 'notifications',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiBell className="text-base shrink-0" />
                                    {t('tabs.notifications')}
                                </span>
                            ),
                        },
                        {
                            value: 'payments',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiCreditCard className="text-base shrink-0" />
                                    {t('tabs.payments')}
                                </span>
                            ),
                        },
                        {
                            value: 'marketplace',
                            label: (
                                <span className="inline-flex items-center gap-1.5">
                                    <PiStorefront className="text-base shrink-0" />
                                    {t('tabs.marketplace')}
                                </span>
                            ),
                        },
                    ]}
                />
            </div>
            <div className="p-4 sm:p-6 -mx-4 sm:mx-0">
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'profile' && 'tab-content-active')}
                >
                    <ProfileTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'services' && 'tab-content-active')}
                >
                    <ServicesTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'team' && 'tab-content-active')}
                >
                    <TeamTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'users' && 'tab-content-active')}
                >
                    <UsersTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'roles' && 'tab-content-active')}
                >
                    <RolesTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'schedule' && 'tab-content-active')}
                >
                    <ScheduleTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'notifications' && 'tab-content-active')}
                >
                    <NotificationsTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'payments' && 'tab-content-active')}
                >
                    <PaymentsTab />
                </div>
                <div
                    role="tabpanel"
                    className={classNames('tab-content', tab === 'marketplace' && 'tab-content-active')}
                >
                    <MarketplaceTab />
                </div>
            </div>
        </AdaptiveCard>
    )
}

export default SettingsTabs

