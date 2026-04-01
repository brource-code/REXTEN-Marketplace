'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import AdvertisementsTable from './_components/AdvertisementsTable'
import ServicesTable from './_components/ServicesTable'
import { Tabs } from '@/components/ui/Tabs'
import { useQuery } from '@tanstack/react-query'
import { getAdvertisements } from '@/lib/api/superadmin'
import { getFilteredServices } from '@/lib/api/marketplace'
import Loading from '@/components/shared/Loading'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { PiArrowRight, PiMegaphone } from 'react-icons/pi'

/**
 * Управление объявлениями (суперадмин)
 * Обычные объявления - полное управление
 * Рекламные объявления - только просмотр с кнопкой перехода к управлению
 */
export default function Page() {
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status') || ''
    const [activeTab, setActiveTab] = useState('advertisements')
    
    const { data: advertisementsData, isLoading: isLoadingAds } = useQuery({
        queryKey: ['advertisements', pageIndex, pageSize, status, activeTab],
        queryFn: () => getAdvertisements({
            page: pageIndex,
            pageSize,
            status: status || undefined,
            type: activeTab === 'advertisements' ? 'advertisement' : 'regular',
        }),
    })

    const { data: services, isLoading: isLoadingServices } = useQuery({
        queryKey: ['marketplace-services'],
        queryFn: () => getFilteredServices({}),
        enabled: activeTab === 'services',
    })

    const isLoading = activeTab === 'advertisements' ? isLoadingAds : isLoadingServices
    const advertisements = advertisementsData?.data || []
    const total = advertisementsData?.total || 0

    if (isLoading) {
        return (
            <Container>
                <AdaptiveCard>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Loading loading />
                    </div>
                </AdaptiveCard>
            </Container>
        )
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Управление объявлениями</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                Все объявления: рекламные и спонсированные предложения
                            </p>
                        </div>
                        {activeTab === 'advertisements' && (
                            <Link href="/superadmin/advertisements/ads">
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<PiMegaphone />}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Управление рекламой
                                    <PiArrowRight className="ml-1" size={14} />
                                </Button>
                            </Link>
                        )}
                    </div>
                    
                    <Tabs value={activeTab} onChange={setActiveTab} variant="underline">
                        <Tabs.TabList>
                            <Tabs.TabNav value="advertisements">
                                Рекламные
                            </Tabs.TabNav>
                            <Tabs.TabNav value="services">
                                Обычные услуги
                            </Tabs.TabNav>
                        </Tabs.TabList>
                        
                        <Tabs.TabContent value="advertisements">
                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            Рекламные объявления
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                            Для полного управления рекламными объявлениями, статистики и модерации перейдите в раздел управления рекламой
                                        </p>
                                    </div>
                                    <Link href="/superadmin/advertisements/ads">
                                        <Button
                                            variant="solid"
                                            size="sm"
                                            icon={<PiMegaphone />}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            Управление рекламой
                                            <PiArrowRight className="ml-1" size={14} />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <AdvertisementsTable
                                advertisements={advertisements}
                                type="advertisement"
                                pageIndex={pageIndex}
                                pageSize={pageSize}
                                total={total}
                                simplified={true}
                            />
                        </Tabs.TabContent>
                        
                        <Tabs.TabContent value="services">
                            <div className="mt-4">
                                <p className="text-sm text-gray-500 mb-4">
                                    Обычные объявления компаний, размещенные на маркетплейсе
                                </p>
                                <AdvertisementsTable
                                    advertisements={advertisements}
                                    type="regular"
                                    pageIndex={pageIndex}
                                    pageSize={pageSize}
                                    total={total}
                                    simplified={false}
                                />
                            </div>
                        </Tabs.TabContent>
                    </Tabs>
                </div>
            </AdaptiveCard>
        </Container>
    )
}
