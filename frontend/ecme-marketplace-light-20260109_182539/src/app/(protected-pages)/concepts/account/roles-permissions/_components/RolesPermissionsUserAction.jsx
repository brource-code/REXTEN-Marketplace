'use client'
import Badge from '@/components/ui/Badge'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import DebouceInput from '@/components/shared/DebouceInput'
import { useRolePermissionsStore } from '../_store/rolePermissionsStore'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { TbSearch } from 'react-icons/tb'
import { components } from 'react-select'

const { Control } = components

const statusOptions = [
    { label: 'All', value: '', dotBackground: 'bg-gray-200' },
    { label: 'Active', value: 'active', dotBackground: 'bg-success' },
    { label: 'Blocked', value: 'blocked', dotBackground: 'bg-error' },
]

const roleOptions = [
    { label: 'All', value: '' },
    { label: 'Admin', value: 'admin' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Support', value: 'support' },
    { label: 'User', value: 'user' },
    { label: 'Auditor', value: 'auditor' },
    { label: 'Guest', value: 'guest' },
]

const StatusSelectOption = (props) => {
    return (
        <DefaultOption
            {...props}
            customLabel={(data, label) => (
                <span className="flex items-center gap-2">
                    <Badge className={data.dotBackground} />
                    <span>{label}</span>
                </span>
            )}
        />
    )
}

const RoleSelectOption = (props) => {
    return (
        <DefaultOption
            {...props}
            customLabel={(_, label) => <span>{label}</span>}
        />
    )
}

const CustomControl = ({ children, ...props }) => {
    const selected = props.getValue()[0]
    return (
        <Control {...props}>
            {selected && (
                <div className="flex ml-3">
                    <Badge className={selected.dotBackground} />
                </div>
            )}
            {children}
        </Control>
    )
}

const RolesPermissionsUserAction = () => {
    const filterData = useRolePermissionsStore((state) => state.filterData)
    const setFilterData = useRolePermissionsStore(
        (state) => state.setFilterData,
    )

    const { onAppendQueryParams } = useAppendQueryParams()

    const handleStatusChange = (status) => {
        setFilterData({ ...filterData, status })
        onAppendQueryParams({
            status,
        })
    }

    const handleRoleChange = (role) => {
        setFilterData({ ...filterData, role })
        onAppendQueryParams({
            role,
        })
    }

    const handleInputChange = (query) => {
        onAppendQueryParams({
            query,
        })
    }

    return (
        <div className="flex items-center justify-between">
            <DebouceInput
                className="max-w-[300px]"
                placeholder="Search..."
                type="text"
                size="sm"
                prefix={<TbSearch className="text-lg" />}
                onChange={(e) => handleInputChange(e.target.value)}
            />
            <div className="flex items-center gap-2">
                <Select
                    instanceId="status"
                    className="min-w-[150px] w-full"
                    components={{
                        Control: CustomControl,
                        Option: StatusSelectOption,
                    }}
                    options={statusOptions}
                    size="sm"
                    placeholder="Status"
                    defaultValue={{
                        label: 'All',
                        value: '',
                        dotBackground: 'bg-gray-200',
                    }}
                    onChange={(option) =>
                        handleStatusChange(option?.value || '')
                    }
                />
                <Select
                    instanceId="role"
                    className="min-w-[150px] w-full"
                    components={{
                        Option: RoleSelectOption,
                    }}
                    options={roleOptions}
                    size="sm"
                    placeholder="Role"
                    defaultValue={{ label: 'All', value: '' }}
                    value={roleOptions.find(
                        (option) => option.value === filterData.role,
                    )}
                    onChange={(option) => handleRoleChange(option?.value || '')}
                />
            </div>
        </div>
    )
}

export default RolesPermissionsUserAction
