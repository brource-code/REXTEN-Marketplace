import Container from '@/components/shared/Container'
import SettingsTabs from './_components/SettingsTabs'

/**
 * Настройки платформы (суперадмин)
 * Общие настройки системы, интеграции, платежи, комиссии
 */
export default async function Page() {
    // TODO: Заменить на реальный API вызов
    // const settings = await SuperAdminService.getPlatformSettings()
    
    return (
        <Container>
            <SettingsTabs />
        </Container>
    )
}
