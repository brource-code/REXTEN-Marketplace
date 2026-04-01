'use client'

import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Dropdown from '@/components/ui/Dropdown'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { HiStar, HiPencil, HiDotsVertical } from 'react-icons/hi'
import { PiTrash } from 'react-icons/pi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReviewResponse, deleteReview } from '@/lib/api/superadmin'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Link from 'next/link'
import classNames from '@/utils/classNames'

const RatingColumn = ({ row }) => {
    const rating = row.rating || 0
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <HiStar
                    key={i}
                    className={classNames(
                        'text-sm',
                        i < rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                    )}
                />
            ))}
            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">{rating}</span>
        </div>
    )
}

const UserColumn = ({ row }) => {
    return (
        <div className="flex items-center">
            <Avatar size={40} shape="circle" src={row.userAvatar} />
            <div className="ml-2 rtl:mr-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {row.userName || 'Аноним'}
                </div>
                {row.serviceName && (
                    <div className="text-xs text-gray-500">{row.serviceName}</div>
                )}
            </div>
        </div>
    )
}

const CommentColumn = ({ row }) => {
    return (
        <div className="max-w-md">
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {row.comment || ''}
            </p>
            {row.response && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Ответ: </span>
                    <span className="text-gray-700 dark:text-gray-300">{row.response}</span>
                </div>
            )}
        </div>
    )
}

const ActionColumn = ({ row, onResponse, onDelete }) => {
    return (
        <Dropdown
            renderTitle={
                <div className="text-xl cursor-pointer select-none font-semibold hover:text-primary">
                    <HiDotsVertical />
                </div>
            }
            placement="bottom-end"
        >
            <Dropdown.Item eventKey="response" onClick={() => onResponse(row)}>
                <span className="flex items-center gap-2">
                    <HiPencil className="text-lg" />
                    <span>{row.response ? 'Изменить ответ' : 'Ответить'}</span>
                </span>
            </Dropdown.Item>
            <Dropdown.Item variant="divider" />
            <Dropdown.Item eventKey="delete" onClick={() => onDelete(row)}>
                <span className="flex items-center gap-2 text-red-600">
                    <PiTrash className="text-lg" />
                    <span>Удалить</span>
                </span>
            </Dropdown.Item>
        </Dropdown>
    )
}

export default function ReviewsTable({ 
    groupedByAdvertisement = [], 
    reviewsWithoutAd = [],
    pageIndex = 1,
    pageSize = 10,
    total = 0,
}) {
    const [responseModal, setResponseModal] = useState({ isOpen: false, review: null, response: '' })
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null })
    const queryClient = useQueryClient()
    const { onAppendQueryParams } = useAppendQueryParams()

    // Преобразуем данные в плоский список для таблицы
    const allReviews = useMemo(() => {
        const reviews = []
        
        // Добавляем отзывы по объявлениям
        groupedByAdvertisement.forEach((group) => {
            group.reviews?.forEach((review) => {
                reviews.push({
                    ...review,
                    advertisementTitle: group.advertisement.title,
                    advertisementLink: group.advertisement.link,
                    advertisementImage: group.advertisement.image,
                    companyName: group.advertisement.company?.name,
                })
            })
        })
        
        // Добавляем отзывы без объявления
        reviewsWithoutAd.forEach((review) => {
            reviews.push({
                ...review,
                advertisementTitle: null,
                advertisementLink: null,
                advertisementImage: null,
                companyName: null,
            })
        })
        
        return reviews
    }, [groupedByAdvertisement, reviewsWithoutAd])

    const updateResponseMutation = useMutation({
        mutationFn: ({ id, response }) => updateReviewResponse(id, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
            setResponseModal({ isOpen: false, review: null, response: '' })
            toast.push(
                <Notification type="success" title="Успешно">
                    Ответ на отзыв обновлен
                </Notification>,
                { placement: 'top-end' }
            )
        },
        onError: () => {
            toast.push(
                <Notification type="error" title="Ошибка">
                    Не удалось обновить ответ
                </Notification>,
                { placement: 'top-end' }
            )
        },
    })

    const deleteReviewMutation = useMutation({
        mutationFn: (id) => deleteReview(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
            setConfirmDialog({ ...confirmDialog, isOpen: false })
            toast.push(
                <Notification type="success" title="Успешно">
                    Отзыв удален
                </Notification>,
                { placement: 'top-end' }
            )
        },
        onError: () => {
            toast.push(
                <Notification type="error" title="Ошибка">
                    Не удалось удалить отзыв
                </Notification>,
                { placement: 'top-end' }
            )
        },
    })

    const handleResponse = (review) => {
        setResponseModal({
            isOpen: true,
            review,
            response: review.response || '',
        })
    }

    const handleDelete = (review) => {
        setConfirmDialog({
            isOpen: true,
            type: 'danger',
            title: 'Удалить отзыв?',
            message: 'Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.',
            onConfirm: () => deleteReviewMutation.mutate(review.id),
        })
    }

    const columns = useMemo(
        () => [
            {
                header: 'Пользователь',
                accessorKey: 'userName',
                cell: (props) => <UserColumn row={props.row.original} />,
            },
            {
                header: 'Объявление',
                accessorKey: 'advertisementTitle',
                cell: (props) => {
                    const row = props.row.original
                    const adSlug = row.advertisementLink?.replace('/marketplace/', '').replace(/^\//, '') || ''
                    return (
                        <div className="flex items-center gap-3">
                            {row.advertisementImage && (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={row.advertisementImage}
                                        alt={row.advertisementTitle || ''}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                {row.advertisementTitle ? (
                                    <>
                                        <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                            {row.advertisementTitle}
                                        </div>
                                        {row.companyName && (
                                            <div className="text-xs text-gray-500">
                                                {row.companyName}
                                            </div>
                                        )}
                                        {adSlug && (
                                            <Link
                                                href={`/marketplace/${adSlug}`}
                                                target="_blank"
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                Открыть
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-500">Без объявления</span>
                                )}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: 'Рейтинг',
                accessorKey: 'rating',
                cell: (props) => <RatingColumn row={props.row.original} />,
            },
            {
                header: 'Отзыв',
                accessorKey: 'comment',
                cell: (props) => <CommentColumn row={props.row.original} />,
            },
            {
                header: 'Дата',
                accessorKey: 'createdAt',
                cell: (props) => {
                    const date = props.row.original.createdAt
                        ? new Date(props.row.original.createdAt)
                        : null
                    return (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {date ? date.toLocaleDateString('ru-RU') : '-'}
                        </span>
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => (
                    <ActionColumn
                        row={props.row.original}
                        onResponse={handleResponse}
                        onDelete={handleDelete}
                    />
                ),
            },
        ],
        []
    )

    // Мобильная версия - карточки
    const MobileCard = ({ review }) => {
        const adSlug = review.advertisementLink?.replace('/marketplace/', '').replace(/^\//, '') || ''
        
        return (
            <Card className="mb-4">
                <div className="flex gap-4">
                    <Avatar size={60} shape="circle" src={review.userAvatar} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {review.userName || 'Аноним'}
                                </h4>
                                {review.serviceName && (
                                    <p className="text-xs text-gray-500 mb-1">
                                        Услуга: {review.serviceName}
                                    </p>
                                )}
                                {review.specialistName && (
                                    <p className="text-xs text-gray-500 mb-1">
                                        Исполнитель: {review.specialistName}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <HiStar
                                        key={i}
                                        className={classNames(
                                            'text-sm',
                                            i < (review.rating || 0)
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-gray-300 dark:text-gray-600'
                                        )}
                                    />
                                ))}
                                <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">{review.rating || 0}</span>
                            </div>
                        </div>
                        
                        {review.advertisementTitle && (
                            <div className="flex items-center gap-2 mb-2">
                                {review.advertisementImage && (
                                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                                        <img
                                            src={review.advertisementImage}
                                            alt={review.advertisementTitle}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                        {review.advertisementTitle}
                                    </p>
                                    {review.companyName && (
                                        <p className="text-xs text-gray-500">{review.companyName}</p>
                                    )}
                                    {adSlug && (
                                        <Link
                                            href={`/marketplace/${adSlug}`}
                                            target="_blank"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Открыть
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {review.comment || ''}
                        </p>
                        
                        {review.response && (
                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-2">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    Ответ:
                                </p>
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                    {review.response}
                                </p>
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                                {review.createdAt
                                    ? new Date(review.createdAt).toLocaleDateString('ru-RU')
                                    : ''}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<HiPencil />}
                                    onClick={() => handleResponse(review)}
                                />
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<PiTrash />}
                                    className="text-red-600"
                                    onClick={() => handleDelete(review)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    if (allReviews.length === 0) {
        return (
            <Card className="p-8 text-center">
                <p className="text-gray-500">Нет отзывов</p>
            </Card>
        )
    }

    return (
        <>
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-4">
                {allReviews.map((review) => (
                    <MobileCard key={review.id} review={review} />
                ))}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="hidden md:block">
                <DataTable
                    columns={columns}
                    data={allReviews}
                    noData={allReviews.length === 0}
                    skeletonAvatarColumns={[0]}
                    skeletonAvatarProps={{ width: 40, height: 40 }}
                    loading={false}
                    pagingData={{
                        pageIndex,
                        pageSize,
                        total,
                    }}
                    onPaginationChange={(page) => {
                        onAppendQueryParams({
                            pageIndex: String(page),
                        })
                    }}
                    onSelectChange={(value) => {
                        onAppendQueryParams({
                            pageSize: String(value),
                            pageIndex: '1',
                        })
                    }}
                />
            </div>

            {/* Модалка ответа на отзыв */}
            <Dialog
                isOpen={responseModal.isOpen}
                onClose={() => setResponseModal({ isOpen: false, review: null, response: '' })}
                width={600}
            >
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок - снаружи скролла */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-lg">Ответ на отзыв</h4>
                    </div>

                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Отзыв от: {responseModal.review?.userName || 'Аноним'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                    {responseModal.review?.comment || ''}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                                    Ваш ответ
                                </label>
                                <textarea
                                    value={responseModal.response}
                                    onChange={(e) =>
                                        setResponseModal((prev) => ({
                                            ...prev,
                                            response: e.target.value,
                                        }))
                                    }
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                    placeholder="Введите ответ на отзыв..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Кнопки - снаружи скролла */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setResponseModal({ isOpen: false, review: null, response: '' })
                            }
                        >
                            Отмена
                        </Button>
                        <Button
                            variant="solid"
                            onClick={() => {
                                if (responseModal.review) {
                                    updateResponseMutation.mutate({
                                        id: responseModal.review.id,
                                        response: responseModal.response,
                                    })
                                }
                            }}
                            loading={updateResponseMutation.isPending}
                            disabled={!responseModal.review}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Диалог подтверждения */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                type={confirmDialog.type}
                title={confirmDialog.title}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                confirmText="Удалить"
                cancelText="Отмена"
            >
                <p>{confirmDialog.message}</p>
            </ConfirmDialog>
        </>
    )
}
