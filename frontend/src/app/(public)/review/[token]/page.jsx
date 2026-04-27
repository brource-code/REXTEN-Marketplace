'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { TbStar } from 'react-icons/tb'
import { getLaravelApiUrl } from '@/utils/api/getLaravelApiUrl'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Container from '@/components/shared/Container'
import { formatDate, formatTime } from '@/utils/dateTime'
import {
    CLIENT_TIME_DISPLAY_LOCALE,
    resolveClientBookingTimezone,
} from '@/constants/client-datetime.constant'
import { normalizeImageUrl } from '@/utils/imageUtils'

function getInitials(name) {
    const s = (name || '').trim()
    if (!s) return '?'
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return s.slice(0, 2).toUpperCase()
}

export default function ReviewByTokenPage() {
    const t = useTranslations('public.review')
    const params = useParams()
    // Получаем токен из params или из URL напрямую (fallback)
    const token = useMemo(() => {
        if (params?.token) return params.token
        if (typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/review/')
            if (pathParts.length > 1) {
                return pathParts[1].split('?')[0] // Убираем query параметры если есть
            }
        }
        return null
    }, [params?.token])
    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [clientName, setClientName] = useState('')
    const [clientAvatarImageError, setClientAvatarImageError] = useState(false)

    useEffect(() => {
        if (token) {
            loadBooking()
        } else {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        setClientAvatarImageError(false)
    }, [booking?.clientAvatar])

    const loadBooking = async () => {
        if (!token) {
            setLoading(false)
            return
        }

        try {
            const apiUrl = getLaravelApiUrl()
            const url = `${apiUrl}/public/reviews/token/${token}`

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })
            
            const data = await response.json()

            if (response.ok && data.success && data.booking) {
                setBooking(data.booking)
                setClientName(data.booking.clientName || '')
            } else {
                const errorMessage = data.message || t('notifications.invalidLink')
                toast.push(
                    <Notification title={t('notifications.error')} type="danger">
                        {errorMessage}
                    </Notification>,
                )
            }
        } catch (error) {
            toast.push(
                <Notification title={t('notifications.error')} type="danger">
                    {t('notifications.loadError')}
                </Notification>,
            )
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (rating === 0) {
            toast.push(
                <Notification title={t('notifications.error')} type="warning">
                    {t('notifications.ratingRequired')}
                </Notification>,
            )
            return
        }

        if (comment.length < 10) {
            toast.push(
                <Notification title={t('notifications.error')} type="warning">
                    {t('notifications.commentMinLength')}
                </Notification>,
            )
            return
        }

        setSubmitting(true)
        try {
            const apiUrl = getLaravelApiUrl()
            const response = await fetch(`${apiUrl}/public/reviews/token/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating,
                    comment,
                    clientName: clientName || undefined,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                toast.push(
                    <Notification title={t('notifications.success')} type="success">
                        {t('notifications.thankYou')}
                    </Notification>,
                )
                setBooking({ ...booking, hasReview: true })
            } else {
                toast.push(
                    <Notification title={t('notifications.error')} type="danger">
                        {data.message || t('notifications.createError')}
                    </Notification>,
                )
            }
        } catch (error) {
            toast.push(
                <Notification title={t('notifications.error')} type="danger">
                    {t('notifications.submitError')}
                </Notification>,
            )
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div
                data-public-fullscreen
                className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-white dark:bg-gray-900"
            >
                <Container className="max-w-2xl">
                    <Card>
                        <div className="text-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</p>
                        </div>
                    </Card>
                </Container>
            </div>
        )
    }

    if (!booking) {
        return (
            <div
                data-public-fullscreen
                className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-white dark:bg-gray-900"
            >
                <Container className="max-w-2xl">
                    <Card>
                        <div className="text-center p-4">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('invalidLink.title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('invalidLink.description')}</p>
                        </div>
                    </Card>
                </Container>
            </div>
        )
    }

    if (booking.hasReview) {
        return (
            <div
                data-public-fullscreen
                className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-white dark:bg-gray-900"
            >
                <Container className="max-w-2xl">
                    <Card>
                        <div className="text-center p-4">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('alreadySubmitted.title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('alreadySubmitted.description')}</p>
                        </div>
                    </Card>
                </Container>
            </div>
        )
    }

    const displayNameForAvatar = clientName || booking.clientName || ''
    const initialsForAvatar = getInitials(displayNameForAvatar)
    const clientAvatarDisplayUrl =
        booking.clientAvatar && !clientAvatarImageError
            ? normalizeImageUrl(booking.clientAvatar)
            : null

    return (
        <div
            data-public-fullscreen
            className="min-h-screen min-h-[100dvh] bg-white dark:bg-gray-900 py-12 px-4"
        >
            <Container className="max-w-2xl">
                <Card>
                    <div className="p-4">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('title')}</h4>
                        
                        {/* Информация о бронировании */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('bookingInfo.title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('bookingInfo.service')}</span> {booking.serviceName}
                            </p>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('bookingInfo.business')}</span> {booking.businessName}
                            </p>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('bookingInfo.date')}</span>{' '}
                                {formatDate(booking.date, resolveClientBookingTimezone(booking), 'short')}{' '}
                                {t('bookingInfo.at')}{' '}
                                {formatTime(
                                    booking.time,
                                    resolveClientBookingTimezone(booking),
                                    CLIENT_TIME_DISPLAY_LOCALE,
                                )}
                            </p>
                        </div>

                        {/* Форма отзыва */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Рейтинг */}
                            <FormItem label={t('form.rating')}>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`text-3xl transition-colors ${
                                                star <= rating
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300 hover:text-yellow-300'
                                            }`}
                                        >
                                            <TbStar />
                                        </button>
                                    ))}
                                </div>
                            </FormItem>

                            {/* Имя клиента (опционально) + аватар из профиля, если у брони есть user с фото */}
                            <FormItem label={t('form.clientName')}>
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        {clientAvatarDisplayUrl ? (
                                            <img
                                                src={clientAvatarDisplayUrl}
                                                alt={t('form.clientAvatarAlt')}
                                                className="w-full h-full object-cover"
                                                onError={() => setClientAvatarImageError(true)}
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {initialsForAvatar}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Input
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            placeholder={t('form.clientNamePlaceholder')}
                                        />
                                    </div>
                                </div>
                            </FormItem>

                            {/* Комментарий */}
                            <FormItem label={t('form.comment')} required>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    rows={5}
                                    placeholder={t('form.commentPlaceholder')}
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                />
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {t('form.commentHint')} {1000 - comment.length}
                                </p>
                            </FormItem>

                            <Button
                                type="submit"
                                variant="solid"
                                loading={submitting}
                                disabled={rating === 0 || comment.length < 10}
                                block
                            >
                                {t('form.submit')}
                            </Button>
                        </form>
                    </div>
                </Card>
            </Container>
        </div>
    )
}

