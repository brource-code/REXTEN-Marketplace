'use client'
import { useMemo, useState } from 'react'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import { TbPencil, TbTrash, TbDotsVertical } from 'react-icons/tb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import CreateCategoryModal from './CreateCategoryModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCategory } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'

const statusColor = {
    active: 'bg-emerald-200 dark:bg-emerald-200 text-gray-900 dark:text-gray-900',
    inactive: 'bg-gray-200 dark:bg-gray-200 text-gray-900 dark:text-gray-900',
}

const ActionColumn = ({ onEdit, onDelete }) => {
    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <TbDotsVertical />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item eventKey="edit" onClick={onEdit}>
                <span className="flex items-center gap-2">
                    <TbPencil className="text-lg" />
                    <span>Редактировать</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" onClick={onDelete}>
                <span className="flex items-center gap-2 text-red-600">
                    <TbTrash className="text-lg" />
                    <span>Удалить</span>
                </span>
            </Dropdown.Item>
        </Dropdown>
    )
}

const CategoriesTable = ({ categoriesList = [], categoriesTotal = 0, pageIndex = 1, pageSize = 10 }) => {
    const queryClient = useQueryClient()
    const { onAppendQueryParams } = useAppendQueryParams()
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState(null)

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries(['categories'])
            toast.push(
                <Notification title="Успешно" type="success">
                    Категория удалена
                </Notification>
            )
            setIsDeleteDialogOpen(false)
            setCategoryToDelete(null)
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 'Не удалось удалить категорию'
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {errorMessage}
                </Notification>
            )
        },
    })

    const handleEdit = (category) => {
        setSelectedCategory(category)
        setIsEditModalOpen(true)
    }

    const handleDelete = (category) => {
        setCategoryToDelete(category)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (categoryToDelete) {
            deleteMutation.mutate(categoryToDelete.id)
        }
    }

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

    const columns = useMemo(
        () => [
            {
                header: 'Название',
                accessorKey: 'name',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {row.name}
                            </div>
                            {row.description && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                    {row.description}
                                </div>
                            )}
                        </div>
                    )
                },
            },
            {
                header: 'Slug',
                accessorKey: 'slug',
                cell: (props) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {props.row.original.slug}
                    </span>
                ),
            },
            {
                header: 'Иконка',
                accessorKey: 'icon',
                cell: (props) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {props.row.original.icon || '-'}
                    </span>
                ),
            },
            {
                header: 'Порядок',
                accessorKey: 'sort_order',
                cell: (props) => (
                    <span className="font-semibold">{props.row.original.sort_order}</span>
                ),
            },
            {
                header: 'Статус',
                accessorKey: 'is_active',
                cell: (props) => {
                    const row = props.row.original
                    const status = row.is_active ? 'active' : 'inactive'
                    return (
                        <Tag className={statusColor[status]}>
                            {status === 'active' ? 'Активна' : 'Неактивна'}
                        </Tag>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        onEdit={() => handleEdit(props.row.original)}
                        onDelete={() => handleDelete(props.row.original)}
                    />
                ),
            },
        ],
        [],
    )

    // Мобильная версия - карточки
    const MobileCard = ({ category }) => (
        <Card className="mb-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {category.name}
                        </h4>
                        {category.description && (
                            <p className="text-xs text-gray-500 mb-2">{category.description}</p>
                        )}
                        <div className="text-xs text-gray-400 font-mono">{category.slug}</div>
                    </div>
                    <Tag className={statusColor[category.is_active ? 'active' : 'inactive']}>
                        {category.is_active ? 'Активна' : 'Неактивна'}
                    </Tag>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                    {category.icon && (
                        <div>
                            <span className="text-gray-400">Иконка: </span>
                            <span>{category.icon}</span>
                        </div>
                    )}
                    <div>
                        <span className="text-gray-400">Порядок: </span>
                        <span className="font-semibold">{category.sort_order}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<TbPencil />}
                        onClick={() => handleEdit(category)}
                        className="flex-1"
                    >
                        Редактировать
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        icon={<TbTrash />}
                        onClick={() => handleDelete(category)}
                        className="flex-1"
                    >
                        Удалить
                    </Button>
                </div>
            </div>
        </Card>
    )

    return (
        <>
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-4">
                {categoriesList.length > 0 ? (
                    categoriesList.map((category) => (
                        <MobileCard key={category.id} category={category} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Нет категорий</p>
                    </div>
                )}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={categoriesList}
                    noData={categoriesList.length === 0}
                    loading={false}
                    pagingData={{
                        total: categoriesTotal,
                        pageIndex,
                        pageSize,
                    }}
                    onPaginationChange={handlePaginationChange}
                    onSelectChange={handleSelectChange}
                />
            </div>

            <CreateCategoryModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setSelectedCategory(null)
                }}
                category={selectedCategory}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title="Удалить категорию?"
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setCategoryToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText="Удалить"
                cancelText="Отмена"
            >
                <p>
                    Вы уверены, что хотите удалить категорию{' '}
                    <strong>"{categoryToDelete?.name}"</strong>?
                </p>
            </ConfirmDialog>
        </>
    )
}

export default CategoriesTable

