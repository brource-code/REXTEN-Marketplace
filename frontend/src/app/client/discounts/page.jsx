'use client'

import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import { useQuery } from '@tanstack/react-query'
import { getClientLoyaltyProgress } from '@/lib/api/client'
import { useTranslations } from 'next-intl'
import LoyaltyProgramBlock from '@/components/loyalty/LoyaltyProgramBlock'

export default function Page() {
    const t = useTranslations('client.discounts')
    const { data, isLoading } = useQuery({
        queryKey: ['client-loyalty-discounts'],
        queryFn: getClientLoyaltyProgress,
    })

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[280px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    const items = data || []

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
                    </div>

                    {items.length === 0 ? (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('empty')}</p>
                    ) : (
                        <div className="space-y-4">
                            {items.map((row) => (
                                <LoyaltyProgramBlock
                                    key={row.company_id}
                                    variant="marketplace"
                                    companyName={row.company_name}
                                    companySlug={row.company_slug}
                                    loyaltyBookingsCount={row.loyalty_bookings_count}
                                    loyaltyRule={row.loyalty_rule}
                                    currentTier={row.current_tier}
                                    nextTier={row.next_tier}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}
