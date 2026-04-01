import Container from '@/components/shared/Container'
import SettingsTabs from './_components/SettingsTabs'

/**
 * Страница настроек бизнеса
 * Профиль, услуги, команда, портфолио, расписание, уведомления, платежи
 */
export default async function Page() {
    // TODO: Заменить на реальный API вызов
    // const settings = await CompanyService.getCurrentCompany()
    
    return (
        <Container>
            <SettingsTabs />
        </Container>
    )
}
