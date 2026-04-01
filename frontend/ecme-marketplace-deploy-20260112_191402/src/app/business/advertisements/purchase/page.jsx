'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getBusinessAdvertisements, updateBusinessAdvertisement } from '@/lib/api/business'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Loading from '@/components/shared/Loading'
import { 
    PiArrowLeft, 
    PiCheck, 
    PiMegaphone,
    PiImage
} from 'react-icons/pi'
import Link from 'next/link'
import { normalizeImageUrl, FALLBACK_IMAGE } from '@/utils/imageUtils'

const statusLabels = {
    pending: 'На модерации',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    active: 'Активно',
    inactive: 'Неактивно',
}

const getStatusBadgeClass = (status) => {
    const baseClasses = 'text-xs font-medium px-2.5 py-1 rounded-full'
    switch (status) {
        case 'approved':
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`
        case 'pending':
            return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`
        case 'rejected':
            return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`
        case 'active':
            return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`
        case 'inactive':
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
        default:
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300`
    }
}

const ADVERTISING_PACKAGES = [
    {
        id: 'basic',
        name: 'Базовый',
        duration: 7,
        price: 49,
        features: [
            '7 дней размещения',
            'Ротация с другими объявлениями',
            'Статистика показов и кликов',
            'Фильтрация по локации'
        ],
        popular: false
    },
    {
        id: 'standard',
        name: 'Стандартный',
        duration: 14,
        price: 89,
        features: [
            '14 дней размещения',
            'Ротация с другими объявлениями',
            'Статистика показов и кликов',
            'Фильтрация по локации'
        ],
        popular: true
    },
    {
        id: 'premium',
        name: 'Премиум',
        duration: 30,
        price: 149,
        features: [
            '30 дней размещения',
            'Ротация с другими объявлениями',
            'Статистика показов и кликов',
            'Фильтрация по локации'
        ],
        popular: false
    }
]

export default function PurchaseAdvertisementPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [selectedPackage, setSelectedPackage] = useState('standard')
    const [selectedAdvertisementId, setSelectedAdvertisementId] = useState(null)

    // Загружаем существующие обычные объявления
    // Запрашиваем все объявления без пагинации для страницы покупки рекламы
    const { data: advertisementsResponse, isLoading: isLoadingAds } = useQuery({
        queryKey: ['business-advertisements', 'all'],
        queryFn: () => getBusinessAdvertisements({ pageSize: 1000 }), // Запрашиваем много объявлений
    })

    // Извлекаем массив объявлений из ответа
    const advertisements = Array.isArray(advertisementsResponse) 
        ? advertisementsResponse 
        : (advertisementsResponse?.data || [])

    // Фильтруем только обычные объявления (marketplace объявления, не рекламные)
    // Рекламные объявления имеют тип 'ad' или 'advertisement'
    // Обычные объявления имеют тип 'marketplace', 'regular' или null
    const regularAdvertisements = Array.isArray(advertisements) 
        ? advertisements.filter(ad => {
            const type = ad.type
            // Исключаем рекламные объявления
            return type !== 'ad' && type !== 'advertisement'
        })
        : []

    const packageData = ADVERTISING_PACKAGES.find(pkg => pkg.id === selectedPackage)

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateBusinessAdvertisement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Реклама активирована! Объявление отправлено на модерацию
                </Notification>
            )
            router.push('/business/advertisements')
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось активировать рекламу: {error.response?.data?.message || error.message || 'Неизвестная ошибка'}
                </Notification>
            )
        },
    })

    const handlePurchase = () => {
        if (!selectedAdvertisementId) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Выберите объявление для продвижения
                </Notification>
            )
            return
        }

        if (!selectedPackage) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Выберите пакет рекламы
                </Notification>
            )
            return
        }

        const pkg = ADVERTISING_PACKAGES.find(p => p.id === selectedPackage)
        if (!pkg) return

        // Вычисляем даты на основе выбранного пакета
        // Используем локальную дату, чтобы избежать проблем с часовыми поясами
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        const startDateStr = `${year}-${month}-${day}`
        
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + pkg.duration)
        const endYear = endDate.getFullYear()
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
        const endDay = String(endDate.getDate()).padStart(2, '0')
        const endDateStr = `${endYear}-${endMonth}-${endDay}`

        const updateData = {
            type: 'advertisement',
            placement: 'services',
            start_date: startDateStr,
            end_date: endDateStr,
        }

        updateMutation.mutate({ id: selectedAdvertisementId, data: updateData })
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    {/* Заголовок */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h3>Покупка рекламы</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Выберите объявление для продвижения и пакет рекламы
                            </p>
                        </div>
                        <Link href="/business/advertisements">
                            <Button
                                variant="plain"
                                size="sm"
                                icon={<PiArrowLeft />}
                            >
                                Назад
                            </Button>
                        </Link>
                    </div>

                    {isLoadingAds ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <Loading loading />
                        </div>
                    ) : regularAdvertisements.length === 0 ? (
                        <div className="text-center py-8 md:py-12">
                            <PiMegaphone className="text-4xl md:text-5xl mx-auto mb-3 md:mb-4 text-gray-400 dark:text-gray-500" />
                            <h4 className="text-base md:text-lg font-semibold mb-2">Нет объявлений для продвижения</h4>
                            <p className="text-sm text-gray-500 mb-4 px-4">
                                Сначала создайте обычное объявление, чтобы его можно было продвигать
                            </p>
                            <Link href="/business/settings/advertisements/create">
                                <Button variant="solid" icon={<PiMegaphone />} size="sm">
                                    Создать объявление
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
                            {/* Левая колонка - Выбор объявления */}
                            <div className="lg:col-span-2 order-2 lg:order-1">
                                <div className="flex flex-col gap-3 md:gap-4">
                                    <h4 className="text-sm md:text-base font-semibold">
                                        Выберите объявление для продвижения
                                    </h4>
                                    
                                    <div className="space-y-2 md:space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                                        {regularAdvertisements.map((ad) => (
                                            <Card
                                                key={ad.id}
                                                className={`p-3 md:p-4 cursor-pointer transition-all ${
                                                    selectedAdvertisementId === ad.id
                                                        ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                                                        : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                                onClick={() => setSelectedAdvertisementId(ad.id)}
                                            >
                                                <div className="flex gap-3 md:gap-4">
                                                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                                                        {ad.image ? (
                                                            <Image
                                                                src={normalizeImageUrl(ad.image)}
                                                                alt={ad.title}
                                                                fill
                                                                className="object-cover"
                                                                onError={(e) => {
                                                                    e.target.src = FALLBACK_IMAGE
                                                                    e.target.onerror = null
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                                <PiImage size={20} className="md:w-6 md:h-6" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm md:text-base mb-1 line-clamp-1">
                                                            {ad.title}
                                                        </h4>
                                                        {ad.description && (
                                                            <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mb-1 md:mb-2">
                                                                {ad.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 md:gap-4 text-xs text-gray-400">
                                                            {ad.city && <span>{ad.city}</span>}
                                                            {ad.state && <span>{ad.state}</span>}
                                                        </div>
                                                    </div>
                                                    {selectedAdvertisementId === ad.id && (
                                                        <div className="flex-shrink-0">
                                                            <PiCheck className="text-blue-500 dark:text-blue-400 text-xl md:text-2xl" />
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Правая колонка - Выбор пакета */}
                            <div className="lg:col-span-1 order-1 lg:order-2">
                                <div className="flex flex-col gap-3 md:gap-4 sticky top-4">
                                    <h4 className="text-sm md:text-base font-semibold">
                                        Выберите пакет
                                    </h4>
                                    
                                    {/* Мобильная версия - компактные карточки */}
                                    <div className="lg:hidden space-y-2">
                                        {ADVERTISING_PACKAGES.map((pkg) => (
                                            <Card
                                                key={pkg.id}
                                                    className={`p-2.5 cursor-pointer transition-all border-2 ${
                                                        selectedPackage === pkg.id
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                                    onClick={() => setSelectedPackage(pkg.id)}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-sm">{pkg.name}</h4>
                                                            {pkg.popular && (
                                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    Поп
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-bold">${pkg.price}</div>
                                                            <div className="text-[10px] text-gray-500">{pkg.duration} дн.</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <ul className="space-y-1 mt-2">
                                                        {pkg.features.map((feature, idx) => (
                                                            <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                                                                <PiCheck className="text-green-500 mt-0.5 flex-shrink-0" size={12} />
                                                                <span className="leading-tight">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Десктопная версия - вертикальный список */}
                                    <div className="hidden lg:flex flex-col gap-2.5">
                                        {ADVERTISING_PACKAGES.map((pkg) => (
                                            <Card
                                                key={pkg.id}
                                                className={`p-3 cursor-pointer transition-all border-2 ${
                                                    selectedPackage === pkg.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                                onClick={() => setSelectedPackage(pkg.id)}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-base">{pkg.name}</h4>
                                                        {pkg.popular && (
                                                            <span className="mt-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                Популярный
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-bold">${pkg.price}</div>
                                                        <div className="text-xs text-gray-500">за {pkg.duration} дней</div>
                                                    </div>
                                                </div>
                                                
                                                <ul className="space-y-1.5 mt-2.5">
                                                    {pkg.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-xs">
                                                            <PiCheck className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Card>
                                        ))}
                                    </div>

                                    {packageData && (
                                        <div className="mt-3 md:mt-4 p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs md:text-sm font-medium">Итого:</span>
                                                <span className="text-lg md:text-xl font-bold">${packageData.price}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Срок действия: {packageData.duration} дней
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        variant="solid"
                                        size="sm"
                                        icon={<PiMegaphone />}
                                        onClick={handlePurchase}
                                        loading={updateMutation.isPending}
                                        disabled={!selectedAdvertisementId || !selectedPackage}
                                        className="w-full mt-3 md:mt-4"
                                    >
                                        Купить рекламу
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </AdaptiveCard>
        </Container>
    )
}

