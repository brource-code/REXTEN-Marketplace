'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { PiArrowLeft } from 'react-icons/pi'

export function AdvertisementCreatePageHeader({ isEdit }) {
    const t = useTranslations('business.advertisements.create')

    return (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <Link href="/business/advertisements" className="shrink-0">
                    <Button variant="plain" icon={<PiArrowLeft />} />
                </Link>
                <div className="min-w-0 flex-1">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {isEdit ? t('editTitle') : t('title')}
                    </h4>
                    <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
                </div>
            </div>
        </div>
    )
}
