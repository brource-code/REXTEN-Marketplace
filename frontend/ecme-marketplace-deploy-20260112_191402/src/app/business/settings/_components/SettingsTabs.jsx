'use client'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import ProfileTab from './tabs/ProfileTab'
import TeamTab from './tabs/TeamTab'
import ScheduleTab from './tabs/ScheduleTab'
import NotificationsTab from './tabs/NotificationsTab'
import PaymentsTab from './tabs/PaymentsTab'
import MarketplaceTab from './tabs/MarketplaceTab'
import ServicesTab from './tabs/ServicesTab'
import {
    PiUser,
    PiUsers,
    PiClock,
    PiBell,
    PiCreditCard,
    PiStorefront,
    PiListBullets,
} from 'react-icons/pi'

const { TabNav, TabList, TabContent } = Tabs

const SettingsTabs = () => {
    return (
        <Card>
            <div className="mb-6">
                <h3>Настройки бизнеса</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Управление профилем, командой, расписанием и другими настройками бизнеса
                </p>
                <p className="text-xs text-gray-400 mt-2">
                    💡 Шаблоны услуг можно создавать здесь, а использовать при создании объявлений в разделе <a href="/business/advertisements" className="text-blue-600 hover:underline">Объявления</a>
                </p>
            </div>

            <Tabs defaultValue="profile">
                <TabList>
                    <TabNav value="profile" icon={<PiUser />}>
                        Профиль
                    </TabNav>
                    <TabNav value="services" icon={<PiListBullets />}>
                        Услуги
                    </TabNav>
                    <TabNav value="team" icon={<PiUsers />}>
                        Команда
                    </TabNav>
                    <TabNav value="schedule" icon={<PiClock />}>
                        Расписание
                    </TabNav>
                    <TabNav value="notifications" icon={<PiBell />}>
                        Уведомления
                    </TabNav>
                    <TabNav value="payments" icon={<PiCreditCard />}>
                        Платежи
                    </TabNav>
                    <TabNav value="marketplace" icon={<PiStorefront />}>
                        Главная
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
        </Card>
    )
}

export default SettingsTabs

