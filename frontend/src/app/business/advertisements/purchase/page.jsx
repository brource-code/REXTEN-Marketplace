'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getBusinessAdvertisements } from '@/lib/api/business'
import { usePlatformPublicRuntime } from '@/hooks/api/usePlatformPublicRuntime'
import { createStripeCheckoutSession } from '@/lib/api/stripe'
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

export default function PurchaseAdvertisementPage() {
    const t = useTranslations('business.advertisements.purchase')
    const tCommon = useTranslations('business.common')
    const router = useRouter()
    const queryClient = useQueryClient()

    const { data: publicPlatform } = usePlatformPublicRuntime()
    const stripePaymentsOn = publicPlatform?.stripePaymentsEnabled !== false
    const [selectedPackage, setSelectedPackage] = useState('standard')
    const [selectedAdvertisementId, setSelectedAdvertisementId] = useState(null)
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
    const [paymentInfo, setPaymentInfo] = useState(null)
    
    // Динамические пакеты с переводами
    const ADVERTISING_PACKAGES = useMemo(() => [
        {
            id: 'basic',
            name: t('packages.basic.name'),
            duration: 7,
            price: 49,
            features: [
                t('packages.basic.feature1'),
                t('packages.basic.feature2'),
                t('packages.basic.feature3'),
                t('packages.basic.feature4')
            ],
            popular: false
        },
        {
            id: 'standard',
            name: t('packages.standard.name'),
            duration: 14,
            price: 89,
            features: [
                t('packages.standard.feature1'),
                t('packages.standard.feature2'),
                t('packages.standard.feature3'),
                t('packages.standard.feature4')
            ],
            popular: true
        },
        {
            id: 'premium',
            name: t('packages.premium.name'),
            duration: 30,
            price: 149,
            features: [
                t('packages.premium.feature1'),
                t('packages.premium.feature2'),
                t('packages.premium.feature3'),
                t('packages.premium.feature4')
            ],
            popular: false
        }
    ], [t])

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
    // ВАЖНО: Показываем только одобренные объявления (status = 'approved')
    const regularAdvertisements = Array.isArray(advertisements) 
        ? advertisements.filter(ad => {
            const type = ad.type
            const status = ad.status
            // Исключаем рекламные объявления
            // Показываем только одобренные объявления (не pending)
            return type !== 'ad' && type !== 'advertisement' && status === 'approved'
        })
        : []

    const packageData = ADVERTISING_PACKAGES.find(pkg => pkg.id === selectedPackage)

    // Проверяем успешную оплату из URL параметров
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const paymentStatus = urlParams.get('payment')
        const sessionId = urlParams.get('session_id')
        
        if (paymentStatus === 'success' && sessionId) {
            // Проверяем, что это действительно наша сессия (из localStorage)
            const savedSessionId = localStorage.getItem('stripe_checkout_session_id')
            const savedTimestamp = localStorage.getItem('stripe_checkout_timestamp')
            
            // Проверяем, что сессия не старше 10 минут
            const isRecent = savedTimestamp && (Date.now() - parseInt(savedTimestamp)) < 10 * 60 * 1000
            
            if (savedSessionId === sessionId && isRecent) {
                // Находим информацию о пакете
                const savedPackageId = localStorage.getItem('stripe_checkout_package_id')
                const pkg = ADVERTISING_PACKAGES.find(p => savedPackageId === p.id)
                
                // Получаем информацию об объявлении из localStorage или из загруженных данных
                const savedAdId = localStorage.getItem('stripe_checkout_advertisement_id')
                let advertisementTitle = 'Объявление'
                
                if (savedAdId && regularAdvertisements.length > 0) {
                    const selectedAd = regularAdvertisements.find(ad => parseInt(savedAdId) === ad.id)
                    if (selectedAd) {
                        advertisementTitle = selectedAd.title
                    }
                } else {
                    // Если объявления еще не загружены, используем сохраненное название
                    const savedAdTitle = localStorage.getItem('stripe_checkout_advertisement_title')
                    if (savedAdTitle) {
                        advertisementTitle = savedAdTitle
                    }
                }
                
                if (pkg) {
                    // Сохраняем информацию о платеже для модалки
                    setPaymentInfo({
                        packageName: pkg.name,
                        price: pkg.price,
                        duration: pkg.duration,
                        advertisementTitle: advertisementTitle,
                    })
                    
                    // Показываем модальное окно
                    setIsSuccessModalOpen(true)
                    
                    // Обновляем данные объявлений
                    queryClient.invalidateQueries({ queryKey: ['business-advertisements'] })
                }
                
                // Очищаем сохраненные данные
                localStorage.removeItem('stripe_checkout_session_id')
                localStorage.removeItem('stripe_checkout_timestamp')
                localStorage.removeItem('stripe_checkout_package_id')
                localStorage.removeItem('stripe_checkout_advertisement_id')
                localStorage.removeItem('stripe_checkout_advertisement_title')
                localStorage.removeItem('stripe_checkout_advertisement_title')
                
                // Очищаем URL параметры
                router.replace('/business/advertisements/purchase')
            }
        } else if (paymentStatus === 'cancelled') {
            // Очищаем сохраненные данные
            localStorage.removeItem('stripe_checkout_session_id')
            localStorage.removeItem('stripe_checkout_timestamp')
            localStorage.removeItem('stripe_checkout_package_id')
            localStorage.removeItem('stripe_checkout_advertisement_id')
            
            toast.push(
                <Notification title={tCommon('info')} type="warning">
                    {t('notifications.paymentCancelled') || 'Оплата отменена.'}
                </Notification>
            )
            // Очищаем URL параметры
            router.replace('/business/advertisements/purchase')
        }
    }, [router, queryClient, tCommon, t, ADVERTISING_PACKAGES, regularAdvertisements])

    const checkoutMutation = useMutation({
        mutationFn: ({ advertisementId, packageId }) => 
            createStripeCheckoutSession(advertisementId, packageId),
        onSuccess: (data) => {
            // Сохраняем информацию в localStorage перед редиректом
            // Это нужно для обработки успешной оплаты после возврата
            if (data.session_id) {
                localStorage.setItem('stripe_checkout_session_id', data.session_id)
                localStorage.setItem('stripe_checkout_timestamp', Date.now().toString())
                localStorage.setItem('stripe_checkout_package_id', data.packageId || selectedPackage)
                localStorage.setItem('stripe_checkout_advertisement_id', data.advertisementId || selectedAdvertisementId?.toString())
                
                // Сохраняем название объявления для отображения в модалке
                const selectedAd = regularAdvertisements.find(ad => ad.id === selectedAdvertisementId)
                if (selectedAd) {
                    localStorage.setItem('stripe_checkout_advertisement_title', selectedAd.title)
                }
            }
            
            // Перенаправляем на страницу оплаты Stripe
            if (data.checkout_url) {
                window.location.href = data.checkout_url
            } else {
                throw new Error('Не удалось получить URL для оплаты')
            }
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.paymentError') || 'Ошибка при создании сессии оплаты'}: {error.response?.data?.message || error.message || ''}
                </Notification>
            )
        },
    })

    const handlePurchase = () => {
        if (!stripePaymentsOn) {
            toast.push(
                <Notification title={tCommon('error')} type="warning">
                    {t('stripeDisabled')}
                </Notification>,
            )
            return
        }
        if (!selectedAdvertisementId) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.selectAdError')}
                </Notification>
            )
            return
        }

        if (!selectedPackage) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.selectPackageError')}
                </Notification>
            )
            return
        }

        // Создаём Stripe Checkout Session
        checkoutMutation.mutate({
            advertisementId: selectedAdvertisementId,
            packageId: selectedPackage,
        })
    }

    return (
        <Container>
            <AdaptiveCard>
                <div className="flex flex-col gap-4">
                    {/* Заголовок */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                {t('description')}
                            </p>
                        </div>
                        <Link href="/business/advertisements">
                            <Button
                                variant="plain"
                                size="sm"
                                icon={<PiArrowLeft />}
                            >
                                {t('back')}
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
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('noAdsToPromote')}</h4>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 px-4">
                                {t('createFirst')}
                            </p>
                            <Link href="/business/settings/advertisements/create">
                                <Button variant="solid" icon={<PiMegaphone />} size="sm">
                                    {t('createAd')}
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
                            {/* Левая колонка - Выбор объявления */}
                            <div className="lg:col-span-2 order-2 lg:order-1">
                                <div className="flex flex-col gap-3 md:gap-4">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('selectAd')}
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
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                                                            {ad.title}
                                                        </h4>
                                                        {ad.description && (
                                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 line-clamp-2 mb-1 md:mb-2">
                                                                {ad.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 md:gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
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
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('selectPackage')}
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
                                                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">{pkg.name}</h4>
                                                            {pkg.popular && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    {t('pop')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">${pkg.price}</div>
                                                            <div className="text-[10px] font-bold text-gray-900 dark:text-gray-100">{pkg.duration} {t('days')}</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <ul className="space-y-1 mt-2">
                                                        {pkg.features.map((feature, idx) => (
                                                            <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                                                                <PiCheck className="text-green-500 mt-0.5 flex-shrink-0" size={12} />
                                                                <span className="leading-tight text-[11px] font-bold text-gray-500 dark:text-gray-400">{feature}</span>
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
                                                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">{pkg.name}</h4>
                                                        {pkg.popular && (
                                                            <span className="mt-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                {t('popular')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">${pkg.price}</div>
                                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('for')} <span className="text-gray-900 dark:text-gray-100">{pkg.duration}</span> {t('days')}</div>
                                                    </div>
                                                </div>
                                                
                                                <ul className="space-y-1.5 mt-2.5">
                                                    {pkg.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-xs">
                                                            <PiCheck className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Card>
                                        ))}
                                    </div>

                                    {!stripePaymentsOn && (
                                        <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {t('stripeDisabled')}
                                            </p>
                                        </div>
                                    )}

                                    {packageData && (
                                        <div className="mt-3 md:mt-4 p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">{t('total')}:</span>
                                                <span className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">${packageData.price}</span>
                                            </div>
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('duration')}: <span className="text-gray-900 dark:text-gray-100">{packageData.duration}</span> {t('days')}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        variant="solid"
                                        size="sm"
                                        icon={<PiMegaphone />}
                                        onClick={handlePurchase}
                                        loading={checkoutMutation.isPending}
                                        disabled={!stripePaymentsOn || !selectedAdvertisementId || !selectedPackage}
                                        className="w-full mt-3 md:mt-4"
                                    >
                                        {t('buyButton')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </AdaptiveCard>

            {/* Модальное окно успешной оплаты */}
            <Dialog
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                width={500}
                closable={true}
            >
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <PiCheck className="text-3xl text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {t('notifications.paymentSuccess') || 'Оплата прошла успешно!'}
                        </h4>
                        {paymentInfo && (
                            <div className="space-y-3 mt-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('successModal.advertisement') || 'Объявление'}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {paymentInfo.advertisementTitle}
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('successModal.package') || 'Пакет'}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {paymentInfo.packageName}
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('successModal.amount') || 'Сумма оплаты'}
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        ${paymentInfo.price}
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                        {t('successModal.duration') || 'Период действия'}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {paymentInfo.duration} {t('days')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="plain"
                            className="flex-1"
                            onClick={() => setIsSuccessModalOpen(false)}
                        >
                            {t('successModal.close') || 'Закрыть'}
                        </Button>
                        <Button
                            variant="solid"
                            className="flex-1"
                            icon={<PiMegaphone />}
                            onClick={() => {
                                setIsSuccessModalOpen(false)
                                router.push('/business/advertisements/ads')
                            }}
                        >
                            {t('successModal.viewAds') || 'Рекламные объявления'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Container>
    )
}

