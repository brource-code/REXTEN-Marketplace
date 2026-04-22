'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import { Tabs } from '@/components/ui/Tabs'
import PermissionGuard from '@/components/shared/PermissionGuard'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { AdvertisementsRegularPanel } from './_components/AdvertisementsRegularPanel'
import { AdvertisementsAdsPanel } from './_components/AdvertisementsAdsPanel'
import { PiListBullets, PiMegaphone } from 'react-icons/pi'

export default function AdvertisementsPage() {
    return (
        <PermissionGuard permission="manage_settings">
            <Suspense
                fallback={
                    <Container>
                        <AdaptiveCard>
                            <div className="flex items-center justify-center min-h-[400px]">
                                <Loading loading />
                            </div>
                        </AdaptiveCard>
                    </Container>
                }
            >
                <AdvertisementsPageLayout />
            </Suspense>
        </PermissionGuard>
    )
}

function AdvertisementsPageLayout() {
    const tNav = useTranslations('nav.business.advertisements')
    const tPage = useTranslations('business.advertisements')
    const searchParams = useSearchParams()
    const { onAppendQueryParams } = useAppendQueryParams()

    const activeTab = searchParams.get('tab') === 'ads' ? 'ads' : 'regular'

    const handleTabChange = (value) => {
        if (value === 'ads') {
            onAppendQueryParams({ tab: 'ads', pageIndex: '1' })
        } else {
            onAppendQueryParams({ tab: null, pageIndex: '1' })
        }
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {tPage('title')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {tPage('description')}
                        </p>
                    </div>

                    <Tabs value={activeTab} onChange={handleTabChange} variant="underline">
                        <Tabs.TabList>
                            <Tabs.TabNav value="regular" icon={<PiListBullets className="text-lg" />}>
                                {tNav('list')}
                            </Tabs.TabNav>
                            <Tabs.TabNav value="ads" icon={<PiMegaphone className="text-lg" />}>
                                {tNav('ads')}
                            </Tabs.TabNav>
                        </Tabs.TabList>

                        <div className="mt-6">
                            <Tabs.TabContent value="regular">
                                <AdvertisementsRegularPanel queryEnabled={activeTab === 'regular'} />
                            </Tabs.TabContent>
                            <Tabs.TabContent value="ads">
                                <AdvertisementsAdsPanel queryEnabled={activeTab === 'ads'} />
                            </Tabs.TabContent>
                        </div>
                    </Tabs>
                </div>
            </AdaptiveCard>
        </Container>
    )
}
