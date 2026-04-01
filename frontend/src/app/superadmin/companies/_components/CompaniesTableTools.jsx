'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { TbSearch, TbX } from 'react-icons/tb'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'

const statusOptions = [
    { value: 'all', label: 'Все статусы' },
    { value: 'active', label: 'Активен' },
    { value: 'pending', label: 'Ожидает' },
    { value: 'suspended', label: 'Заблокирован' },
    { value: 'rejected', label: 'Отклонен' },
]

const CompaniesTableTools = () => {
    const searchParams = useSearchParams()
    const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')
    const currentStatus = searchParams.get('status') || 'all'
    const [statusFilter, setStatusFilter] = useState(
        statusOptions.find(opt => opt.value === currentStatus) || statusOptions[0]
    )
    const onAppendQueryParams = useAppendQueryParams()

    // Синхронизируем searchValue с URL при изменении параметров
    useEffect(() => {
        const urlSearch = searchParams.get('search') || ''
        if (urlSearch !== searchValue) {
            setSearchValue(urlSearch)
        }
    }, [searchParams])

    const handleSearch = (e) => {
        e.preventDefault()
        onAppendQueryParams({
            search: searchValue,
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

    const handleStatusChange = (option) => {
        setStatusFilter(option)
        onAppendQueryParams({
            status: option.value === 'all' ? '' : option.value,
            pageIndex: '1',
        })
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearch} className="flex-1">
                <Input
                    placeholder="Поиск по названию, владельцу, email..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    prefix={<TbSearch />}
                    suffix={
                        searchValue && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <TbX />
                            </button>
                        )
                    }
                />
            </form>
            <Select
                size="sm"
                className="w-full sm:w-[200px]"
                options={statusOptions}
                value={statusFilter}
                onChange={handleStatusChange}
            />
        </div>
    )
}

export default CompaniesTableTools

