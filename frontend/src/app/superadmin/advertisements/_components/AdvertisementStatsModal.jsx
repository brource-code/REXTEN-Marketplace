'use client'

import { useQuery } from '@tanstack/react-query'
import Dialog from '@/components/ui/Dialog'
import Loading from '@/components/shared/Loading'
import Card from '@/components/ui/Card'
import { PiEye, PiCursorClick, PiChartLine, PiMapPin, PiCalendar, PiUsers } from 'react-icons/pi'
import { getAdvertisementStats } from '@/lib/api/superadmin'
import { NumericFormat } from 'react-number-format'
import { formatDate } from '@/utils/dateTime'
import { SUPERADMIN_DISPLAY_TIMEZONE } from '@/constants/superadmin-datetime.constant'

/**
 * Модальное окно детальной статистики рекламного объявления
 */
const AdvertisementStatsModal = ({ isOpen, onClose, advertisementId }) => {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['advertisement-stats', advertisementId],
        queryFn: () => getAdvertisementStats(advertisementId),
        enabled: isOpen && !!advertisementId,
        staleTime: 30000, // 30 секунд
    })

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            width={800}
        >
            <div className="p-4">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PiChartLine className="text-blue-600" />
                    Статистика объявления
                </h4>

                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loading loading />
                    </div>
                )}

                {error && (
                    <div className="text-center py-8 text-red-500">
                        Не удалось загрузить статистику
                    </div>
                )}

                {stats && (
                    <div className="space-y-4">
                        {/* Заголовок */}
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                            <h5 className="font-medium text-gray-900 dark:text-white">{stats.title}</h5>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                {stats.start_date && stats.end_date && (
                                    <span className="flex items-center gap-1">
                                        <PiCalendar />
                                        {formatDate(stats.start_date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric')} - {formatDate(stats.end_date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric')}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    stats.is_active 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' 
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                    {stats.is_active ? 'Активно' : 'Неактивно'}
                                </span>
                            </div>
                        </div>

                        {/* Основные метрики */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="p-4 text-center">
                                <PiEye className="text-2xl text-blue-600 mx-auto mb-2" />
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    <NumericFormat 
                                        displayType="text" 
                                        value={stats.total_impressions} 
                                        thousandSeparator=" " 
                                    />
                                </div>
                                <div className="text-xs text-gray-500">Показов</div>
                            </Card>

                            <Card className="p-4 text-center">
                                <PiUsers className="text-2xl text-purple-600 mx-auto mb-2" />
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    <NumericFormat 
                                        displayType="text" 
                                        value={stats.unique_impressions} 
                                        thousandSeparator=" " 
                                    />
                                </div>
                                <div className="text-xs text-gray-500">Уникальных показов</div>
                            </Card>

                            <Card className="p-4 text-center">
                                <PiCursorClick className="text-2xl text-green-600 mx-auto mb-2" />
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    <NumericFormat 
                                        displayType="text" 
                                        value={stats.total_clicks} 
                                        thousandSeparator=" " 
                                    />
                                </div>
                                <div className="text-xs text-gray-500">Кликов</div>
                            </Card>

                            <Card className="p-4 text-center">
                                <PiChartLine className="text-2xl text-amber-600 mx-auto mb-2" />
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    {stats.ctr}%
                                </div>
                                <div className="text-xs text-gray-500">CTR</div>
                            </Card>
                        </div>

                        {/* Показы по дням */}
                        {stats.impressions_by_day && stats.impressions_by_day.length > 0 && (
                            <div>
                                <h6 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <PiCalendar />
                                    Показы по дням (последние 30 дней)
                                </h6>
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                    <div className="space-y-2">
                                        {stats.impressions_by_day.map((day, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {formatDate(day.date, SUPERADMIN_DISPLAY_TIMEZONE, 'numeric')}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="h-2 bg-blue-500 rounded-full" 
                                                        style={{ 
                                                            width: `${Math.max(20, Math.min(200, day.impressions / Math.max(...stats.impressions_by_day.map(d => d.impressions)) * 200))}px` 
                                                        }}
                                                    />
                                                    <span className="font-medium text-gray-900 dark:text-white w-12 text-right">
                                                        {day.impressions}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* География */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* По штатам */}
                            {stats.by_state && stats.by_state.length > 0 && (
                                <div>
                                    <h6 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <PiMapPin />
                                        По штатам
                                    </h6>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                                        <div className="space-y-2">
                                            {stats.by_state.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">{item.state}</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">{item.impressions}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* По городам */}
                            {stats.by_city && stats.by_city.length > 0 && (
                                <div>
                                    <h6 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <PiMapPin />
                                        По городам
                                    </h6>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                                        <div className="space-y-2">
                                            {stats.by_city.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">{item.city}</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">{item.impressions}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Если нет данных по географии */}
                        {(!stats.by_state || stats.by_state.length === 0) && (!stats.by_city || stats.by_city.length === 0) && (
                            <div className="text-center text-gray-500 text-sm py-4">
                                Нет данных по географии показов
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Dialog>
    )
}

export default AdvertisementStatsModal
