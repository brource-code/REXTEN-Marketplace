'use client'
import { useTranslations } from 'next-intl'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Tabs from '@/components/ui/Tabs'
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

const { TabNav, TabList, TabContent } = Tabs

const SettingsTabs = () => {
    const t = useTranslations('business.settings')
    
    return (
        <AdaptiveCard>
            <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('description')}
                </p>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                    💡 {t('servicesHint')} <a href="/business/advertisements" className="text-blue-600 hover:underline">{t('advertisementsLink')}</a>
                </p>
            </div>

            <Tabs defaultValue="profile">
                <TabList className="overflow-x-auto pb-1 gap-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 rounded">
                    <TabNav value="profile" icon={<PiUser />} className="shrink-0">
                        {t('tabs.profile')}
                    </TabNav>
                    <TabNav value="users" icon={<PiUserCircle />} className="shrink-0">
                        {t('tabs.users')}
                    </TabNav>
                    <TabNav value="roles" icon={<PiShieldCheck />} className="shrink-0">
                        {t('tabs.roles')}
                    </TabNav>
                    <TabNav value="services" icon={<PiListBullets />} className="shrink-0">
                        {t('tabs.services')}
                    </TabNav>
                    <TabNav value="team" icon={<PiUsers />} className="shrink-0">
                        {t('tabs.team')}
                    </TabNav>
                    <TabNav value="schedule" icon={<PiClock />} className="shrink-0">
                        {t('tabs.schedule')}
                    </TabNav>
                    <TabNav value="notifications" icon={<PiBell />} className="shrink-0">
                        {t('tabs.notifications')}
                    </TabNav>
                    <TabNav value="payments" icon={<PiCreditCard />} className="shrink-0">
                        {t('tabs.payments')}
                    </TabNav>
                    <TabNav value="marketplace" icon={<PiStorefront />} className="shrink-0">
                        {t('tabs.marketplace')}
                    </TabNav>
                </TabList>
                <div className="p-4 sm:p-6 -mx-4 sm:mx-0">
                    <TabContent value="profile">
                        <ProfileTab />
                    </TabContent>
                    <TabContent value="services">
                        <ServicesTab />
                    </TabContent>
                    <TabContent value="team">
                        <TeamTab />
                    </TabContent>
                    <TabContent value="users">
                        <UsersTab />
                    </TabContent>
                    <TabContent value="roles">
                        <RolesTab />
                    </TabContent>
                    <TabContent value="schedule">
                        <ScheduleTab />
                    </TabContent>
                    <TabContent value="notifications">
                        <NotificationsTab />
                    </TabContent>
                    <TabContent value="payments">
                        <PaymentsTab />
                    </TabContent>
                    <TabContent value="marketplace">
                        <MarketplaceTab />
                    </TabContent>
                </div>
            </Tabs>
        </AdaptiveCard>
    )
}

export default SettingsTabs

