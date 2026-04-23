'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Loading from '@/components/shared/Loading'
import PermissionGuard from '@/components/shared/PermissionGuard'
import SegmentTabBar from '@/components/shared/SegmentTabBar'
import classNames from '@/utils/classNames'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { AdvertisementsRegularPanel } from './_components/AdvertisementsRegularPanel'
import { AdvertisementsAdsPanel } from './_components/AdvertisementsAdsPanel'

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
                <div className="flex min-w-0 flex-col gap-4">
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {tPage('title')}
                        </h4>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {tPage('description')}
                        </p>
                    </div>

                    <SegmentTabBar
                        value={activeTab}
                        onChange={handleTabChange}
                        items={[
                            { value: 'regular', label: tNav('list') },
                            { value: 'ads', label: tNav('ads') },
                        ]}
                    />

                    <div className="mt-6 min-w-0">
                        <div className={classNames('min-w-0', activeTab !== 'regular' && 'hidden')}>
                            <AdvertisementsRegularPanel queryEnabled={activeTab === 'regular'} />
                        </div>
                        <div className={classNames('min-w-0', activeTab !== 'ads' && 'hidden')}>
                            <AdvertisementsAdsPanel queryEnabled={activeTab === 'ads'} />
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}
