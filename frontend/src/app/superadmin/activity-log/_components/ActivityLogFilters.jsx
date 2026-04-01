'use client'

import { useState, useMemo, useEffect } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { FormItem } from '@/components/ui/Form'
import dayjs from 'dayjs'
import Button from '@/components/ui/Button'
import { PiMagnifyingGlass, PiX } from 'react-icons/pi'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

const SELECT_COMMON = {
    size: 'sm',
    isSearchable: false,
    isClearable: false,
    menuPlacement: 'bottom',
}

const ActivityLogFilters = () => {
    const t = useTranslations('superadmin.activity')
    const router = useRouter()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState('')
    const [segment, setSegment] = useState('')
    const [action, setAction] = useState('')
    const [entityType, setEntityType] = useState('')
    const [category, setCategory] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    useEffect(() => {
        setSearch(searchParams.get('search') || '')
        setSegment(searchParams.get('segment') || '')
        setAction(searchParams.get('action') || '')
        setEntityType(searchParams.get('entity_type') || '')
        setCategory(searchParams.get('category') || '')
        setDateFrom(searchParams.get('date_from') || '')
        setDateTo(searchParams.get('date_to') || '')
    }, [searchParams])

    const segmentOptions = useMemo(
        () => [
            { value: '', label: t('filters.allSegments') },
            { value: 'admin', label: t('segments.admin') },
            { value: 'business', label: t('segments.business') },
            { value: 'client', label: t('segments.client') },
            { value: 'system', label: t('segments.system') },
        ],
        [t],
    )

    const actionOptions = useMemo(
        () => [
            { value: '', label: t('filters.allActions') },
            { value: 'create', label: t('actions.create') },
            { value: 'update', label: t('actions.update') },
            { value: 'delete', label: t('actions.delete') },
            { value: 'approve', label: t('actions.approve') },
            { value: 'reject', label: t('actions.reject') },
            { value: 'block', label: t('actions.block') },
            { value: 'unblock', label: t('actions.unblock') },
            { value: 'login', label: t('actions.login') },
            { value: 'logout', label: t('actions.logout') },
        ],
        [t],
    )

    const entityTypeOptions = useMemo(
        () => [
            { value: '', label: t('filters.allEntities') },
            { value: 'Company', label: t('categories.company') },
            { value: 'User', label: t('categories.user') },
            { value: 'Advertisement', label: t('categories.advertisement') },
            { value: 'Category', label: t('filters.entityCategory') },
            { value: 'Review', label: t('categories.review') },
            { value: 'Settings', label: t('categories.settings') },
            { value: 'Booking', label: t('categories.booking') },
            { value: 'Service', label: t('categories.service') },
        ],
        [t],
    )

    const categoryOptions = useMemo(
        () => [
            { value: '', label: t('filters.allCategories') },
            { value: 'auth', label: t('categories.auth') },
            { value: 'company', label: t('categories.company') },
            { value: 'booking', label: t('categories.booking') },
            { value: 'user', label: t('categories.user') },
            { value: 'advertisement', label: t('categories.advertisement') },
            { value: 'review', label: t('categories.review') },
            { value: 'settings', label: t('categories.settings') },
            { value: 'service', label: t('categories.service') },
        ],
        [t],
    )

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams.toString())

        params.delete('search')
        params.delete('segment')
        params.delete('action')
        params.delete('entity_type')
        params.delete('category')
        params.delete('date_from')
        params.delete('date_to')

        if (search) params.set('search', search)
        if (segment) params.set('segment', segment)
        if (action) params.set('action', action)
        if (entityType) params.set('entity_type', entityType)
        if (category) params.set('category', category)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)

        params.set('pageIndex', '1')
        router.push(`/superadmin/activity-log?${params.toString()}`)
    }

    const handleClearFilters = () => {
        setSearch('')
        setSegment('')
        setAction('')
        setEntityType('')
        setCategory('')
        setDateFrom('')
        setDateTo('')
        router.push('/superadmin/activity-log?pageIndex=1')
    }

    const hasActiveFilters =
        search || segment || action || entityType || category || dateFrom || dateTo

    const opt = (options, value) => options.find((o) => o.value === value) || options[0]

    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 sm:p-5">
            <div className="flex flex-col gap-5">
                <FormItem label={t('filters.searchLabel')} className="mb-0">
                    <Input
                        placeholder={t('filters.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        prefix={<PiMagnifyingGlass className="text-lg text-gray-400" aria-hidden />}
                        size="sm"
                    />
                </FormItem>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
                    <FormItem label={t('filters.segment')} className="mb-0">
                        <Select
                            {...SELECT_COMMON}
                            options={segmentOptions}
                            value={opt(segmentOptions, segment)}
                            onChange={(option) => setSegment(option.value)}
                        />
                    </FormItem>
                    <FormItem label={t('filters.category')} className="mb-0">
                        <Select
                            {...SELECT_COMMON}
                            options={categoryOptions}
                            value={opt(categoryOptions, category)}
                            onChange={(option) => setCategory(option.value)}
                        />
                    </FormItem>
                    <FormItem label={t('filters.action')} className="mb-0">
                        <Select
                            {...SELECT_COMMON}
                            options={actionOptions}
                            value={opt(actionOptions, action)}
                            onChange={(option) => setAction(option.value)}
                        />
                    </FormItem>
                    <FormItem label={t('filters.entityType')} className="mb-0">
                        <Select
                            {...SELECT_COMMON}
                            options={entityTypeOptions}
                            value={opt(entityTypeOptions, entityType)}
                            onChange={(option) => setEntityType(option.value)}
                        />
                    </FormItem>
                    <FormItem label={t('filters.dateFrom')} className="mb-0">
                        <DatePicker
                            size="sm"
                            type="date"
                            inputtable={false}
                            placeholder="—"
                            value={dateFrom ? dayjs(dateFrom, 'YYYY-MM-DD').toDate() : null}
                            onChange={(d) => setDateFrom(d ? dayjs(d).format('YYYY-MM-DD') : '')}
                        />
                    </FormItem>
                    <FormItem label={t('filters.dateTo')} className="mb-0">
                        <DatePicker
                            size="sm"
                            type="date"
                            inputtable={false}
                            placeholder="—"
                            minDate={dateFrom ? dayjs(dateFrom, 'YYYY-MM-DD').toDate() : undefined}
                            value={dateTo ? dayjs(dateTo, 'YYYY-MM-DD').toDate() : null}
                            onChange={(d) => setDateTo(d ? dayjs(d).format('YYYY-MM-DD') : '')}
                        />
                    </FormItem>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-600">
                    <Button variant="solid" size="sm" type="button" onClick={handleApplyFilters}>
                        {t('filters.apply')}
                    </Button>
                    {hasActiveFilters && (
                        <Button
                            variant="plain"
                            size="sm"
                            type="button"
                            icon={<PiX className="text-lg" aria-hidden />}
                            onClick={handleClearFilters}
                        >
                            {t('filters.clear')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ActivityLogFilters
