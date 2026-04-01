'use client'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import GeneralTab from './tabs/GeneralTab'
import IntegrationsTab from './tabs/IntegrationsTab'
import PaymentsTab from './tabs/PaymentsTab'
import FeesTab from './tabs/FeesTab'
import SystemTab from './tabs/SystemTab'
import {
    PiGear,
    PiPlug,
    PiCreditCard,
    PiPercent,
    PiCpu,
} from 'react-icons/pi'

const { TabNav, TabList, TabContent } = Tabs

const SettingsTabs = () => {
    return (
        <Card>
            <div className="mb-6">
                <h3>Настройки платформы</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Общие настройки системы, интеграции, платежи и комиссии
                </p>
            </div>

            <Tabs defaultValue="general">
                <TabList>
                    <TabNav value="general" icon={<PiGear />}>
                        Общие
                    </TabNav>
                    <TabNav value="integrations" icon={<PiPlug />}>
                        Интеграции
                    </TabNav>
                    <TabNav value="payments" icon={<PiCreditCard />}>
                        Платежи
                    </TabNav>
                    <TabNav value="fees" icon={<PiPercent />}>
                        Комиссии
                    </TabNav>
                    <TabNav value="system" icon={<PiCpu />}>
                        Система
                    </TabNav>
                </TabList>
                <div className="p-6">
                    <TabContent value="general">
                        <GeneralTab />
                    </TabContent>
                    <TabContent value="integrations">
                        <IntegrationsTab />
                    </TabContent>
                    <TabContent value="payments">
                        <PaymentsTab />
                    </TabContent>
                    <TabContent value="fees">
                        <FeesTab />
                    </TabContent>
                    <TabContent value="system">
                        <SystemTab />
                    </TabContent>
                </div>
            </Tabs>
        </Card>
    )
}

export default SettingsTabs

