'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function RouteStopsList({ stops }) {
    const t = useTranslations('business.routes')

    if (!stops?.length) {
        return (
            <div className="space-y-2">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noRouteForDate')}</p>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/business/schedule"
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {t('ctaSchedule')}
                    </Link>
                    <span className="text-sm font-bold text-gray-400">·</span>
                    <Link
                        href="/business/bookings"
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {t('ctaBookings')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <ol className="list-decimal list-inside space-y-2">
            {stops.map((stop) => (
                <li
                    key={stop.id}
                    className="text-sm font-bold text-gray-900 dark:text-gray-100"
                >
                    <span className="text-gray-500 dark:text-gray-400 mr-2">
                        {t(`stopType.${stop.stop_type}`)}
                    </span>
                    {stop.stop_type === 'booking' && stop.booking?.client_name
                        ? stop.booking.client_name
                        : `#${stop.sequence_order}`}
                    {stop.stop_type === 'booking' && stop.booking?.title ? (
                        <span className="block text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                            {stop.booking.title}
                        </span>
                    ) : null}
                    {stop.booking?.offsite_address_missing ? (
                        <span className="block text-sm font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                            {t('stopOffsiteAddressMissing', {
                                client: stop.booking.client_name || t('stopBookingFallbackName'),
                            })}
                        </span>
                    ) : stop.booking?.address ? (
                        <span className="block text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                            {stop.booking.address}
                        </span>
                    ) : null}
                </li>
            ))}
        </ol>
    )
}
