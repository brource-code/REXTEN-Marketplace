'use client'

import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'

export default function RouteFilters({ teamMembers, specialistId, onSpecialistChange, date, onDateChange }) {
    const t = useTranslations('business.routes')

    const options =
        teamMembers?.map((m) => ({
            value: String(m.id),
            label: m.name || `ID ${m.id}`,
        })) ?? []

    const value = specialistId ? options.find((o) => o.value === String(specialistId)) : null

    return (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('selectSpecialist')}</p>
                <Select
                    isSearchable={false}
                    placeholder={t('selectSpecialist')}
                    options={options}
                    value={value}
                    onChange={(opt) => onSpecialistChange(opt ? Number(opt.value) : null)}
                />
            </div>
            <div className="min-w-[200px]">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('selectDate')}</p>
                <DatePicker
                    clearable={false}
                    value={date ? dayjs(date).toDate() : null}
                    onChange={(d) => {
                        onDateChange(d ? dayjs(d).format('YYYY-MM-DD') : date)
                    }}
                    placeholder={t('selectDate')}
                    size="sm"
                />
            </div>
        </div>
    )
}
