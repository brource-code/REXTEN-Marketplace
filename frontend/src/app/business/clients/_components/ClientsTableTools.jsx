'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { TbSearch, TbX } from 'react-icons/tb'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'

const ClientsTableTools = () => {
    const t = useTranslations('business.clients')
    const [searchValue, setSearchValue] = useState('')
    const { onAppendQueryParams } = useAppendQueryParams()

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

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearch} className="flex-1">
                <Input
                    placeholder={t('searchPlaceholder')}
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
        </div>
    )
}

export default ClientsTableTools

