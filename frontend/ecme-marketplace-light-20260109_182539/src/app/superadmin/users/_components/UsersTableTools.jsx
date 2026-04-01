'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { TbSearch, TbX } from 'react-icons/tb'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { CLIENT, BUSINESS_OWNER, SUPERADMIN } from '@/constants/roles.constant'

const roleOptions = [
    { value: 'all', label: 'Все роли' },
    { value: CLIENT, label: 'Клиент' },
    { value: BUSINESS_OWNER, label: 'Владелец бизнеса' },
    { value: SUPERADMIN, label: 'Супер-админ' },
]

const UsersTableTools = () => {
    const [searchValue, setSearchValue] = useState('')
    const [roleFilter, setRoleFilter] = useState(roleOptions[0])
    const onAppendQueryParams = useAppendQueryParams()

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

    const handleRoleChange = (option) => {
        setRoleFilter(option)
        onAppendQueryParams({
            role: option.value === 'all' ? '' : option.value,
            pageIndex: '1',
        })
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearch} className="flex-1">
                <Input
                    placeholder="Поиск по имени, email..."
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
                options={roleOptions}
                value={roleFilter}
                onChange={handleRoleChange}
            />
        </div>
    )
}

export default UsersTableTools

