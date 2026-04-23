'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import { TbSearch, TbX } from 'react-icons/tb'
import { PiArrowCounterClockwise } from 'react-icons/pi'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import ClientsActionTools from './ClientsActionTools'

const DEFAULT_SORT_KEY = 'name'
const DEFAULT_ORDER = 'asc'

function parseSortCombo(combo) {
    const parts = String(combo || '').split('_')
    if (parts.length < 2) {
        return { sortKey: DEFAULT_SORT_KEY, order: DEFAULT_ORDER }
    }
    const order = parts[parts.length - 1] === 'desc' ? 'desc' : 'asc'
    const sortKey = parts.slice(0, -1).join('_') || DEFAULT_SORT_KEY
    return { sortKey, order }
}

function buildSortCombo(sortKey, order) {
    return `${sortKey}_${order}`
}

export default function ClientsTableTools() {
    const t = useTranslations('business.clients')
    const tt = useTranslations('business.clients.tools')
    const searchParams = useSearchParams()
    const { onAppendQueryParams } = useAppendQueryParams()

    const urlSearch = searchParams.get('search') || ''
    const urlStatus = searchParams.get('status') || ''
    const urlQuick = searchParams.get('quickFilter') || ''
    const urlSortKey = searchParams.get('sortKey') || DEFAULT_SORT_KEY
    const urlOrder = searchParams.get('order') === 'desc' ? 'desc' : 'asc'

    const [searchValue, setSearchValue] = useState(urlSearch)

    useEffect(() => {
        setSearchValue(urlSearch)
    }, [urlSearch])

    const statusOptions = useMemo(
        () => [
            { value: '', label: tt('allStatuses') },
            { value: 'regular', label: t('statuses.regular') },
            { value: 'permanent', label: t('statuses.permanent') },
            { value: 'vip', label: t('statuses.vip') },
        ],
        [t, tt],
    )

    const sortOptions = useMemo(
        () => [
            { value: 'name_asc', label: tt('sortNameAsc') },
            { value: 'name_desc', label: tt('sortNameDesc') },
            { value: 'lastVisit_desc', label: tt('sortLastVisitDesc') },
            { value: 'lastVisit_asc', label: tt('sortLastVisitAsc') },
            { value: 'totalBookings_desc', label: tt('sortBookingsDesc') },
            { value: 'totalBookings_asc', label: tt('sortBookingsAsc') },
            { value: 'totalSpent_desc', label: tt('sortSpentDesc') },
            { value: 'totalSpent_asc', label: tt('sortSpentAsc') },
            { value: 'status_asc', label: tt('sortStatusAsc') },
            { value: 'status_desc', label: tt('sortStatusDesc') },
        ],
        [tt],
    )

    const currentStatus = useMemo(() => {
        return statusOptions.find((o) => o.value === urlStatus) || statusOptions[0]
    }, [statusOptions, urlStatus])

    const currentSort = useMemo(() => {
        const combo = buildSortCombo(urlSortKey, urlOrder)
        return sortOptions.find((o) => o.value === combo) || sortOptions[0]
    }, [sortOptions, urlOrder, urlSortKey])

    const segmentQuickValue = urlQuick || 'all'

    const handleSearch = (e) => {
        e.preventDefault()
        onAppendQueryParams({
            search: searchValue.trim(),
            pageIndex: '1',
        })
    }

    const handleClearSearch = () => {
        setSearchValue('')
        onAppendQueryParams({
            search: '',
            pageIndex: '1',
        })
    }

    const handleStatusChange = (opt) => {
        onAppendQueryParams({
            status: opt?.value ?? '',
            pageIndex: '1',
        })
    }

    const handleSortChange = (opt) => {
        const { sortKey, order } = parseSortCombo(opt?.value)
        onAppendQueryParams({
            sortKey,
            order,
            pageIndex: '1',
        })
    }

    const handleQuickChange = (val) => {
        if (val === 'all') {
            onAppendQueryParams({
                quickFilter: '',
                pageIndex: '1',
            })
            return
        }
        onAppendQueryParams({
            quickFilter: val,
            pageIndex: '1',
        })
    }

    const handleReset = useCallback(() => {
        setSearchValue('')
        onAppendQueryParams({
            search: '',
            status: '',
            quickFilter: '',
            sortKey: DEFAULT_SORT_KEY,
            order: DEFAULT_ORDER,
            pageIndex: '1',
        })
    }, [onAppendQueryParams])

    const hasActiveFilters = useMemo(() => {
        if (urlSearch.trim()) return true
        if (urlStatus) return true
        if (urlQuick) return true
        if (urlSortKey !== DEFAULT_SORT_KEY || urlOrder !== DEFAULT_ORDER) return true
        return false
    }, [urlOrder, urlQuick, urlSearch, urlSortKey, urlStatus])

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <form onSubmit={handleSearch} className="min-w-0 sm:col-span-2 lg:col-span-1">
                        <label className="mb-1.5 block text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('searchPlaceholder')}
                        </label>
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            prefix={<TbSearch />}
                            suffix={
                                searchValue ? (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <TbX />
                                    </button>
                                ) : null
                            }
                        />
                    </form>

                    <div className="min-w-0">
                        <label className="mb-1.5 block text-sm font-bold text-gray-500 dark:text-gray-400">
                            {tt('statusLabel')}
                        </label>
                        <Select
                            value={currentStatus}
                            options={statusOptions}
                            onChange={handleStatusChange}
                            isClearable={false}
                            isSearchable={false}
                            size="sm"
                        />
                    </div>

                    <div className="min-w-0">
                        <label className="mb-1.5 block text-sm font-bold text-gray-500 dark:text-gray-400">
                            {tt('sortLabel')}
                        </label>
                        <Select
                            value={currentSort}
                            options={sortOptions}
                            onChange={handleSortChange}
                            isClearable={false}
                            isSearchable={false}
                            size="sm"
                        />
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {tt('quickLabel')}
                    </div>
                    <Segment
                        value={segmentQuickValue}
                        onChange={handleQuickChange}
                        className="inline-flex w-full min-w-0 max-w-full flex-wrap gap-1 rounded-xl p-1 sm:flex-nowrap sm:overflow-x-auto"
                    >
                        <Segment.Item
                            value="all"
                            className="shrink-0 rounded-lg px-2.5 text-xs font-bold sm:px-3 sm:text-sm"
                        >
                            {tt('quickAll')}
                        </Segment.Item>
                        <Segment.Item
                            value="active30"
                            className="shrink-0 rounded-lg px-2.5 text-xs font-bold sm:px-3 sm:text-sm"
                        >
                            {tt('quickActive30')}
                        </Segment.Item>
                        <Segment.Item
                            value="idle90"
                            className="shrink-0 rounded-lg px-2.5 text-xs font-bold sm:px-3 sm:text-sm"
                        >
                            {tt('quickIdle90')}
                        </Segment.Item>
                        <Segment.Item
                            value="vip"
                            className="shrink-0 rounded-lg px-2.5 text-xs font-bold sm:px-3 sm:text-sm"
                        >
                            {tt('quickVip')}
                        </Segment.Item>
                    </Segment>
                </div>

                <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                    {hasActiveFilters ? (
                        <Button
                            size="sm"
                            variant="plain"
                            type="button"
                            className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 sm:w-auto"
                            onClick={handleReset}
                        >
                            <PiArrowCounterClockwise className="shrink-0 text-base text-gray-500 dark:text-gray-400" />
                            <span className="truncate">{tt('reset')}</span>
                        </Button>
                    ) : null}
                    <div
                        className={
                            hasActiveFilters
                                ? 'min-w-0 w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto'
                                : 'col-span-2 min-w-0 w-full sm:col-span-1 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto'
                        }
                    >
                        <ClientsActionTools />
                    </div>
                </div>
            </div>
        </Card>
    )
}
