'use client'

import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import LoyaltyProgramBlock from '@/components/loyalty/LoyaltyProgramBlock'

/**
 * Прогресс лояльности клиента по текущей компании (данные с /business/clients/:id).
 */
export default function ClientLoyaltyCard({ loyalty }) {
    const t = useTranslations('business.clients.loyalty')
    if (!loyalty) return null

    const tiersConfigured = loyalty.tiers_configured !== false

    if (!tiersConfigured) {
        return (
            <Card>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('notConfiguredShort')}</p>
            </Card>
        )
    }

    return (
        <Card>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 sm:text-base">{t('title')}</h4>
            <div className="mt-3 sm:mt-4">
                <LoyaltyProgramBlock
                    variant="business"
                    loyaltyBookingsCount={loyalty.loyalty_bookings_count}
                    loyaltyRule={loyalty.loyalty_rule}
                    currentTier={loyalty.current_tier}
                    nextTier={loyalty.next_tier}
                    bookingsToNext={loyalty.bookings_to_next_tier}
                />
            </div>
        </Card>
    )
}
