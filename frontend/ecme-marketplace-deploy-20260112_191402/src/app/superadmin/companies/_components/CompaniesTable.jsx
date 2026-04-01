'use client'
import { useMemo, useState } from 'react'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { TbPencil, TbEye, TbCheck, TbX, TbBan, TbChartBar, TbDotsVertical } from 'react-icons/tb'
import { NumericFormat } from 'react-number-format'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import CompanyStatsModal from './CompanyStatsModal'
import CreateCompanyModal from './CreateCompanyModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveCompany, rejectCompany, blockCompany } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    pending: 'bg-amber-200 dark:bg-amber-200 text-gray-900 dark:text-gray-900',
    suspended: 'bg-red-200 dark:bg-red-200 text-gray-900 dark:text-gray-900',
    rejected: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
}

const subscriptionColor = {
    basic: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
    premium: 'bg-blue-200 dark:bg-blue-200 text-gray-900 dark:text-gray-900',
    enterprise: 'bg-purple-200 dark:bg-purple-200 text-gray-900 dark:text-gray-900',
}

const ActionColumn = ({ onEdit, onView, onApprove, onReject, onBlock, onStats, status }) => {
    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <TbDotsVertical />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item eventKey="stats" onClick={onStats}>
                <span className="flex items-center gap-2">
                    <TbChartBar className="text-lg" />
                    <span>Статистика</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item eventKey="view" onClick={onView}>
                <span className="flex items-center gap-2">
                    <TbEye className="text-lg" />
                    <span>Просмотр</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item eventKey="edit" onClick={onEdit}>
                <span className="flex items-center gap-2">
                    <TbPencil className="text-lg" />
                    <span>Редактировать</span>
                </span>
            </Dropdown.Item>
            {status === 'pending' && (
                <>
                    <Dropdown.Item variant="divider" />
                    <Dropdown.Item eventKey="approve" onClick={onApprove}>
                        <span className="flex items-center gap-2 text-emerald-600">
                            <TbCheck className="text-lg" />
                            <span>Одобрить</span>
                        </span>
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="reject" onClick={onReject}>
                        <span className="flex items-center gap-2 text-red-600">
                            <TbX className="text-lg" />
                            <span>Отклонить</span>
                        </span>
                    </Dropdown.Item>
                </>
            )}
            {status === 'active' && (
                <>
                    <Dropdown.Item variant="divider" />
                    <Dropdown.Item eventKey="block" onClick={onBlock}>
                        <span className="flex items-center gap-2 text-red-600">
                            <TbBan className="text-lg" />
                            <span>Заблокировать</span>
                        </span>
                    </Dropdown.Item>
                </>
            )}
        </Dropdown>
    )
}

const CompaniesTable = ({
    companiesList = [],
    companiesTotal = 0,
    pageIndex = 1,
    pageSize = 10,
}) => {
    const queryClient = useQueryClient()
    const onAppendQueryParams = useAppendQueryParams()
    const [selectedCompany, setSelectedCompany] = useState(null)
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: null,
    })

    const approveMutation = useMutation({
        mutationFn: approveCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Компания одобрена
                </Notification>
            )
            setConfirmDialog({ ...confirmDialog, isOpen: false })
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось одобрить компанию'}
                </Notification>
            )
        },
    })

    const rejectMutation = useMutation({
        mutationFn: rejectCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Компания отклонена
                </Notification>
            )
            setConfirmDialog({ ...confirmDialog, isOpen: false })
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось отклонить компанию'}
                </Notification>
            )
        },
    })

    const blockMutation = useMutation({
        mutationFn: blockCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Компания заблокирована
                </Notification>
            )
            setConfirmDialog({ ...confirmDialog, isOpen: false })
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error.response?.data?.message || 'Не удалось заблокировать компанию'}
                </Notification>
            )
        },
    })

    const handleEdit = (company) => {
        setSelectedCompany(company)
        setIsEditModalOpen(true)
    }

    const handleView = (company) => {
        // Открываем модалку редактирования в режиме просмотра (read-only)
        setSelectedCompany(company)
        setIsEditModalOpen(true)
    }

    const handleStats = (company) => {
        setSelectedCompany(company)
        setIsStatsModalOpen(true)
    }

    const handleApprove = (company) => {
        setConfirmDialog({
            isOpen: true,
            type: 'success',
            title: 'Одобрить компанию?',
            message: `Вы уверены, что хотите одобрить компанию "${company.name}"?`,
            onConfirm: () => approveMutation.mutate(company.id),
        })
    }

    const handleReject = (company) => {
        setConfirmDialog({
            isOpen: true,
            type: 'warning',
            title: 'Отклонить компанию?',
            message: `Вы уверены, что хотите отклонить компанию "${company.name}"?`,
            onConfirm: () => rejectMutation.mutate(company.id),
        })
    }

    const handleBlock = (company) => {
        setConfirmDialog({
            isOpen: true,
            type: 'danger',
            title: 'Заблокировать компанию?',
            message: `Вы уверены, что хотите заблокировать компанию "${company.name}"?`,
            onConfirm: () => blockMutation.mutate(company.id),
        })
    }

    const columns = useMemo(
        () => [
            {
                header: 'Название',
                accessorKey: 'name',
                cell: (props) => {
                    return (
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {props.row.original.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {props.row.original.category}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: 'Владелец',
                accessorKey: 'owner',
            },
            {
                header: 'Контакты',
                accessorKey: 'email',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="text-sm">{row.email}</div>
                            <div className="text-xs text-gray-500">{row.phone}</div>
                        </div>
                    )
                },
            },
            {
                header: 'Статус',
                accessorKey: 'status',
                cell: (props) => {
                    const row = props.row.original
                    const statusLabels = {
                        active: 'Активен',
                        pending: 'Ожидает',
                        suspended: 'Заблокирован',
                        rejected: 'Отклонен',
                    }
                    return (
                        <Tag className={statusColor[row.status] || statusColor.pending}>
                            <span>{statusLabels[row.status] || row.status}</span>
                        </Tag>
                    )
                },
            },
            {
                header: 'Подписка',
                accessorKey: 'subscription',
                cell: (props) => {
                    const row = props.row.original
                    const subscriptionLabels = {
                        basic: 'Базовый',
                        premium: 'Премиум',
                        enterprise: 'Корпоративный',
                    }
                    return (
                        <Tag
                            className={
                                subscriptionColor[row.subscription] ||
                                subscriptionColor.basic
                            }
                        >
                            <span>
                                {subscriptionLabels[row.subscription] ||
                                    row.subscription}
                            </span>
                        </Tag>
                    )
                },
            },
            {
                header: 'Выручка',
                accessorKey: 'revenue',
                cell: (props) => {
                    return (
                        <NumericFormat
                            className="font-semibold"
                            displayType="text"
                            value={props.row.original.revenue}
                            prefix={'₽'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
            {
                header: 'Бронирований',
                accessorKey: 'bookings',
                cell: (props) => {
                    return (
                        <span className="font-semibold">
                            {props.row.original.bookings}
                        </span>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => handleEdit(props.row.original)}
                        onView={() => handleView(props.row.original)}
                        onApprove={() => handleApprove(props.row.original)}
                        onReject={() => handleReject(props.row.original)}
                        onBlock={() => handleBlock(props.row.original)}
                        onStats={() => handleStats(props.row.original)}
                        status={props.row.original.status}
                    />
                ),
            },
        ],
        [],
    )

    const handlePaginationChange = (page) => {
        onAppendQueryParams({
            pageIndex: String(page),
        })
    }

    const handleSelectChange = (value) => {
        onAppendQueryParams({
            pageSize: String(value),
            pageIndex: '1',
        })
    }

    const handleSort = (sort) => {
        onAppendQueryParams({
            order: sort.order,
            sortKey: sort.key,
        })
    }

    const statusLabels = {
        active: 'Активен',
        pending: 'Ожидает',
        suspended: 'Заблокирован',
        rejected: 'Отклонен',
    }

    const subscriptionLabels = {
        basic: 'Базовый',
        premium: 'Премиум',
        enterprise: 'Корпоративный',
    }

    // Мобильная версия - карточки
    const MobileCard = ({ company }) => (
        <Card className="mb-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {company.name}
                        </h4>
                        {company.category && (
                            <p className="text-xs text-gray-500 mb-2">{company.category}</p>
                        )}
                    </div>
                    <Tag className={statusColor[company.status] || statusColor.pending}>
                        {statusLabels[company.status] || company.status}
                    </Tag>
                </div>

                <div className="space-y-2 text-sm">
                    <div>
                        <span className="text-gray-500">Владелец: </span>
                        <span className="font-medium">{company.owner}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Email: </span>
                        <span className="font-medium">{company.email}</span>
                    </div>
                    {company.phone && (
                        <div>
                            <span className="text-gray-500">Телефон: </span>
                            <span className="font-medium">{company.phone}</span>
                        </div>
                    )}
                    <div>
                        <span className="text-gray-500">Подписка: </span>
                        <Tag
                            className={
                                subscriptionColor[company.subscription] ||
                                subscriptionColor.basic
                            }
                        >
                            {subscriptionLabels[company.subscription] || company.subscription}
                        </Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="text-xs text-gray-500">Выручка</span>
                            <div className="font-semibold">
                                <NumericFormat
                                    displayType="text"
                                    value={company.revenue || 0}
                                    prefix={'₽'}
                                    thousandSeparator={true}
                                />
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Бронирований</span>
                            <div className="font-semibold">{company.bookings || 0}</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<TbChartBar />}
                        onClick={() => handleStats(company)}
                        className="flex-1"
                    >
                        Статистика
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<TbEye />}
                        onClick={() => handleView(company)}
                        className="flex-1"
                    >
                        Просмотр
                    </Button>
                    {company.status === 'pending' && (
                        <>
                            <Button
                                variant="solid"
                                size="sm"
                                icon={<TbCheck />}
                                onClick={() => handleApprove(company)}
                                className="flex-1"
                            >
                                Одобрить
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                icon={<TbX />}
                                onClick={() => handleReject(company)}
                                className="flex-1"
                            >
                                Отклонить
                            </Button>
                        </>
                    )}
                    {company.status === 'active' && (
                        <Button
                            variant="default"
                            size="sm"
                            icon={<TbBan />}
                            onClick={() => handleBlock(company)}
                            className="flex-1"
                        >
                            Заблокировать
                        </Button>
                    )}
                    <Button
                        variant="plain"
                        size="sm"
                        icon={<TbPencil />}
                        onClick={() => handleEdit(company)}
                    />
                </div>
            </div>
        </Card>
    )

    return (
        <>
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-4">
                {companiesList.length > 0 ? (
                    companiesList.map((company) => (
                        <MobileCard key={company.id} company={company} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Нет компаний</p>
                    </div>
                )}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={companiesList}
                    noData={companiesList.length === 0}
                    loading={false}
                    pagingData={{
                        total: companiesTotal,
                        pageIndex,
                        pageSize,
                    }}
                    onPaginationChange={handlePaginationChange}
                    onSelectChange={handleSelectChange}
                    onSort={handleSort}
                />
            </div>

            <CompanyStatsModal
                isOpen={isStatsModalOpen}
                onClose={() => {
                    setIsStatsModalOpen(false)
                    setSelectedCompany(null)
                }}
                company={selectedCompany}
            />
            <CreateCompanyModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setSelectedCompany(null)
                }}
                company={selectedCompany}
            />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                type={confirmDialog.type}
                title={confirmDialog.title}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                confirmText="Подтвердить"
                cancelText="Отмена"
            >
                <p>{confirmDialog.message}</p>
            </ConfirmDialog>
        </>
    )
}

export default CompaniesTable

