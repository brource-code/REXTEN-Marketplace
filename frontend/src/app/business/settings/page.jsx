'use client'

import Container from '@/components/shared/Container'
import SettingsTabs from './_components/SettingsTabs'
import PermissionGuard from '@/components/shared/PermissionGuard'

/**
 * Страница настроек бизнеса
 * Профиль, услуги, команда, портфолио, расписание, уведомления, платежи
 */
export default function Page() {
    return (
        <PermissionGuard permission="manage_settings">
            <Container>
                <SettingsTabs />
            </Container>
        </PermissionGuard>
    )
}
