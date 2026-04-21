'use client'

import { useMemo, useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import EmptyStatePanel from '@/components/shared/EmptyStatePanel'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Dropdown from '@/components/ui/Dropdown'
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams'
import { HiStar, HiPencil, HiDotsVertical } from 'react-icons/hi'
import { PiChatCircleDots } from 'react-icons/pi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateBusinessReviewResponse } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import classNames from '@/utils/classNames'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/utils/dateTime'
import { usePermission } from '@/hooks/usePermission'
import useBusinessStore from '@/store/businessStore'

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
            <span className="ml-1 text-sm font-bold text-gray-900 dark:text-gray-100">{rating}</span>
        </div>
    )
}

const UserColumn = ({ row, t }) => {
    const router = useRouter()
    const hasProfile = row.userId !== null && row.userId !== undefined
    
    const handleNameClick = (e) => {
        if (hasProfile) {
            e.preventDefault()
            router.push(`/business/clients/${row.userId}`)
        }
    }
    
    const nameElement = hasProfile ? (
        <button
            onClick={handleNameClick}
            className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary cursor-pointer transition-colors"
        >
            {row.userName || t('anonymous')}
        </button>
    ) : (
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {row.userName || t('anonymous')}
        </div>
    )
    
    return (
        <div className="flex items-center">
            <Avatar size={40} shape="circle" src={row.userAvatar} />
            <div className="ml-2 rtl:mr-2">
                {nameElement}
                {row.serviceName && (
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.serviceName}</div>
                )}
            </div>
        </div>
    )
}

const CommentColumn = ({ row, t }) => {
    return (
        <div className="max-w-md">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 line-clamp-2">
                {row.comment || ''}
            </p>
            {row.response && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('yourResponse')}: </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{row.response}</span>
                </div>
            )}
        </div>
    )
}

const ActionColumn = ({ row, onResponse, t, canManage }) => {
    if (!canManage) return null
    
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
                    <span>{row.response ? t('editResponse') : t('respond')}</span>
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
    const t = useTranslations('business.reviews.table')
    const tReviews = useTranslations('business.reviews')
    const { settings } = useBusinessStore()
    const businessTz = settings?.timezone || 'America/Los_Angeles'
    const canManageReviews = usePermission('manage_reviews')
    const tModal = useTranslations('business.reviews.responseModal')
    const tNotifications = useTranslations('business.reviews.notifications')
    const tCommon = useTranslations('common.messages')
    const [responseModal, setResponseModal] = useState({ isOpen: false, review: null, response: '' })
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
            })
        })
        
        return reviews
    }, [groupedByAdvertisement, reviewsWithoutAd])

    const updateResponseMutation = useMutation({
        mutationFn: ({ id, response }) => updateBusinessReviewResponse(id, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-reviews'] })
            setResponseModal({ isOpen: false, review: null, response: '' })
            toast.push(
                <Notification type="success" title={tCommon('success')}>
                    {tNotifications('responseUpdated')}
                </Notification>,
                { placement: 'top-end' }
            )
        },
        onError: () => {
            toast.push(
                <Notification type="error" title={tCommon('error')}>
                    {tNotifications('responseError')}
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

    const columns = useMemo(
        () => [
            {
                header: t('user'),
                accessorKey: 'userName',
                cell: (props) => <UserColumn row={props.row.original} t={t} />,
            },
            {
                header: t('advertisement'),
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
                                        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate">
                                            {row.advertisementTitle}
                                        </div>
                                        {adSlug && (
                                            <Link
                                                href={`/marketplace/${adSlug}`}
                                                target="_blank"
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {t('open')}
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('noAd')}</span>
                                )}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: t('rating'),
                accessorKey: 'rating',
                cell: (props) => <RatingColumn row={props.row.original} />,
            },
            {
                header: t('review'),
                accessorKey: 'comment',
                cell: (props) => <CommentColumn row={props.row.original} t={t} />,
            },
            {
                header: t('date'),
                accessorKey: 'createdAt',
                cell: (props) => {
                    const date = props.row.original.createdAt
                        ? new Date(props.row.original.createdAt)
                        : null
                    return (
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {date ? formatDate(date, businessTz, 'short') : '-'}
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
                        t={t}
                        canManage={canManageReviews}
                    />
                ),
            },
        ],
        [t, canManageReviews, businessTz]
    )

    // Мобильная версия - карточки
    const MobileCard = ({ review }) => {
        const router = useRouter()
        const adSlug = review.advertisementLink?.replace('/marketplace/', '').replace(/^\//, '') || ''
        const hasProfile = review.userId !== null && review.userId !== undefined
        
        const handleNameClick = (e) => {
            if (hasProfile) {
                e.preventDefault()
                router.push(`/business/clients/${review.userId}`)
            }
        }
        
        const nameElement = hasProfile ? (
            <button
                onClick={handleNameClick}
                className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary cursor-pointer transition-colors mb-1"
            >
                {review.userName || t('anonymous')}
            </button>
        ) : (
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                {review.userName || t('anonymous')}
            </h4>
        )
        
        return (
            <Card className="mb-4">
                <div className="flex gap-4">
                    <Avatar size={60} shape="circle" src={review.userAvatar} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                {nameElement}
                                {review.serviceName && (
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                        {t('service')}: <span className="text-gray-900 dark:text-gray-100">{review.serviceName}</span>
                                    </p>
                                )}
                                {review.specialistName && (
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                        {t('specialist')}: <span className="text-gray-900 dark:text-gray-100">{review.specialistName}</span>
                                    </p>
                                )}
                            </div>
                            <RatingColumn row={review} />
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
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
                                        {review.advertisementTitle}
                                    </p>
                                    {adSlug && (
                                        <Link
                                            href={`/marketplace/${adSlug}`}
                                            target="_blank"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {t('open')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                            {review.comment || ''}
                        </p>
                        
                        {review.response && (
                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    {t('yourResponse')}:
                                </p>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {review.response}
                                </p>
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                {review.createdAt
                                    ? formatDate(review.createdAt, businessTz, 'short')
                                    : ''}
                            </span>
                            {canManageReviews && (
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<HiPencil />}
                                    onClick={() => handleResponse(review)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        )
    }

    if (allReviews.length === 0) {
        return (
            <EmptyStatePanel
                icon={PiChatCircleDots}
                title={tReviews('emptyTitle')}
                hint={tReviews('emptyHint')}
            />
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
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tModal('title')}</h4>
                    </div>

                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {tModal('reviewFrom')}: <span className="text-gray-900 dark:text-gray-100">{responseModal.review?.userName || t('anonymous')}</span>
                                    {responseModal.review?.userId && (
                                        <span className="ml-2 text-xs font-bold text-gray-900 dark:text-gray-100">
                                            (ID: {responseModal.review.userId})
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                    {responseModal.review?.comment || ''}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                    {tModal('yourResponse')}
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
                                    placeholder={tModal('placeholder')}
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
                            {tModal('cancel')}
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
                            {tModal('save')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </>
    )
}
