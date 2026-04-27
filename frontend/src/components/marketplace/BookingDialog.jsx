'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { PiX, PiStarFill, PiCaretLeft, PiCaretRight, PiCheckCircle } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { createBooking, getAvailableSlots, getAvailableSlotsBatch, checkSlotAvailability, previewBookingDiscount } from '@/lib/api/bookings'
import { createClientBookingPayment } from '@/lib/api/stripe'
import { getServiceProfile } from '@/lib/api/marketplace'
import { useAuthStore, useUserStore } from '@/store'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { CLIENT } from '@/constants/roles.constant'
import BookingAdditionalServices from '@/components/BookingAdditionalServices'
import BookingPayment from '@/components/marketplace/BookingPayment'
import { formatDuration } from '@/utils/formatDuration'
import { formatCurrency } from '@/utils/formatCurrency'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'
import { useTranslations } from 'next-intl'
import { logClientApiError, logClientApiWarn } from '@/utils/logClientApiError'
import { snapDurationToBookingPresetMinutes } from '@/components/business/booking/shared/bookingDurationPresets'
import { normalizeImageUrl } from '@/utils/imageUtils'

/**
 * Переиспользуемый компонент модалки бронирования
 * Используется на странице профиля бизнеса и может использоваться в других местах
 */
const BookingDialog = ({
    isOpen,
    onClose,
    onSuccess,
    slug,
    profile: initialProfile,
    services = [],
    team = [],
    availableDates = [],
    companyId,
    advertisementId,
    preselectedServiceId = null,
}) => {
    const [profile, setProfile] = useState(initialProfile)
    const currency = profile?.service?.currency || 'USD'
    const [selectedDate, setSelectedDate] = useState(0)
    const [selectedTime, setSelectedTime] = useState(null)
    const [selectedMaster, setSelectedMaster] = useState(null)
    const [selectedService, setSelectedService] = useState(null)
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        address_line1: '',
        city: '',
        state: '',
        zip: '',
    })
    const [executionType, setExecutionType] = useState('onsite') // Для гибридных услуг
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [availableSlotsData, setAvailableSlotsData] = useState({})
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [currentStep, setCurrentStep] = useState(1) // 1: услуга, 2: специалист, 3: дата/время
    const [selectedAdditionalServices, setSelectedAdditionalServices] = useState([]) // Дополнительные услуги
    const [promoCode, setPromoCode] = useState('')
    const [promoExpanded, setPromoExpanded] = useState(false)
    const [discountPreview, setDiscountPreview] = useState(null)
    const [discountPreviewLoading, setDiscountPreviewLoading] = useState(false)
    const [paymentStep, setPaymentStep] = useState(false)
    const [paymentClientSecret, setPaymentClientSecret] = useState(null)
    const [paymentAmount, setPaymentAmount] = useState(null)
    const [paymentSuccess, setPaymentSuccess] = useState(false)
    const [stripePaymentIntentStatus, setStripePaymentIntentStatus] = useState(null)
    const [createdBookingId, setCreatedBookingId] = useState(null)
    const t = useTranslations('components.bookingDialog')

    // Проверка авторизации и получение данных пользователя
    const { isAuthenticated, userRole } = useAuthStore()
    const { user: userStore } = useUserStore()
    const { data: currentUser } = useCurrentUser({ enabled: isAuthenticated })
    const displayUser = currentUser || userStore
    const isClient = isAuthenticated && userRole === CLIENT

    const validServicesForPrice = Array.isArray(services)
        ? services.filter((s) => s && typeof s === 'object' && s.id !== undefined && s.id !== null)
        : []
    const currentServiceForPrice =
        validServicesForPrice.find((s) => s.id === selectedService) ||
        (validServicesForPrice.length > 0 ? validServicesForPrice[0] : null)

    const bookingSubtotal = useMemo(() => {
        if (!currentServiceForPrice) return 0
        const base = parseFloat(currentServiceForPrice.price || 0) || 0
        const add = selectedAdditionalServices.reduce((sum, s) => {
            const qty = s.quantity || 1
            const p = parseFloat(s.price) || 0
            return sum + p * qty
        }, 0)
        return base + add
    }, [currentServiceForPrice, selectedAdditionalServices])

    const companyIdNumForPreview = companyId ? parseInt(companyId, 10) : null

    useEffect(() => {
        if (!isOpen || !companyIdNumForPreview || bookingSubtotal <= 0 || currentStep !== 3) {
            setDiscountPreview(null)
            return
        }
        const tmr = setTimeout(() => {
            setDiscountPreviewLoading(true)
            previewBookingDiscount({
                company_id: companyIdNumForPreview,
                subtotal: Math.round(bookingSubtotal * 100) / 100,
                promo_code: promoCode.trim() || undefined,
                client_phone: form.phone || undefined,
            })
                .then((res) => {
                    if (res.success && res.data) {
                        setDiscountPreview(res.data)
                    } else {
                        setDiscountPreview(null)
                    }
                })
                .catch(() => setDiscountPreview(null))
                .finally(() => setDiscountPreviewLoading(false))
        }, 450)
        return () => clearTimeout(tmr)
    }, [
        isOpen,
        companyIdNumForPreview,
        bookingSubtotal,
        promoCode,
        form.phone,
        currentStep,
    ])

    // Подстановка данных пользователя при открытии модалки
    useEffect(() => {
        if (isOpen && isClient && displayUser) {
            // Формируем полное имя из разных возможных полей
            const fullName = displayUser.name || 
                `${displayUser.firstName || ''} ${displayUser.lastName || ''}`.trim() ||
                `${displayUser.first_name || ''} ${displayUser.last_name || ''}`.trim() ||
                displayUser.full_name ||
                ''
            
            // Подставляем данные только если поля пустые
            setForm(prev => ({
                name: prev.name || fullName || '',
                phone: prev.phone || displayUser.phone || displayUser.phone_number || '',
                email: prev.email || displayUser.email || '',
            }))
        } else if (isOpen && !isClient) {
            // Если модалка открыта, но пользователь не залогинен, очищаем форму
            setForm({
                name: '',
                phone: '',
                email: '',
            })
        }
    }, [isOpen, isClient, displayUser])

    // Блокировка фонового скролла при открытой модалке
    useEffect(() => {
        if (isOpen) {
            // Сохраняем текущую позицию скролла
            const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
            // Блокируем скролл для всех устройств, включая iOS Safari
            document.body.style.position = 'fixed'
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = '100%'
            document.body.style.overflow = 'hidden'
            // Для iOS Safari
            document.documentElement.style.overflow = 'hidden'
            document.documentElement.style.position = 'fixed'
            document.documentElement.style.width = '100%'
            
            return () => {
                // Восстанавливаем скролл
                document.body.style.position = ''
                document.body.style.top = ''
                document.body.style.width = ''
                document.body.style.overflow = ''
                document.documentElement.style.overflow = ''
                document.documentElement.style.position = ''
                document.documentElement.style.width = ''
                // Восстанавливаем позицию скролла
                window.scrollTo(0, scrollY)
            }
        }
    }, [isOpen])

    // Загрузка доступных слотов при открытии модалки
    useEffect(() => {
        if (!isOpen || !slug) {
            return
        }
        
        let isCancelled = false
        
        const loadAvailableSlots = async () => {
            let currentProfile = initialProfile
            try {
                // Перезагружаем профиль для актуальных данных
                currentProfile = await getServiceProfile(slug, true)
                if (isCancelled) return
                
                if (!currentProfile) {
                    logClientApiError('BookingDialog: failed to reload profile', new Error('No profile'))
                    return
                }

                setProfile(currentProfile)
            } catch (error) {
                logClientApiError('BookingDialog: error reloading profile', error)
                if (!initialProfile) return
                currentProfile = initialProfile
            }
            
            if (!currentProfile?.service || !currentProfile?.schedule?.days || currentProfile.schedule.days.length === 0) {
                return
            }
            
            const companyIdNum = companyId || (currentProfile.service.company_id ? parseInt(currentProfile.service.company_id) : null)
            const servicesList = currentProfile.servicesList || []

            // Фильтруем servicesList, чтобы получить только валидные объекты (не числа)
            // Ослабляем фильтрацию: принимаем строковые ID (но не null/undefined/пустые строки)
            const validServicesList = Array.isArray(servicesList) 
                ? servicesList.filter(s => {
                    const isValid = s && typeof s === 'object' && !Array.isArray(s) && (s.id !== undefined && s.id !== null && s.id !== '')
                    if (!isValid) {
                        logClientApiWarn('BookingDialog: filtered out invalid service item', new Error('Invalid item'), {
                            idType: typeof s?.id,
                        })
                    }
                    return isValid
                })
                : []
            const firstService = validServicesList.length > 0 ? validServicesList[0] : null
            
            if (!firstService || !companyIdNum) {
                logClientApiWarn('BookingDialog: missing firstService or companyIdNum', new Error('Missing data'), {
                    hasFirstService: !!firstService,
                    companyIdNum,
                })
                return
            }
            
            const serviceIdStr = firstService.id ? String(firstService.id) : null
            const serviceId = serviceIdStr && !isNaN(parseInt(serviceIdStr)) ? parseInt(serviceIdStr) : null
            
            if (!serviceId) {
                logClientApiWarn('BookingDialog: invalid serviceId', new Error('Invalid id'), { serviceIdStr })
                return
            }
            
            // Определяем, это объявление или обычная услуга
            const isAdvertisement = currentProfile.service?.id?.startsWith('ad_')
            const adId = advertisementId || 
                (currentProfile.service?.advertisement_id ? parseInt(currentProfile.service.advertisement_id) : null) ||
                (isAdvertisement ? parseInt(currentProfile.service.id.replace('ad_', '')) : null)
            
            // Логируем только при ошибках (убрано избыточное логирование)
            
            setLoadingSlots(true)
            
            try {
                const datesToLoad = currentProfile.schedule.days.slice(0, 30)
                const dateStrings = datesToLoad.map(d => d.date || new Date().toISOString().split('T')[0]).filter(Boolean)

                if (dateStrings.length === 0) {
                    setAvailableSlotsData({})
                    return
                }

                const batchParams = {
                    company_id: companyIdNum,
                    service_id: serviceId,
                    dates: dateStrings,
                }

                if (isAdvertisement && adId) {
                    batchParams.advertisement_id = adId
                }
                if (selectedMaster) {
                    batchParams.specialist_id = parseInt(selectedMaster)
                }

                const batchResult = await getAvailableSlotsBatch(batchParams)
                
                if (isCancelled) return
                
                const newSlotsData = {}
                datesToLoad.forEach((date, idx) => {
                    const dateStr = date.date || new Date().toISOString().split('T')[0]
                    const dateId = date.id !== undefined ? date.id : idx
                    const slots = batchResult[dateStr] || []
                    newSlotsData[dateId] = Array.isArray(slots) ? slots.map(s => ({
                        time: s.time || s.start_time || '',
                        end_time: s.end_time || s.endTime || '',
                        available: s.available !== false,
                    })) : []
                })
                
                setAvailableSlotsData(newSlotsData)
            } catch (error) {
                logClientApiError('BookingDialog: error loading available slots', error)
            } finally {
                if (!isCancelled) {
                    setLoadingSlots(false)
                }
            }
        }
        
        loadAvailableSlots()
        
        return () => {
            isCancelled = true
        }
    }, [isOpen, slug, companyId, advertisementId, initialProfile, selectedMaster])

    // Сброс состояния при закрытии
    useEffect(() => {
        if (!isOpen) {
            setSelectedDate(0)
            setSelectedTime(null)
            setSelectedMaster(null)
            setSelectedService(null)
            setForm({ name: '', phone: '', email: '' })
            setError(null)
            setAvailableSlotsData({})
            setCurrentStep(1)
            setSelectedAdditionalServices([])
            setPaymentStep(false)
            setPaymentClientSecret(null)
            setPaymentAmount(null)
            setPaymentSuccess(false)
            setStripePaymentIntentStatus(null)
            setCreatedBookingId(null)
        }
    }, [isOpen])

    useEffect(() => {
        const validServices = Array.isArray(services) ? services.filter(s => s && typeof s === 'object' && s.id !== undefined) : []
        if (isOpen && validServices.length > 0 && !selectedService) {
            const preselected = preselectedServiceId
                ? validServices.find(s => String(s.id) === String(preselectedServiceId))
                : null
            const chosen = preselected || validServices[0]
            setSelectedService(chosen.id)

            if (preselected || validServices.length === 1) {
                if (team.length > 0) {
                    setCurrentStep(2)
                } else {
                    setCurrentStep(3)
                }
            } else {
                setCurrentStep(1)
            }
        }
    }, [isOpen, services, selectedService, team.length, preselectedServiceId])

    const handleClose = () => {
        if (paymentSuccess && onSuccess) {
            onSuccess({ hadOnlinePayment: true })
        }

        setSelectedDate(0)
        setSelectedTime(null)
        setSelectedMaster(null)
        setSelectedService(null)
        setForm({ name: '', phone: '', email: '', address_line1: '', city: '', state: '', zip: '' })
        setExecutionType('onsite')
        setError(null)
        setAvailableSlotsData({})
        setCurrentStep(1)
        setPromoCode('')
        setPromoExpanded(false)
        setDiscountPreview(null)
        setPaymentStep(false)
        setPaymentClientSecret(null)
        setPaymentAmount(null)
        setPaymentSuccess(false)
        setStripePaymentIntentStatus(null)
        setCreatedBookingId(null)
        onClose()
    }

    const handleSubmit = async () => {
        if (!form.name || !form.phone || !selectedTime) return
        
        // Валидация для гибридных услуг
        if (serviceType === 'hybrid' && !executionType) {
            setError(t('errors.selectExecutionType'))
            return
        }
        
        // Валидация адреса для offsite бронирований
        if (finalExecutionType === 'offsite') {
            if (!form.address_line1 || !form.city || !form.state || !form.zip) {
                setError(t('errors.fullAddressRequired'))
                return
            }
        }
        
        const selectedDateObj = availableDates[selectedDate]
        if (!selectedDateObj || !profile?.service) return
        
        // Определяем, это объявление или обычная услуга
        const isAdvertisement = profile.service.id?.startsWith('ad_')
        
        // ВАЖНО: Для объявлений специалист обязателен!
        if (isAdvertisement && !selectedMaster) {
            setError(t('errors.specialistRequired'))
            return
        }
        
        const validServices = Array.isArray(services) ? services.filter(s => s && typeof s === 'object' && s.id !== undefined) : []
        const service = validServices.find(s => s.id === selectedService) || (validServices.length > 0 ? validServices[0] : null)
        if (!service) {
            setError(t('errors.serviceNotSelected'))
            return
        }
        
        const companyIdNum = companyId || (profile.service.company_id ? parseInt(profile.service.company_id) : null)
        
        // Используем adId, определенный выше в области видимости компонента
        let serviceId = null
        
        if (isAdvertisement && adId) {
            // Для объявлений:
            // 1. Если у услуги есть service_id (привязка к реальной услуге) - используем его
            // 2. Иначе используем виртуальный ID услуги из JSON (1, 2, 3, 4)
            // БЭКЕНД ОБЯЗАТЕЛЬНО ДОЛЖЕН ПОЛУЧИТЬ advertisement_id, чтобы найти правильную услугу!
            if (service.service_id) {
                // Услуга привязана к реальной услуге из таблицы services
                serviceId = parseInt(service.service_id)
            } else if (service.id && !isNaN(parseInt(service.id))) {
                // Используем виртуальный ID из JSON
                serviceId = parseInt(service.id)
            } else {
                setError(t('errors.serviceIdNotFound'))
                return
            }
        } else {
            // Для обычных услуг используем реальный ID из таблицы services
            if (service.id && !isNaN(parseInt(service.id))) {
                serviceId = parseInt(service.id)
            } else {
                setError(t('errors.serviceIdNotFound'))
                return
            }
        }
        
        if (!companyIdNum) {
            setError(t('errors.companyNotFound'))
            return
        }
        
        if (!serviceId) {
            setError(t('errors.serviceNotFound'))
            return
        }
        
        setIsSubmitting(true)
        setError(null)
        
        try {
            let bookingDate = selectedDateObj.date
            if (!bookingDate) {
                bookingDate = new Date().toISOString().split('T')[0]
            }
            
            const duration = snapDurationToBookingPresetMinutes(
                service.duration != null && String(service.duration).trim() !== ''
                    ? parseInt(String(service.duration), 10) || 60
                    : 60,
            )
            
            // ВАЖНО: Для объявлений ОБЯЗАТЕЛЬНО передаем advertisement_id!
            // Без него бэкенд будет искать услугу во всех объявлениях компании,
            // что может привести к неправильному бронированию, если виртуальные ID совпадают!
            if (isAdvertisement && !adId) {
                setError(t('errors.advertisementIdNotFound'))
                setIsSubmitting(false)
                return
            }
            
            // Разделяем дополнительные услуги на БД и локальные
            const dbAdditionalServices = selectedAdditionalServices.filter(s => {
                // БД услуги имеют числовые ID или строковые, которые можно преобразовать в число
                const id = typeof s.id === 'string' ? parseInt(s.id) : s.id
                const isLocal = s.id.toString().startsWith('local_')
                return !isNaN(id) && !isLocal
            })
            
            const localAdditionalServices = selectedAdditionalServices.filter(s =>
                typeof s.id === 'string' && s.id.startsWith('local_')
            )

            // Формируем данные дополнительных услуг из БД для отправки
            const additionalServicesData = dbAdditionalServices.length > 0
                ? dbAdditionalServices.map(s => ({
                    id: parseInt(s.id), // Преобразуем в число для валидации
                    quantity: s.quantity || 1,
                }))
                : []
            
            // Формируем данные локальных дополнительных услуг для отправки
            const localAdditionalServicesData = localAdditionalServices.length > 0
                ? localAdditionalServices.map((s) => ({
                      name: s.name || '',
                      description: s.description || '',
                      price: parseFloat(s.price) || 0,
                      duration:
                          s.duration != null && s.duration !== ''
                              ? snapDurationToBookingPresetMinutes(Number(s.duration))
                              : null,
                      quantity: s.quantity || 1,
                  }))
                : []

            const bookingData = {
                company_id: companyIdNum,
                service_id: serviceId,
                booking_date: bookingDate,
                booking_time: selectedTime,
                duration_minutes: duration,
                specialist_id: selectedMaster ? parseInt(selectedMaster) : undefined,
                client_name: form.name,
                client_phone: form.phone,
                client_email: form.email || undefined,
                execution_type: finalExecutionType,
                ...(promoCode.trim() ? { promo_code: promoCode.trim() } : {}),
                ...(isAdvertisement && adId ? { advertisement_id: adId } : {}),
                ...(additionalServicesData.length > 0 ? { additional_services: additionalServicesData } : {}),
                ...(localAdditionalServicesData.length > 0 ? { local_additional_services: localAdditionalServicesData } : {}),
                // Добавляем адрес для offsite бронирований
                ...(finalExecutionType === 'offsite' ? {
                    address_line1: form.address_line1,
                    city: form.city,
                    state: form.state,
                    zip: form.zip,
                } : {}),
            }

            try {
                const bookingResponse = await createBooking(bookingData)
                const bookingResult = bookingResponse.data

                if (bookingResult?.requires_payment && bookingResult?.id) {
                    setCreatedBookingId(bookingResult.id)
                    setIsSubmitting(false)

                    try {
                        const payRes = await createClientBookingPayment(
                            bookingResult.id,
                            form.email || undefined
                        )
                        setPaymentClientSecret(payRes.client_secret)
                        const totalCents = Math.round((bookingResult.total_price || bookingResult.price || 0) * 100)
                        setPaymentAmount(totalCents)
                        setPaymentStep(true)
                    } catch (payError) {
                        logClientApiError('[BookingDialog] createClientBookingPayment', payError)
                        setError(payError?.response?.data?.message || t('errors.paymentInitFailed'))
                    }
                    return
                }

                handleClose()
                if (onSuccess) {
                    setTimeout(() => onSuccess({ hadOnlinePayment: false }), 150)
                }
            } catch (bookingError) {
                logClientApiError('[BookingDialog] createBooking', bookingError)
                try {
                    if (process.env.NODE_ENV !== 'production') {
                        localStorage.setItem(
                            'last_booking_error',
                            JSON.stringify({
                                status: bookingError?.response?.status,
                                message: bookingError?.message,
                                timestamp: new Date().toISOString(),
                            })
                        )
                    }
                } catch (e) {
                    logClientApiError('[BookingDialog] localStorage booking error', e)
                }

                if (bookingError?.response?.data?.errors) {
                    const validationErrors = bookingError.response.data.errors
                    const errorMessages = Object.values(validationErrors).flat().join(', ')
                    setError(errorMessages || t('errors.validationError'))
                } else if (bookingError?.response?.data?.message) {
                    setError(bookingError.response.data.message)
                } else {
                    setError(bookingError?.message || t('errors.cannotCreateBooking'))
                }
            } finally {
                setIsSubmitting(false)
            }
        } catch (error) {
            logClientApiError('[BookingDialog] handleSubmit', error)
            try {
                if (process.env.NODE_ENV !== 'production') {
                    localStorage.setItem(
                        'last_booking_critical_error',
                        JSON.stringify({
                            message: error?.message,
                            timestamp: new Date().toISOString(),
                        })
                    )
                }
            } catch (e) {
                logClientApiError('[BookingDialog] localStorage critical error', e)
            }

            setError(error?.message || t('errors.criticalError'))
            setIsSubmitting(false)
        }
    }

    // Функция для получения инициалов
    const getInitials = (name) => {
        const parts = name.split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    if (!isOpen) return null

    // Определяем, это объявление или обычная услуга (для использования в JSX)
    const isAdvertisement = profile?.service?.id?.startsWith('ad_') || false

    // Фильтруем services, чтобы убедиться, что это массив объектов, а не чисел
    // Это важно, так как services может содержать неправильные данные (например, числа вместо объектов)
    const validServices = Array.isArray(services) ? services.filter(s => s && typeof s === 'object' && s.id !== undefined && s.id !== null) : []
    
    // Если нет валидных услуг, показываем сообщение об ошибке
    if (validServices.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-4">
                    <h2 className="text-xl font-semibold mb-4">{t('errors.error')}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{t('errors.cannotLoadServices')}</p>
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm transition font-medium"
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        )
    }
    
    const currentService = validServices.find(s => s.id === selectedService) || (validServices.length > 0 ? validServices[0] : null)
    
    // Нормализуем additional_services - может быть строкой JSON или массивом
    let normalizedAdditionalServices = null
    if (currentService?.additional_services) {
        if (typeof currentService.additional_services === 'string') {
            try {
                normalizedAdditionalServices = JSON.parse(currentService.additional_services)
            } catch (e) {
                logClientApiWarn('[BookingDialog] Failed to parse additional_services as JSON', e)
                normalizedAdditionalServices = null
            }
        } else if (Array.isArray(currentService.additional_services)) {
            normalizedAdditionalServices = currentService.additional_services
        }
    }
    
    // Создаем нормализованный объект услуги с правильными additional_services
    const normalizedCurrentService = currentService ? {
        ...currentService,
        additional_services: normalizedAdditionalServices
    } : null
    
    // Определяем service_type
    const serviceType = normalizedCurrentService?.service_type || currentService?.service_type || 'onsite'

    // Определяем execution_type на основе service_type
    let finalExecutionType = 'onsite'
    if (serviceType === 'onsite') {
        finalExecutionType = 'onsite'
    } else if (serviceType === 'offsite') {
        finalExecutionType = 'offsite'
    } else if (serviceType === 'hybrid') {
        // Для гибридных услуг используем выбранный executionType
        finalExecutionType = executionType || 'onsite'
    }

    // Определяем advertisement_id для объявлений (ОБЯЗАТЕЛЬНО для правильной работы!)
    // Приоритет: 1) пропс advertisementId, 2) profile.service.advertisement_id, 3) из id (ad_74 -> 74)
    const adId = (() => {
        if (advertisementId) {
            return typeof advertisementId === 'string' ? parseInt(advertisementId) : advertisementId
        } else if (profile.service?.advertisement_id) {
            return typeof profile.service.advertisement_id === 'string' ? parseInt(profile.service.advertisement_id) : profile.service.advertisement_id
        } else if (isAdvertisement && profile.service?.id) {
            const adIdFromId = profile.service.id.replace('ad_', '')
            return parseInt(adIdFromId) || null
        }
        return null
    })()

    // Определяем service_id для загрузки дополнительных услуг
    // 1. Если услуга из объявления и у неё есть service_id в JSON - используем его
    // 2. Если услуга обычная - используем её id напрямую
    const serviceIdForAdditionalServices = (() => {
        if (!currentService) {
            return null
        }

        // Проверяем, есть ли service_id в объекте услуги (для объявлений)
        if (isAdvertisement && currentService.service_id) {
            const serviceId = parseInt(currentService.service_id)
            return serviceId
        } else if (!isAdvertisement && currentService.id) {
            // Для обычных услуг используем id напрямую
            const id = parseInt(currentService.id)
            const result = isNaN(id) ? null : id
            return result
        }

        return null
    })()

    const additionalServicesData = normalizedCurrentService?.additional_services

    // Используем только слоты из API, которые уже проверены на доступность
    const availableSlots = availableSlotsData[selectedDate] || []

    // Модалка успешного бронирования с оплатой — стандартный стиль
    if (paymentSuccess) {
        const isCardHold = stripePaymentIntentStatus === 'requires_capture'
        const successModalContent = (
            <div 
                className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4"
                style={{ 
                    minHeight: '100vh',
                    minHeight: '-webkit-fill-available',
                    height: '100dvh',
                    paddingTop: 'max(1rem, env(safe-area-inset-top))',
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                }}
                onClick={handleClose}
            >
                <div 
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-4 text-center relative transform transition-all duration-200 scale-100 opacity-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Иконка успеха */}
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <svg 
                            className="h-8 w-8 text-blue-600 dark:text-blue-400" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                d="M5 13l4 4L19 7" 
                            />
                        </svg>
                    </div>

                    {/* Заголовок */}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('successTitle')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {isCardHold ? t('successSubtitleHold') : t('successSubtitle')}
                    </p>

                    {/* Информация об успешной оплате */}
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-3">
                        {isCardHold ? t('paymentSuccessHold') : t('paymentSuccess')}
                    </p>

                    {/* Кнопка закрытия */}
                    <button
                        className="mt-6 w-full rounded-full bg-blue-600 hover:bg-blue-700 py-3 text-white font-semibold transition"
                        onClick={handleClose}
                    >
                        {t('great')}
                    </button>
                </div>
            </div>
        )

        if (typeof window !== 'undefined') {
            return createPortal(successModalContent, document.body)
        }
        return null
    }

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4"
            style={{ 
                minHeight: '100vh',
                minHeight: '-webkit-fill-available',
                height: '100dvh',
                paddingTop: 'max(1rem, env(safe-area-inset-top))',
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
            onClick={handleClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md relative transform transition-all duration-200 scale-100 opacity-100 flex flex-col"
                style={{
                    maxHeight: 'calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)) - 2rem)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Заголовок с кнопкой закрытия - зафиксирован сверху */}
                <div className="flex-shrink-0 p-4 pb-4 relative">
                    {/* Крестик закрытия */}
                    <button 
                        className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition z-10"
                        onClick={handleClose}
                    >
                        <PiX className="text-2xl" />
                    </button>

                    {/* Заголовок */}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white pr-8 mb-1">
                        {t('title')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t('description')}
                    </p>

                    {/* Шаги прогресса */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex-1 flex items-center">
                                <div
                                    className={classNames(
                                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition',
                                        currentStep >= step
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                                    )}
                                >
                                    {step}
                                </div>
                                {step < 3 && (
                                    <div
                                        className={classNames(
                                            'flex-1 h-0.5 mx-2 transition',
                                            currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
                                        )}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 pb-4">
                {/* Шаг 1: Выбор услуги */}
                {currentStep === 1 && !paymentStep && validServices.length > 1 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('selectService')}
                        </h3>
                        {validServices.map((service, index) => (
                            <button
                                key={service.id || `service-${index}`}
                                type="button"
                                onClick={() => {
                                    setSelectedService(service.id)
                                }}
                                className={classNames(
                                    'w-full text-left rounded-xl border p-4 transition',
                                    selectedService === service.id
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-white/20',
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                                            {service.name}
                                        </h4>
                                        {service.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                {service.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            {service.duration && (
                                                <span>⏱ {formatDuration(service.duration, service.duration_unit || 'hours')}</span>
                                            )}
                                            {service.price && <span>• {formatCurrency(service.price, service.currency || currency)}</span>}
                                        </div>
                                    </div>
                                    {selectedService === service.id && (
                                        <div className="ml-2 flex-shrink-0">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Шаг 2: Выбор специалиста (если есть команда) */}
                {currentStep === 2 && !paymentStep && team.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('selectMaster')}
                            </h3>
                            {/* Для объявлений специалист обязателен, кнопка "Пропустить" не показывается */}
                            {!isAdvertisement && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedMaster(null)
                                        setCurrentStep(3)
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {t('skip')}
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {team.map((member, idx) => {
                                const teamPhoto = member.avatarUrl || member.avatar
                                const teamPhotoSrc = teamPhoto ? normalizeImageUrl(teamPhoto) : ''
                                return (
                                <button
                                    key={member.id || `member-${idx}`}
                                    type="button"
                                    onClick={() => {
                                        setSelectedMaster(member.id)
                                        setCurrentStep(3)
                                    }}
                                    className={classNames(
                                        'w-full text-left rounded-xl border px-4 py-3 transition',
                                        selectedMaster === member.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-white/20',
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {teamPhotoSrc ? (
                                            <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                                                <img
                                                    src={teamPhotoSrc}
                                                    alt={member.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                                                {getInitials(member.name)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                                {member.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {member.role}
                                            </div>
                                        </div>
                                        {member.rating && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <PiStarFill className="text-yellow-500 text-xs" />
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                    {member.rating.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Шаг 3: Выбор даты/времени и форма */}
                {currentStep === 3 && !paymentStep && (
                    <div className="space-y-4">
                        {/* Выбор даты */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                {t('selectDate')}
                            </label>
                            <div className="relative">
                                {/* Контейнер с датами */}
                                <div 
                                    id="dates-scroll-container"
                                    className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                >
                                    <div className="flex gap-2 pb-2">
                                        {(availableDates || []).slice(0, 30).map((date, idx) => (
                                            <button
                                                key={date.id || `date-${idx}`}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDate(date.id || idx)
                                                    setSelectedTime(null)
                                                }}
                                                className={classNames(
                                                    'flex flex-col items-center rounded-xl border px-2.5 py-2 text-xs transition flex-shrink-0 min-w-[60px]',
                                                    selectedDate === (date.id || idx)
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                                                        : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20',
                                                )}
                                            >
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                    {date.dayName}
                                                </span>
                                                <span className="text-sm font-semibold">
                                                    {date.dayNumber}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Кнопки прокрутки под блоком дат */}
                                <div className="flex justify-between items-center mt-1 hidden md:flex">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const container = document.getElementById('dates-scroll-container')
                                            if (container) {
                                                container.scrollBy({ left: -200, behavior: 'smooth' })
                                            }
                                        }}
                                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full p-1.5 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center"
                                        aria-label={t('scrollLeft')}
                                    >
                                        <PiCaretLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const container = document.getElementById('dates-scroll-container')
                                            if (container) {
                                                container.scrollBy({ left: 200, behavior: 'smooth' })
                                            }
                                        }}
                                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full p-1.5 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center"
                                        aria-label={t('scrollRight')}
                                    >
                                        <PiCaretRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Выбор времени */}
                        {profile && (
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    {t('selectTime')}
                                    {loadingSlots && <span className="ml-2 text-xs text-gray-500">({t('checking')})</span>}
                                </label>
                                {loadingSlots && availableSlots.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                                        {t('loadingSlots')}
                                    </div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                                        {t('noAvailableSlots')}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {availableSlots.map((slot, idx) => {
                                            // Используем только слоты из API, которые уже проверены на доступность
                                            const isSlotAvailable = slot.available !== false
                                            
                                            return (
                                                <button
                                                    key={slot.time || `slot-${idx}`}
                                                    type="button"
                                                    disabled={!isSlotAvailable || loadingSlots}
                                                    onClick={() => {
                                                        // Просто выбираем слот без дополнительной проверки
                                                        // Проверка доступности уже выполнена при загрузке слотов
                                                        if (!isSlotAvailable || loadingSlots) return
                                                        
                                                        setSelectedTime(slot.time)
                                                        setError(null) // Очищаем ошибку при выборе
                                                    }}
                                                    className={classNames(
                                                        'rounded-full border px-4 py-2 text-sm transition',
                                                        !isSlotAvailable || loadingSlots
                                                            ? 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-800/50 opacity-50 cursor-not-allowed text-gray-400'
                                                            : selectedTime === slot.time
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                                            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-white/20',
                                                    )}
                                                >
                                                    {slot.time}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Блок "Вы выбрали" */}
                        {(selectedTime || currentService) && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    {t('youSelected')}
                                </h4>
                                {currentService && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{t('service')}:</span> {currentService.name}
                                        {currentService.price && <span className="ml-2">• {formatCurrency(currentService.price, currentService.currency || currency)}</span>}
                                    </div>
                                )}
                                {selectedMaster && team.find(m => m.id === selectedMaster) && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{t('specialist')}:</span> {team.find(m => m.id === selectedMaster)?.name}
                                    </div>
                                )}
                                {availableDates[selectedDate] && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{t('date')}:</span> {availableDates[selectedDate].dayName}, {availableDates[selectedDate].dayNumber}
                                    </div>
                                )}
                                {selectedTime && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{t('time')}:</span> {selectedTime}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Дополнительные услуги */}
                        {/* Показываем компонент, если есть serviceId из БД ИЛИ есть локальные услуги в объявлении */}
                        {(() => {
                            const hasServiceId = !!serviceIdForAdditionalServices
                            const additionalServices = normalizedCurrentService?.additional_services
                            const hasLocalServices = isAdvertisement &&
                                additionalServices &&
                                Array.isArray(additionalServices) &&
                                additionalServices.length > 0

                            // Показываем компонент, если есть serviceId ИЛИ advertisementId
                            if (hasServiceId || (isAdvertisement && adId)) {
                                return (
                                    <div className="pt-2">
                                        <BookingAdditionalServices
                                            serviceId={serviceIdForAdditionalServices || null}
                                            advertisementId={isAdvertisement && adId ? adId : null}
                                            selectedServices={selectedAdditionalServices}
                                            onSelectionChange={setSelectedAdditionalServices}
                                            basePrice={parseFloat(currentService?.price || normalizedCurrentService?.price || 0)}
                                            currency={currentService?.currency || normalizedCurrentService?.currency || currency}
                                        />
                                    </div>
                                )
                            }
                            
                            if (isAdvertisement && !adId) {
                                logClientApiWarn(
                                    '[BookingDialog] Advertisement without adId',
                                    new Error('Missing adId'),
                                    { hasAdvertisementIdProp: !!advertisementId }
                                )
                            }

                            if (hasServiceId || hasLocalServices) {
                                return (
                                    <div className="pt-2">
                                        <BookingAdditionalServices
                                            serviceId={serviceIdForAdditionalServices || null}
                                            advertisementId={isAdvertisement && adId ? adId : null}
                                            selectedServices={selectedAdditionalServices}
                                            onSelectionChange={setSelectedAdditionalServices}
                                            basePrice={parseFloat(currentService?.price || normalizedCurrentService?.price || 0)}
                                            currency={currentService?.currency || normalizedCurrentService?.currency || currency}
                                        />
                                    </div>
                                )
                            }
                            return null
                        })()}

                        {/* Форма контактов */}
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('yourName')} *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder={t('namePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('phone')} *
                                </label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('emailOptional')}
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder="your@email.com"
                                />
                            </div>

                            {/* Переключатель для гибридных услуг */}
                            {serviceType === 'hybrid' && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                        {t('executionType')} *
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="execution_type"
                                                value="onsite"
                                                checked={executionType === 'onsite'}
                                                onChange={(e) => setExecutionType(e.target.value)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{t('executionTypeOnsite')}</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="execution_type"
                                                value="offsite"
                                                checked={executionType === 'offsite'}
                                                onChange={(e) => setExecutionType(e.target.value)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{t('executionTypeOffsite')}</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Поля адреса для offsite бронирований */}
                            {finalExecutionType === 'offsite' && (
                                <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('address')} *
                                        </label>
                                        <div className="mt-1">
                                            <AddressAutocomplete
                                                value={form.address_line1}
                                                onChange={(address) => {
                                                    setForm({ ...form, address_line1: address })
                                                }}
                                                onAddressParsed={(parsed) => {
                                                    // Автоматически заполняем поля при выборе адреса из Google
                                                    setForm(prev => ({
                                                        ...prev,
                                                        address_line1: parsed.address_line1 || prev.address_line1,
                                                        city: parsed.city || prev.city,
                                                        state: parsed.state || prev.state,
                                                        zip: parsed.zip || prev.zip,
                                                    }))
                                                }}
                                                placeholder={t('addressPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t('city')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={form.city}
                                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                                className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="Los Angeles"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t('state')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={form.state}
                                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                                className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="CA"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('zipCode')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.zip}
                                            onChange={(e) => setForm({ ...form, zip: e.target.value })}
                                            className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                            placeholder="90001"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Промокод и расчёт скидки */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3 mt-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {t('discountsTitle')}
                                </h4>
                                {!promoExpanded ? (
                                    <button
                                        type="button"
                                        onClick={() => setPromoExpanded(true)}
                                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline w-full text-left"
                                    >
                                        {t('addPromoCode')}
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                {t('promoCodeLabel')}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPromoExpanded(false)
                                                    setPromoCode('')
                                                }}
                                                className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                            >
                                                {t('hidePromoCode')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-gray-100 px-3 py-2 uppercase"
                                            placeholder={t('promoCodePlaceholder')}
                                            autoComplete="off"
                                        />
                                    </div>
                                )}
                                {isClient && discountPreview?.loyalty_tier && (
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('loyaltyTierLabel')}{' '}
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {discountPreview.loyalty_tier.name}
                                        </span>
                                    </div>
                                )}
                                {discountPreviewLoading && (
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('discountLoading')}</div>
                                )}
                                {discountPreview && !discountPreviewLoading && (
                                    <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                                        <div className="flex justify-between gap-2">
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('subtotal')}</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatCurrency(discountPreview.subtotal, currency)}
                                            </span>
                                        </div>
                                        {discountPreview.discount_amount > 0 && (
                                            <div className="flex justify-between gap-2">
                                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('discount')}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    −{formatCurrency(discountPreview.discount_amount, currency)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-2 pt-1">
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('toPay')}</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {formatCurrency(discountPreview.final_total, currency)}
                                            </span>
                                        </div>
                                        {discountPreview.promo_error === 'validation' && discountPreview.promo_messages && (
                                            <p className="text-xs font-bold text-red-600 dark:text-red-400">
                                                {Object.values(discountPreview.promo_messages).flat().join(' ')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Шаг оплаты */}
                {paymentStep && paymentClientSecret && (
                    <div className="mt-4">
                        <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/35 dark:border-amber-900/40 p-3 mb-4">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {t('paymentRequired')}
                            </p>
                        </div>
                        {profile?.service?.cancellationFreeHours != null &&
                            profile?.service?.cancellationLateFeePercent != null && (
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                                    {t('cancellationPolicyNote', {
                                        hours: profile.service.cancellationFreeHours,
                                        percent: profile.service.cancellationLateFeePercent,
                                    })}
                                </p>
                            )}
                        <BookingPayment
                            bookingId={createdBookingId}
                            clientEmail={form.email || undefined}
                            clientSecret={paymentClientSecret}
                            amount={paymentAmount}
                            currency={currency?.toLowerCase() || 'usd'}
                            onSuccess={(paymentIntent) => {
                                setStripePaymentIntentStatus(paymentIntent?.status ?? null)
                                setPaymentSuccess(true)
                                setPaymentStep(false)
                            }}
                        />
                    </div>
                )}

                {/* Ошибка */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}
                </div>

                {/* Кнопки навигации - зафиксированы снизу (скрыты при оплате) */}
                {!paymentStep && (
                <div className="flex-shrink-0 p-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    {currentStep > 1 && (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(currentStep - 1)}
                            className={classNames(
                                "flex-1 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition font-medium",
                                currentStep === 3 ? "px-3.5 py-1.5 text-sm" : "px-4 py-2 text-sm"
                            )}
                        >
                            {t('back')}
                        </button>
                    )}
                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={() => {
                                // Определяем, это объявление или обычная услуга
                                const isAdvertisement = profile?.service?.id?.startsWith('ad_')
                                
                                if (currentStep === 1) {
                                    // Шаг 1: Выбор услуги
                                    // Если есть несколько услуг и не выбрана - блокируем (disabled)
                                    if (validServices.length > 1 && !selectedService) return
                                    
                                    // Если есть команда - переходим на шаг 2 (выбор специалиста)
                                    if (team.length > 0) {
                                        setCurrentStep(2)
                                    } else {
                                        // Если нет команды - переходим сразу на шаг 3 (дата/время)
                                        setCurrentStep(3)
                                    }
                                } else if (currentStep === 2) {
                                    // Шаг 2: Выбор специалиста
                                    // Для объявлений специалист обязателен
                                    if (isAdvertisement && !selectedMaster) {
                                        setError(t('errors.specialistRequired'))
                                        return
                                    }
                                    // Переходим на шаг 3 (дата/время)
                                    setCurrentStep(3)
                                }
                            }}
                            disabled={
                                (currentStep === 1 && validServices.length > 1 && !selectedService) ||
                                (currentStep === 2 && team.length > 0 && !selectedMaster && profile?.service?.id?.startsWith('ad_'))
                            }
                            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('next')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!form.name || !form.phone || !selectedTime || isSubmitting || 
                                (serviceType === 'hybrid' && !executionType) ||
                                (finalExecutionType === 'offsite' && (!form.address_line1 || !form.city || !form.state || !form.zip))}
                            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-sm transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? t('submitting') : t('confirm')}
                        </button>
                    )}
                </div>
                )}
            </div>
        </div>
    )

    // Рендерим модалку через portal напрямую в body для гарантии, что она выше всех элементов
    if (typeof window !== 'undefined') {
        return createPortal(modalContent, document.body)
    }
    
    return null
}

export default BookingDialog

