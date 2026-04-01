'use client'

import { useTranslations } from 'next-intl'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Tabs from '@/components/ui/Tabs'
import GeneralTab from './tabs/GeneralTab'
import IntegrationsTab from './tabs/IntegrationsTab'
import SubscriptionsTab from './tabs/SubscriptionsTab'
import SystemTab from './tabs/SystemTab'
import SystemLogsTab from './tabs/SystemLogsTab'
import BackupsTab from './tabs/BackupsTab'
import RealtimeTab from './tabs/RealtimeTab'
import { PiGear, PiPlug, PiStack, PiCpu, PiListBullets, PiArchive, PiPulse } from 'react-icons/pi'

const { TabNav, TabList, TabContent } = Tabs

const SettingsTabs = () => {
    const t = useTranslations('superadmin.settingsPlatform')

    return (
        <AdaptiveCard>
            <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Настройки платформы
                </h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('pageSubtitle')}
                </p>
            </div>

            <Tabs defaultValue="general">
                <TabList>
                    <TabNav value="realtime" icon={<PiPulse />}>
                        {t('tabs.realtime')}
                    </TabNav>
                    <TabNav value="general" icon={<PiGear />}>
                        Общие
                    </TabNav>
                    <TabNav value="integrations" icon={<PiPlug />}>
                        Интеграции
                    </TabNav>
                    <TabNav value="subscriptions" icon={<PiStack />}>
                        Подписки
                    </TabNav>
                    <TabNav value="backups" icon={<PiArchive />}>
                        Бэкапы
                    </TabNav>
                    <TabNav value="system" icon={<PiCpu />}>
                        Система
                    </TabNav>
                    <TabNav value="system-logs" icon={<PiListBullets />}>
                        Системные логи
                    </TabNav>
                </TabList>
                <div className="p-6">
                    <TabContent value="realtime">
                        <RealtimeTab />
                    </TabContent>
                    <TabContent value="general">
                        <GeneralTab />
                    </TabContent>
                    <TabContent value="integrations">
                        <IntegrationsTab />
                    </TabContent>
                    <TabContent value="subscriptions">
                        <SubscriptionsTab />
                    </TabContent>
                    <TabContent value="backups">
                        <BackupsTab />
                    </TabContent>
                    <TabContent value="system">
                        <SystemTab />
                    </TabContent>
                    <TabContent value="system-logs">
                        <SystemLogsTab />
                    </TabContent>
                </div>
            </Tabs>
        </AdaptiveCard>
    )
}

export default SettingsTabs
