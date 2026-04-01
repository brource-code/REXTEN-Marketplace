'use client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { PiStorefrontDuotone } from 'react-icons/pi'
import { useAuthStore } from '@/store'
import { BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const MarketplaceButton = () => {
    const { isAuthenticated, userRole } = useAuthStore()
    
    // Показываем кнопку только для бизнеса и суперадмина
    if (!isAuthenticated || (userRole !== BUSINESS_OWNER && userRole !== SUPERADMIN)) {
        return null
    }

    // Используем обычный Link - токены уже в localStorage,
    // AuthInitializer проверит их при загрузке маркетплейса
    // При переходе на маркетплейс токен будет доступен из localStorage
    return (
        <Link href="/services">
            <Button
                variant="plain"
                size="sm"
                icon={<PiStorefrontDuotone />}
                className="mr-2"
            >
                Главная
            </Button>
        </Link>
    )
}

export default MarketplaceButton

