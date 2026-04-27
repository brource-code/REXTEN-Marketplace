'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Card from '@/components/ui/Card'
import ActivityLogTable from './_components/ActivityLogTable'
import ActivityLogFilters from './_components/ActivityLogFilters'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { PiDownload, PiArrowClockwise } from 'react-icons/pi'
import { useQuery } from '@tanstack/react-query'
import { getActivityLogs, getActivityStats, exportActivityLogs } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'
import { useRouter } from 'next/navigation'
import { NumericFormat } from 'react-number-format'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { formatSuperadminChartDayLabel } from '@/utils/dateTime'

const Chart = dynamic(() => import('@/components/shared/Chart'), {
    ssr: false,
    loading: () => (
        <div className="h-[200px] flex items-center justify-center">
            <Loading loading />
        </div>
    ),
})

const segmentColors = {
    admin: 'bg-purple-200 dark:bg-purple-900/40 text-gray-900 dark:text-gray-100',
    business: 'bg-blue-200 dark:bg-blue-900/40 text-gray-900 dark:text-gray-100',
    client: 'bg-emerald-200 dark:bg-emerald-900/40 text-gray-900 dark:text-gray-100',
    system: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

export default function Page() {
    const t = useTranslations('superadmin.activity')
    const router = useRouter()
    const searchParams = useSearchParams()
    const pageIndex = parseInt(searchParams.get('pageIndex') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || ''
    const entityType = searchParams.get('entity_type') || ''
    const segment = searchParams.get('segment') || ''
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo = searchParams.get('date_to') || ''

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['activity-stats'],
        queryFn: getActivityStats,
    })

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['activity-logs', pageIndex, pageSize, search, action, entityType, segment, category, dateFrom, dateTo],
        queryFn: () => getActivityLogs({
            page: pageIndex,
            pageSize,
            search: search || undefined,
            action: action || undefined,
            entity_type: entityType || undefined,
            segment: segment || undefined,
            category: category || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }),
    })

    const chartData = useMemo(() => {
        if (!stats?.last_7_days?.length) {
            return { series: [{ name: t('chart.activity'), data: [] }], categories: [] }
        }
        return {
            series: [{ name: t('chart.activity'), data: stats.last_7_days.map(d => d.count) }],
            categories: stats.last_7_days.map((d) => formatSuperadminChartDayLabel(d.date)),
        }
    }, [stats, t])

    const handleExport = async () => {
        try {
            const blob = await exportActivityLogs({
                action: action || undefined,
                entity_type: entityType || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    const handleSegmentClick = (seg) => {
        const params = new URLSearchParams(searchParams.toString())
        if (segment === seg) {
            params.delete('segment')
        } else {
            params.set('segment', seg)
        }
        params.set('pageIndex', '1')
        router.push(`/superadmin/activity-log?${params.toString()}`)
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {t('title')}
                            </h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('subtitle')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                icon={<PiArrowClockwise className="text-lg" />}
                                onClick={() => refetch()}
                            >
                                {t('refresh')}
                            </Button>
                            <Button
                                variant="solid"
                                size="sm"
                                icon={<PiDownload className="text-lg" />}
                                onClick={handleExport}
                            >
                                {t('exportCsv')}
                            </Button>
                        </div>
                    </div>

                    {/* Статистика */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {t('stats.total')}
                            </div>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {statsLoading ? <Loading loading /> : (
                                    <NumericFormat
                                        displayType="text"
                                        value={stats?.total || 0}
                                        thousandSeparator
                                    />
                                )}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {t('stats.today')}
                            </div>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {statsLoading ? <Loading loading /> : stats?.today || 0}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {t('stats.adminActions')}
                            </div>
                            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {statsLoading ? <Loading loading /> : stats?.by_segment?.admin || 0}
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">
                                {t('stats.clientActions')}
                            </div>
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {statsLoading ? <Loading loading /> : stats?.by_segment?.client || 0}
                            </div>
                        </Card>
                    </div>

                    {/* График активности */}
                    <Card className="p-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            {t('chart.title')}
                        </h4>
                        {statsLoading ? (
                            <div className="h-[200px] flex items-center justify-center">
                                <Loading loading />
                            </div>
                        ) : chartData.series[0].data.length > 0 ? (
                            <Chart
                                series={chartData.series}
                                xAxis={chartData.categories}
                                height={200}
                                type="bar"
                            />
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                {t('chart.noData')}
                            </div>
                        )}
                    </Card>

                    {/* Сегменты */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {['admin', 'business', 'client', 'system'].map(seg => (
                            <Card
                                key={seg}
                                className={`p-4 cursor-pointer transition-all ${
                                    segment === seg ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => handleSegmentClick(seg)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {t(`segments.${seg}`)}
                                        </div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                            {stats?.by_segment?.[seg] || 0}
                                        </div>
                                    </div>
                                    <Tag className={segmentColors[seg]}>
                                        {seg}
                                    </Tag>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <ActivityLogFilters />
                    
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[200px]">
                            <Loading loading />
                        </div>
                    ) : data && (data.data || []).length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('notFound')}</p>
                        </div>
                    ) : (
                        <ActivityLogTable
                            logsList={data?.data || []}
                            logsTotal={data?.total || 0}
                            pageIndex={pageIndex}
                            pageSize={pageSize}
                        />
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}
