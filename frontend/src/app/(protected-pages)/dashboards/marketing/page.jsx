import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import getMarketingDashboard from '@/server/actions/getMarketingDashboard'
import Loading from '@/components/shared/Loading'

// Динамический импорт для тяжелых компонентов с чартами
const AdsPerformance = dynamic(() => import('./_components/AdsPerformance'), {
    loading: () => (
        <div className="h-[500px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const LeadPerformance = dynamic(() => import('./_components/LeadPerformance'), {
    loading: () => (
        <div className="h-[500px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

// Легкие компоненты загружаем сразу
import KpiSummary from './_components/KpiSummary'
import RecentCampaign from './_components/RecentCampaign'

export default async function Page() {
    const data = await getMarketingDashboard()

    return (
        <div className="flex flex-col gap-4">
            <KpiSummary data={data.kpiSummary} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-x-4">
                <div className="col-span-2">
                    <Suspense
                        fallback={
                            <div className="h-[500px] flex items-center justify-center">
                                <Loading loading />
                            </div>
                        }
                    >
                        <AdsPerformance data={data.adsPerformance} />
                    </Suspense>
                </div>
                <Suspense
                    fallback={
                        <div className="h-[500px] flex items-center justify-center">
                            <Loading loading />
                        </div>
                    }
                >
                    <LeadPerformance data={data.leadPerformance} />
                </Suspense>
            </div>
            <RecentCampaign data={data.recentCampaign} />
        </div>
    )
}
