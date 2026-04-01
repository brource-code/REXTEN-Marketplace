'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { TbStar } from 'react-icons/tb'
import { getLaravelApiUrl } from '@/lib/api/marketplace'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Container from '@/components/shared/Container'

export default function ReviewByTokenPage() {
    const params = useParams()
    const token = params.token
    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [clientName, setClientName] = useState('')

    useEffect(() => {
        if (token) {
            loadBooking()
        }
    }, [token])

    const loadBooking = async () => {
        try {
            const apiUrl = getLaravelApiUrl()
            const response = await fetch(`${apiUrl}/public/reviews/token/${token}`)
            const data = await response.json()
            
            if (response.ok) {
                setBooking(data.booking)
                setClientName(data.booking.clientName || '')
            } else {
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        {data.message || 'Ссылка на отзыв недействительна'}
                    </Notification>,
                )
            }
        } catch (error) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось загрузить информацию о бронировании
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
                <Notification title="Ошибка" type="warning">
                    Пожалуйста, выберите рейтинг
                </Notification>,
            )
            return
        }

        if (comment.length < 10) {
            toast.push(
                <Notification title="Ошибка" type="warning">
                    Комментарий должен содержать минимум 10 символов
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
                    <Notification title="Успешно" type="success">
                        Спасибо за ваш отзыв!
                    </Notification>,
                )
                setBooking({ ...booking, hasReview: true })
            } else {
                toast.push(
                    <Notification title="Ошибка" type="danger">
                        {data.message || 'Не удалось создать отзыв'}
                    </Notification>,
                )
            }
        } catch (error) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось отправить отзыв
                </Notification>,
            )
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Container className="max-w-2xl">
                    <Card>
                        <div className="text-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
                        </div>
                    </Card>
                </Container>
            </div>
        )
    }

    if (!booking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Container className="max-w-2xl">
                    <Card>
                        <div className="text-center p-6">
                            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Ссылка недействительна</h2>
                            <p className="text-gray-600 dark:text-gray-400">Ссылка на отзыв недействительна или истекла.</p>
                        </div>
                    </Card>
                </Container>
            </div>
        )
    }

    if (booking.hasReview) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Container className="max-w-2xl">
                    <Card>
                        <div className="text-center p-6">
                            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Отзыв уже оставлен</h2>
                            <p className="text-gray-600 dark:text-gray-400">Спасибо! Вы уже оставили отзыв на это бронирование.</p>
                        </div>
                    </Card>
                </Container>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <Container className="max-w-2xl">
                <Card>
                    <div className="p-6">
                        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Оставить отзыв</h1>
                        
                        {/* Информация о бронировании */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Информация о бронировании</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>Услуга:</strong> {booking.serviceName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>Бизнес:</strong> {booking.businessName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>Дата:</strong> {new Date(booking.date).toLocaleDateString('ru-RU')} в {booking.time}
                            </p>
                        </div>

                        {/* Форма отзыва */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Рейтинг */}
                            <FormItem label="Оценка">
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

                            {/* Имя клиента (опционально) */}
                            <FormItem label="Ваше имя (опционально)">
                                <Input
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Как к вам обращаться?"
                                />
                            </FormItem>

                            {/* Комментарий */}
                            <FormItem label="Ваш отзыв" required>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    rows={5}
                                    placeholder="Расскажите о вашем опыте..."
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Минимум 10 символов. Осталось: {1000 - comment.length}
                                </p>
                            </FormItem>

                            <Button
                                type="submit"
                                variant="solid"
                                loading={submitting}
                                disabled={rating === 0 || comment.length < 10}
                                block
                            >
                                Отправить отзыв
                            </Button>
                        </form>
                    </div>
                </Card>
            </Container>
        </div>
    )
}

