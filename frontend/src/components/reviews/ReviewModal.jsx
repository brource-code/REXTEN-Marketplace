'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { PiStarFill, PiStar } from 'react-icons/pi'
import { NumericFormat } from 'react-number-format'
import classNames from '@/utils/classNames'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/utils/dateTime'
import { resolveClientBookingTimezone } from '@/constants/client-datetime.constant'

const ReviewModal = ({ isOpen, onClose, order, onSubmit, isLoading }) => {
    const t = useTranslations('components.reviewModal')
    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [comment, setComment] = useState('')
    const [errors, setErrors] = useState({})
    const bookingTz = order ? resolveClientBookingTimezone(order) : 'America/Los_Angeles'

    if (!isOpen || !order) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        
        // Валидация
        const newErrors = {}
        if (rating === 0) {
            newErrors.rating = t('errors.ratingRequired')
        }
        if (!comment.trim() || comment.trim().length < 10) {
            newErrors.comment = t('errors.commentMinLength')
        }
        if (comment.trim().length > 1000) {
            newErrors.comment = t('errors.commentMaxLength')
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setErrors({})
        // Формируем данные для отправки - убираем null значения
        const reviewData = {
            rating,
            comment: comment.trim(),
        }
        
        // Добавляем только существующие ID (не null и не undefined)
        if (order.orderId != null) {
            reviewData.orderId = order.orderId
        }
        if (order.bookingId != null) {
            reviewData.bookingId = order.bookingId
        }
        
        // Проверяем, что хотя бы один ID есть
        if (!reviewData.orderId && !reviewData.bookingId) {
            setErrors({ 
                general: t('errors.orderNotFound')
            })
            return
        }
        
        onSubmit(reviewData)
    }

    const handleClose = () => {
        setRating(0)
        setComment('')
        setErrors({})
        setHoveredRating(0)
        onClose()
    }

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={handleClose}
            width={600}
            contentClassName="p-0"
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - зафиксирован сверху */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h3>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Информация о заказе */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
                                {order.serviceName}
                            </h4>
                            <Link
                                href={`/marketplace/${order.businessSlug}`}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {order.businessName}
                            </Link>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{formatDate(order.date, bookingTz, 'short')}</span>
                                <span>•</span>
                                <span>{order.time}</span>
                                <span>•</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    <NumericFormat
                                        displayType="text"
                                        value={order.price}
                                        prefix="$"
                                        thousandSeparator={true}
                                    />
                                </span>
                            </div>
                        </div>

                        {/* Рейтинг */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {t('rating')} <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        {(hoveredRating >= star || rating >= star) ? (
                                            <PiStarFill className="text-3xl text-yellow-400" />
                                        ) : (
                                            <PiStar className="text-3xl text-gray-300 dark:text-gray-600" />
                                        )}
                                    </button>
                                ))}
                                {rating > 0 && (
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                        {rating} из 5
                                    </span>
                                )}
                            </div>
                            {errors.rating && (
                                <p className="mt-1 text-xs text-red-500">{errors.rating}</p>
                            )}
                        </div>

                        {/* Комментарий */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                {t('comment')} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={5}
                                className={classNames(
                                    'w-full px-3 py-2 border rounded-lg',
                                    'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                    'bg-white dark:bg-gray-800',
                                    'border-gray-300 dark:border-gray-600',
                                    'text-gray-900 dark:text-white',
                                    errors.comment && 'border-red-500'
                                )}
                                placeholder={t('commentPlaceholder')}
                            />
                            <div className="flex items-center justify-between mt-1">
                                {errors.comment ? (
                                    <p className="text-xs text-red-500">{errors.comment}</p>
                                ) : (
                                    <p className="text-xs text-gray-500">
                                        {t('commentMinHint')}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500">
                                    {comment.length}/1000
                                </p>
                            </div>
                        </div>

                </form>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="solid"
                        disabled={isLoading || rating === 0 || !comment.trim()}
                        loading={isLoading}
                        onClick={handleSubmit}
                    >
                        {t('submit')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default ReviewModal

