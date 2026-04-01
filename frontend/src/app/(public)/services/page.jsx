'use client'

import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import Container from '@/components/shared/Container'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import classNames from '@/utils/classNames'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import TextGenerateEffect from '@/app/(public-pages)/landing/components/TextGenerateEffect'
import { getCategories, getStates, getFilteredServices, getFeaturedServices } from '@/lib/api/marketplace'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useUserStore } from '@/store'
import { useLocation } from '@/hooks/useLocation'
import { StateSelect, CitySelect, LocationDisplay } from '@/components/location'
import Select from '@/components/ui/Select'
import { tagDictionary } from '@/mocks/tags'
import ServiceCard from '@/components/marketplace/ServiceCard'
import Skeleton from '@/components/ui/Skeleton'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { getCategoryName } from '@/utils/categoryUtils'
import {
    PiStarFill,
    PiArrowRight,
    PiSlidersDuotone,
    PiMagnifyingGlass,
    PiCaretDown,
    PiCaretUp,
    PiX,
    PiCalendarCheckDuotone,
    PiUsersDuotone,
    PiStarDuotone,
    PiMapPinFill,
} from 'react-icons/pi'
import { useTranslations, useLocale } from 'next-intl'

// Функция для получения переведенных диапазонов цен
const getPriceRanges = (t) => [
    { id: 'all', label: t('priceRanges.all') },
    { id: 'lt75', label: t('priceRanges.lt75'), max: 75 },
    { id: '75-125', label: t('priceRanges.75to125'), min: 75, max: 125 },
    { id: 'gt125', label: t('priceRanges.gt125'), min: 125 },
]

// Функция для получения переведенных опций рейтинга
const getRatingOptions = (t) => [
    { id: 4, label: t('ratingOptions.rating4') },
    { id: 4.5, label: t('ratingOptions.rating45') },
    { id: 4.8, label: t('ratingOptions.rating48') },
]

const quickTags = Object.entries(tagDictionary).map(([id, label]) => ({
    id,
    label,
}))

// Функция для получения бейджей из тегов
const getBadges = (tags, t) => {
    const badges = []
    if (tags.includes('premium')) {
        badges.push({ label: 'Premium', color: 'bg-yellow-500' })
    }
    if (tags.includes('mobile')) {
        badges.push({ label: t('quickFilters.mobile'), color: 'bg-black/70' })
    }
    if (tags.includes('russian-speaking')) {
        badges.push({ label: 'RU', color: 'bg-black/70' })
    }
    return badges
}

// Skeleton для карточек услуг
const ServiceCardSkeleton = () => {
    return (
        <>
            {/* Мобильная версия skeleton */}
            <div className="md:hidden w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden flex gap-3 py-3 px-3">
                <Skeleton variant="block" width={112} height={96} className="rounded-lg flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                    <Skeleton variant="block" width="40%" height={12} />
                    <Skeleton variant="block" width="80%" height={16} />
                    <Skeleton variant="block" width="60%" height={12} />
                    <Skeleton variant="block" width="50%" height={12} />
                </div>
            </div>
            {/* Десктопная версия skeleton */}
            <div className="hidden md:flex rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden flex-col h-full">
                <Skeleton variant="block" width="100%" height={192} />
                <div className="p-4 flex flex-col gap-2.5">
                    <Skeleton variant="block" width="30%" height={12} />
                    <Skeleton variant="block" width="80%" height={16} />
                    <Skeleton variant="block" width="60%" height={14} />
                    <div className="flex gap-1.5">
                        <Skeleton variant="block" width={60} height={24} className="rounded-full" />
                        <Skeleton variant="block" width={60} height={24} className="rounded-full" />
                    </div>
                    <Skeleton variant="block" width="40%" height={14} className="mt-auto" />
                </div>
            </div>
        </>
    )
}


// Компонент контента фильтров (используется и в сайдбаре, и в модалке)
const FiltersContent = ({
    search,
    setSearch,
    category,
    setCategory,
    handleSetCategory,
    priceFilter,
    setPriceFilter,
    ratingFilter,
    setRatingFilter,
    selectedTags,
    toggleTag,
    resultCount,
    onReset,
    categories = [],
    states = [],
}) => {
    const t = useTranslations('public.services')
    // Используем единый источник истины для локации
    const { state, city, setState, setCity, availableStates, availableCities, getStateName } = useLocation()
    const [showAllCategories, setShowAllCategories] = useState(false)
    const visibleCategories = showAllCategories ? categories : categories.slice(0, 10)
    const hiddenCount = Math.max(categories.length - 10, 0)
    
    return (
        <div className="p-4 space-y-4">
                {/* Search - более контрастный */}
                <div className="relative">
                    <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 text-sm h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-900"
                    />
                </div>

                {/* Категории - вертикально с мягкими цветами */}
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                        {t('categoriesTitle')}
                    </p>
                    <div className="space-y-1 min-h-[440px]">
                        <button
                            onClick={() => handleSetCategory ? handleSetCategory('all') : setCategory('all')}
                            className={classNames(
                                'w-full px-3 h-10 rounded-lg text-sm font-medium transition-colors text-left flex items-center',
                                // Всегда применяем border, чтобы высота не менялась
                                'border',
                                category === 'all'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent',
                            )}
                        >
                            {t('allServices')}
                        </button>
                        {visibleCategories.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSetCategory ? handleSetCategory(item.id) : setCategory(item.id)}
                                className={classNames(
                                    'w-full px-3 h-10 rounded-lg text-sm font-medium transition-colors text-left flex items-center',
                                    // Всегда применяем border, чтобы высота не менялась
                                    'border',
                                    category === item.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent',
                                )}
                            >
                                {getCategoryName(item, t)}
                            </button>
                        ))}
                        {hiddenCount > 0 && (
                            <button
                                onClick={() => setShowAllCategories(!showAllCategories)}
                                className="w-full px-3 h-10 rounded-lg text-sm font-medium transition-colors text-left flex items-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                                {showAllCategories ? t('collapse') : t('showMoreCategories', { count: hiddenCount })}
                            </button>
                        )}
                    </div>
                </div>

                {/* Разделитель */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Фильтры - вертикально */}
                <div className="space-y-3">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                            {t('state')}
                        </p>
                        <Select
                            instanceId="filters-state-select"
                            placeholder={t('allStates')}
                            options={[
                                { value: '', label: t('allStates') },
                                ...availableStates.map(state => ({
                                    value: state.id,
                                    label: state.name,
                                }))
                            ]}
                            value={state ? {
                                value: state,
                                label: getStateName(state),
                            } : { value: '', label: t('allStates') }}
                            onChange={(option) => {
                                const newValue = option?.value || ''
                                setState(newValue || null)
                            }}
                            isClearable={false}
                            isSearchable={false}
                            className="text-sm"
                            menuMaxHeight={200}
                        />
                    </div>

                    {state && state !== '' && state !== 'all' && availableCities.length > 0 && (
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                                {t('city')}
                            </p>
                            <Select
                                instanceId="filters-city-select"
                                placeholder={t('allCities')}
                                options={[
                                    { value: '', label: t('allCities') },
                                    ...availableCities.map(cityItem => ({
                                        value: cityItem.name,
                                        label: cityItem.name,
                                    }))
                                ]}
                                value={city && city !== '' ? {
                                    value: city,
                                    label: city,
                                } : { value: '', label: t('allCities') }}
                                onChange={(option) => {
                                    // Извлекаем значение города из option
                                    let newValue = ''
                                    if (option === null) {
                                        // Если option null - это "Все города"
                                        newValue = ''
                                    } else if (typeof option === 'string') {
                                        newValue = option
                                    } else if (option && typeof option === 'object') {
                                        // Проверяем value
                                        if (option.value !== undefined && option.value !== null && option.value !== '') {
                                            newValue = String(option.value)
                                        } 
                                        // Если value пустой или нет, проверяем label
                                        else if (option.label && option.label !== t('allCities')) {
                                            newValue = String(option.label)
                                        }
                                    }
                                    
                                    setCity(newValue || null)
                                }}
                                isClearable={false}
                                isSearchable={false}
                                className="text-sm"
                                menuMaxHeight={200}
                            />
                        </div>
                    )}

                    <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                            {t('budget')}
                        </p>
                        <Select
                            instanceId="filters-price-select"
                            placeholder={t('anyBudget')}
                            options={getPriceRanges(t).map((range) => ({
                                value: range.id,
                                label: range.label,
                            }))}
                            value={getPriceRanges(t).find((r) => r.id === priceFilter) ? {
                                value: priceFilter,
                                label: getPriceRanges(t).find((r) => r.id === priceFilter)?.label || '',
                            } : null}
                            onChange={(option) => setPriceFilter(option?.value || 'all')}
                            isClearable={false}
                            isSearchable={false}
                            className="text-sm"
                        />
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1.5">
                            {t('rating')}
                        </p>
                        <Select
                            instanceId="filters-rating-select"
                            placeholder={t('any')}
                            options={[
                                { value: '', label: t('any') },
                                ...getRatingOptions(t).map((option) => ({
                                    value: String(option.id),
                                    label: option.label,
                                }))
                            ]}
                            value={ratingFilter ? {
                                value: String(ratingFilter),
                                label: getRatingOptions(t).find((r) => r.id === ratingFilter)?.label || '',
                            } : { value: '', label: t('any') }}
                            onChange={(option) => setRatingFilter(option?.value && option.value !== '' ? Number(option.value) : null)}
                            isClearable={false}
                            isSearchable={false}
                            className="text-sm"
                        />
                    </div>
                </div>

                {/* Разделитель */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Особенности - яркие pill-chips */}
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                        {t('features')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {quickTags.map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() => toggleTag(tag.id)}
                                className={classNames(
                                    'px-2.5 py-1 rounded-full text-xs font-medium transition',
                                    selectedTags.includes(tag.id)
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                                )}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    {t('found')}: <strong className="text-gray-900 dark:text-white">{resultCount}</strong>
                </p>
                <Button
                    variant="plain"
                    size="sm"
                    className="w-full gap-2 text-sm h-10 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center"
                    onClick={onReset}
                >
                    <PiSlidersDuotone />
                    {t('resetFilters')}
                </Button>
            </div>
        </div>
    )
}

// Модалка для фильтров на мобильных
const FiltersModal = ({
    isOpen,
    onClose,
    search,
    setSearch,
    category,
    setCategory,
    handleSetCategory,
    priceFilter,
    setPriceFilter,
    ratingFilter,
    setRatingFilter,
    selectedTags,
    toggleTag,
    resultCount,
    onReset,
    categories = [],
    states = [],
}) => {
    const t = useTranslations('public.services')
    // Используем единый источник истины для локации
    const { state, city, setState, setCity, availableStates, availableCities, getStateName } = useLocation()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-[9999] lg:hidden">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50"
                onClick={onClose}
            />
            {/* Modal - центрированная */}
            <div 
                className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto">
                    <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('filters')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
                        >
                            <PiX className="text-gray-500 text-xl" />
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 min-h-0 booking-modal-scroll">
                        <div className="min-w-0">
                            <FiltersContent
                                search={search}
                                setSearch={setSearch}
                                category={category}
                                setCategory={setCategory}
                                handleSetCategory={handleSetCategory}
                                priceFilter={priceFilter}
                                setPriceFilter={setPriceFilter}
                                ratingFilter={ratingFilter}
                                setRatingFilter={setRatingFilter}
                                selectedTags={selectedTags}
                                toggleTag={toggleTag}
                                resultCount={resultCount}
                                onReset={onReset}
                                categories={categories}
                                states={states}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // Рендерим модалку через Portal напрямую в body для Safari
    return createPortal(modalContent, document.body)
}

// Сайдбар с фильтрами для десктопа
const FiltersSection = ({
    search,
    setSearch,
    category,
    setCategory,
    handleSetCategory,
    priceFilter,
    setPriceFilter,
    ratingFilter,
    setRatingFilter,
    selectedTags,
    toggleTag,
    resultCount,
    onReset,
    categories = [],
    states = [],
}) => {
    return (
        <div className="hidden lg:block rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-md">
            <FiltersContent
                search={search}
                setSearch={setSearch}
                category={category}
                setCategory={setCategory}
                handleSetCategory={handleSetCategory}
                priceFilter={priceFilter}
                setPriceFilter={setPriceFilter}
                ratingFilter={ratingFilter}
                setRatingFilter={setRatingFilter}
                selectedTags={selectedTags}
                toggleTag={toggleTag}
                resultCount={resultCount}
                onReset={onReset}
                categories={categories}
                states={states}
            />
        </div>
    )
}


export default function ServicesPage() {
    const t = useTranslations('public.services')
    const locale = useLocale()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [heroCategory, setHeroCategory] = useState(null)
    const [priceFilter, setPriceFilter] = useState('all')
    const [ratingFilter, setRatingFilter] = useState(null)
    const [selectedTags, setSelectedTags] = useState([])
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [visibleServicesCount, setVisibleServicesCount] = useState(16)
    
    // Используем единый источник истины для локации
    const location = useLocation()
    const { state, city, setState, setCity, getStateName, reset: resetLocation, availableStates = [] } = location
    
    // Получаем данные пользователя для применения настроек по умолчанию
    // Не блокируем загрузку страницы, если пользователь не авторизован
    const { data: user, refetch: refetchUser } = useCurrentUser() // Загружается только если авторизован, не блокирует страницу
    const { user: userStore } = useUserStore()
    const displayUser = user || userStore
    
    // Локация теперь управляется через LocationProvider - нет необходимости в локальной синхронизации
    
    // Быстрые фильтры
    const [quickFilters, setQuickFilters] = useState({
        rating45: false,
        availableSlots: false,
        mobile: false,
        openNow: false,
    })
    
    // Данные из API
    const [categories, setCategories] = useState([])
    const [states, setStates] = useState([])
    const [services, setServices] = useState([])
    const [featuredServices, setFeaturedServices] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const featuredRef = useRef(null)
    const listingsRef = useRef(null)
    const sidebarContainerRef = useRef(null)
    const layoutSectionRef = useRef(null)
    
    // Загрузка данных
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                // Применяем фильтры
                const filters = {}
                
                // Используем единый источник истины из LocationProvider
                if (state && state !== '' && state !== 'all') {
                    filters.state = state
                    console.log('🔍 Applying state filter to API:', state)
                }
                
                if (city && city !== '' && city !== 'all') {
                    filters.city = city
                    console.log('🔍 Applying city filter:', city)
                }
                
                const [categoriesData, statesData, servicesData, featuredData] = await Promise.all([
                    getCategories(),
                    getStates(),
                    getFilteredServices(filters),
                    getFeaturedServices(3, state || undefined, city || undefined),
                ])
                setCategories(categoriesData)
                setStates(statesData)
                setServices(servicesData)
                setFeaturedServices(featuredData)
                
                // Отладочный лог для проверки фильтрации
                if (state) {
                    console.log('📊 Loaded services with state filter:', {
                        state,
                        servicesCount: servicesData.length,
                        sampleServices: servicesData.slice(0, 3).map(s => ({
                            name: s.name,
                            state: s.state,
                            city: s.city
                        }))
                    })
                } else {
                    console.log('📊 Loaded services WITHOUT state filter. state:', state)
                }
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [state, city]) // Загружаем только при изменении локации из единого источника истины

    // Обработчик смены категории (упрощенный, без костылей - scroll anchoring отключен на main)
    const handleSetCategory = (next) => {
        setCategory(next)
        // При выборе конкретной категории обновляем heroCategory
        if (next !== 'all') {
            setHeroCategory(next)
        }
        // При 'all' heroCategory НЕ трогаем - hero остаётся в том же виде
    }

    // Блокировка скролла при открытой модалке (особенно важно для мобильных)
    useEffect(() => {
        if (isFiltersOpen) {
            // Сохраняем текущую позицию скролла
            const scrollY = window.scrollY
            // Блокируем скролл на body и html
            document.body.style.overflow = 'hidden'
            document.body.style.position = 'fixed'
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = '100%'
            document.documentElement.style.overflow = 'hidden'
        } else {
            // Восстанавливаем скролл
            const scrollY = document.body.style.top
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            document.documentElement.style.overflow = ''
            // Восстанавливаем позицию скролла
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1)
            }
        }
        return () => {
            // Очистка при размонтировании
            const scrollY = document.body.style.top
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.width = ''
            document.documentElement.style.overflow = ''
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1)
            }
        }
    }, [isFiltersOpen])

    // Форматирование списка услуг
    const formatListing = (service) => {
        const categoryObj = categories.find((cat) => cat.id === service.group)
        const baseCategory = categoryObj ? getCategoryName(categoryObj, t) : (service.category ?? t('service', { ns: 'components.serviceCard' }))
        // Для объявлений бэкенд уже возвращает полный URL, не нужно нормализовать
        // Для обычных услуг может быть относительный путь, нормализуем только их
        const isAdvertisement = service.id && String(service.id).startsWith('ad_')
        const rawImageUrl = service.imageUrl || service.image || service.businessImageUrl || null
        
        let imageUrl = rawImageUrl
        // Нормализуем только если это не объявление и не полный URL
        if (rawImageUrl && !rawImageUrl.includes('placeholder')) {
            // Проверяем, содержит ли URL IP адрес или localhost (даже если это полный URL)
            const hasIpOrLocalhost = /http:\/\/\d+\.\d+\.\d+\.\d+/.test(rawImageUrl) || 
                                     rawImageUrl.includes('localhost') || 
                                     rawImageUrl.includes('127.0.0.1')
            
            if (isAdvertisement) {
                // Для объявлений бэкенд уже вернул полный URL, но если это IP адрес, нормализуем
                if (hasIpOrLocalhost) {
                    // Нормализуем URL с IP адресом через Next.js proxy
                    imageUrl = normalizeImageUrl(rawImageUrl)
                } else if (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')) {
                    // Если это полный URL без IP адреса, используем как есть
                    imageUrl = rawImageUrl
                } else {
                    // Fallback: нормализуем если бэкенд вернул относительный путь
                    imageUrl = normalizeImageUrl(rawImageUrl)
                }
            } else {
                // Для обычных услуг нормализуем относительные пути и URL с IP адресами
                if (hasIpOrLocalhost || (!rawImageUrl.startsWith('http://') && !rawImageUrl.startsWith('https://'))) {
                    imageUrl = normalizeImageUrl(rawImageUrl)
                } else {
                    // Если это полный URL без IP адреса, используем как есть
                    imageUrl = rawImageUrl
                }
            }
        } else {
            imageUrl = null
        }
        
        return {
            ...service,
            groupLabel: baseCategory,
            category: baseCategory,
            imageUrl: imageUrl,
        }
    }

    const formattedListings = useMemo(
        () => services.map(formatListing),
        [services, categories],
    )

    // Фильтрация услуг
    const filteredListings = useMemo(() => {
        if (isLoading) return []
        
        return formattedListings.filter((listing) => {
            const matchesSearch =
                listing.name.toLowerCase().includes(search.toLowerCase()) ||
                listing.category
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                listing.city.toLowerCase().includes(search.toLowerCase())

            const matchesCategory =
                category === 'all' || String(listing.group) === String(category)

            // Используем единый источник истины для локации
            const matchesState = (() => {
                // Если фильтр не установлен - показываем все
                if (!state || state === '' || state === 'all') {
                    return true
                }
                
                // Если у услуги нет штата - не показываем (если фильтр установлен)
                if (!listing.state || listing.state === '') {
                    return false
                }
                
                // Прямое совпадение (оба ID или оба названия)
                if (listing.state === state) {
                    return true
                }
                
                // Проверяем, если state это ID, а listing.state это название
                if (availableStates && availableStates.length > 0) {
                    const stateById = availableStates.find(s => s.id === state)
                    if (stateById && listing.state === stateById.name) {
                        return true
                    }
                    
                    // Проверяем, если listing.state это ID, а state это название (на всякий случай)
                    const listingStateById = availableStates.find(s => s.id === listing.state)
                    if (listingStateById && state === listingStateById.name) {
                        return true
                    }
                }
                
                // Дополнительная проверка: может быть listing.state это полное название, а state это ID
                // Или наоборот - listing.state это ID, а state это полное название
                // Проверяем через сравнение без учета регистра
                if (listing.state.toLowerCase() === state.toLowerCase()) {
                    return true
                }
                
                // Если ничего не совпало - не показываем
                return false
            })()

            const matchesCity =
                !city || city === '' || city === 'all' || 
                !listing.city || 
                listing.city.toLowerCase().includes(city.toLowerCase())

            const matchesPrice = (() => {
                const range = getPriceRanges(t).find((p) => p.id === priceFilter)
                if (!range || range.id === 'all') return true
                if (range.min && listing.priceValue < range.min) return false
                if (range.max && listing.priceValue > range.max) return false
                return true
            })()

            // Используем quickFilters.rating45 если активен, иначе ratingFilter
            const activeRatingFilter = quickFilters.rating45 ? 4.5 : ratingFilter
            const matchesRating =
                !activeRatingFilter || listing.rating >= Number(activeRatingFilter)

            const matchesTags =
                selectedTags.length === 0 ||
                selectedTags.every((tag) => listing.tags.includes(tag))

            // Быстрые фильтры
            const matchesQuickFilters = 
                (!quickFilters.mobile || listing.tags.includes('mobile')) &&
                (!quickFilters.availableSlots || true) // Пока нет данных о слотах
                // (!quickFilters.openNow || true) // Пока нет данных о времени работы

            return (
                matchesSearch &&
                matchesCategory &&
                matchesState &&
                matchesCity &&
                matchesPrice &&
                matchesRating &&
                matchesTags &&
                matchesQuickFilters
            )
        })
    }, [
        formattedListings,
        search,
        category,
        state,
        city,
        availableStates,
        priceFilter,
        ratingFilter,
        quickFilters,
        selectedTags,
        isLoading,
    ])
    
    // Ограничиваем количество отображаемых услуг для предотвращения прыжков
    const visibleListings = useMemo(() => {
        return filteredListings.slice(0, visibleServicesCount)
    }, [filteredListings, visibleServicesCount])
    
    // Фиксированное количество слотов для десктопной сетки (для стабильной высоты)
    const DESKTOP_SLOT_COUNT = 16
    const desktopPlaceholdersCount = useMemo(() => {
        if (isLoading || filteredListings.length === 0) return 0
        return Math.max(0, DESKTOP_SLOT_COUNT - visibleListings.length)
    }, [visibleListings.length, filteredListings.length, isLoading])
    
    // Сбрасываем счетчик при изменении фильтров (используем единый источник истины для локации)
    useEffect(() => {
        setVisibleServicesCount(16)
    }, [category, state, city, priceFilter, ratingFilter, selectedTags, search, quickFilters])
    
    // Форматирование featured services
    const formattedFeaturedServices = useMemo(
        () => featuredServices.map(formatListing),
        [featuredServices, categories],
    )
    const hasFeatured = formattedFeaturedServices.length > 0

    // Убрали динамический расчет sidebarOffset - используем фиксированную позицию
    // Это предотвращает прыжки блока фильтров при изменении категории

    const toggleTag = (tag) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
        )
    }

    const resetFilters = () => {
        setSearch('')
        handleSetCategory('all')
        setPriceFilter('all')
        setRatingFilter(null)
        setSelectedTags([])
        setQuickFilters({
            rating45: false,
            availableSlots: false,
            mobile: false,
            openNow: false,
        })
        
        // Сброс локации через LocationProvider
        resetLocation()
    }
    
    // Локация теперь управляется через LocationProvider - нет необходимости в локальных функциях

    return (
        <main className="px-4 lg:px-0 text-base bg-white dark:bg-gray-900 overflow-x-hidden pt-20 md:pt-24 [overflow-anchor:none]">
            {/* Hero Section - компактнее с быстрыми категориями */}
            <section className="relative overflow-x-hidden pt-6 pb-6 md:pt-8 md:pb-10 lg:pb-12 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
                <div
                    className="absolute inset-0 pointer-events-none select-none opacity-50"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='50' height='50' fill='none' stroke='${'#eaeaea'}'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
                    }}
                ></div>
                <Container className="max-w-7xl">
                    <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-12 lg:col-start-1 w-full min-w-0">
                            <div className="text-left space-y-3 md:space-y-4 w-full min-w-0">
                                <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium">
                                    REXTEN Marketplace
                                </p>
                                <TextGenerateEffect
                                    key={`hero-title-${locale}`}
                                    wordClassName="text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight break-words"
                                    words={t('heroTitle')}
                                    wordsCallbackClass={({ word }) => {
                                        // Для русского: "профессионала" и "США"
                                        if (word === 'профессионала' || word === 'professional') {
                                            return 'bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent'
                                        }
                                        if (word === 'США' || word === 'USA') {
                                            return 'bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent'
                                        }
                                        return 'text-gray-900 dark:text-white'
                                    }}
                                />
                                <motion.p
                                    initial={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="text-xs md:text-base lg:text-lg text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 md:line-clamp-none break-words"
                                >
                                    {t('heroDescription')}
                                </motion.p>
                                
                                {/* Мини-статистика */}
                                <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 pt-2">
                                    <div className="flex items-center gap-2 text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            <PiCalendarCheckDuotone className="text-lg sm:text-xl" />
                                        </div>
                                        <span className="font-semibold whitespace-nowrap">{t('statistics.bookings')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                            <PiUsersDuotone className="text-lg sm:text-xl" />
                                        </div>
                                        <span className="font-semibold whitespace-nowrap">{t('statistics.masters')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                            <PiStarDuotone className="text-lg sm:text-xl" />
                                        </div>
                                        <span className="font-semibold whitespace-nowrap">{t('statistics.rating')}</span>
                                    </div>
                                </div>
                                
                                {/* Блок локации */}
                                <div className="pt-4 md:pt-5">
                                    <div className="flex flex-col gap-3 sm:gap-4">
                                        <div className="flex items-center gap-2">
                                            <PiMapPinFill className="text-blue-600 dark:text-blue-400 text-base sm:text-lg" />
                                            <span className="text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 font-medium">
                                                {t('showingFor')}:
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
                                            <div className="w-full sm:w-auto sm:flex-1 sm:min-w-0 sm:max-w-[200px]">
                                                <div className="w-full">
                                                    <Select
                                                        instanceId="hero-state-select"
                                                        placeholder={t('allStates')}
                                                        options={[
                                                            { value: '', label: t('allStates') },
                                                            ...availableStates.map(stateItem => ({
                                                                value: stateItem.id,
                                                                label: stateItem.name,
                                                            }))
                                                        ]}
                                                        value={state ? {
                                                            value: state,
                                                            label: getStateName(state),
                                                        } : { value: '', label: t('allStates') }}
                                                        onChange={(option) => {
                                                            const newValue = option?.value || ''
                                                            setState(newValue || null)
                                                        }}
                                                        isClearable={false}
                                                        isSearchable={false}
                                                        className="text-xs sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-auto sm:flex-1 sm:min-w-0 sm:max-w-[200px]">
                                                <div className="w-full">
                                                    <CitySelect
                                                        instanceId="services-city-select"
                                                        placeholder={t('cityOptional')}
                                                        value={city}
                                                        className="text-xs sm:text-sm"
                                                        isSearchable={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {(state || city) && (
                                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                                <PiMapPinFill className="text-base" />
                                                <LocationDisplay separator=", " />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Быстрые категории - фиксированная высота для предотвращения прыжков */}
                                {categories.length > 0 && (
                                    <div className="h-[52px] md:h-[60px] pt-2 md:pt-4 flex items-center">
                                        <div
                                            className={`
                                                w-full flex items-center gap-2 md:gap-3
                                                overflow-x-auto max-w-full
                                                table-scroll
                                            `}
                                        >
                                            {categories.slice(0, 4).map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setHeroCategory(cat.id) // только визуал hero
                                                        setCategory(cat.id) // фильтр списка
                                                    }}
                                                    className={classNames(
                                                        'px-4 md:px-6 h-10 md:h-11 rounded-full text-sm md:text-base font-medium transition-colors',
                                                        'border-2 flex items-center justify-center',
                                                        'flex-shrink-0 whitespace-nowrap',
                                                        // Всегда используем одинаковый shadow, чтобы высота не менялась
                                                        'shadow-sm',
                                                        heroCategory === cat.id
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                                    )}
                                                >
                                                    {getCategoryName(cat, t)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            <section ref={layoutSectionRef} className="pb-16 overflow-x-hidden">
                <Container className="max-w-7xl px-0 md:px-4">
                    {/* Кнопка фильтров для мобильных */}
                    <div className="lg:hidden mb-4">
                        <button
                            onClick={() => setIsFiltersOpen(true)}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition"
                        >
                            <div className="flex items-center gap-2">
                                <PiSlidersDuotone className="text-gray-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {t('filters')}
                                </span>
                                {selectedTags.length > 0 || search || category !== 'all' || state || city || priceFilter !== 'all' || ratingFilter ? (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs">
                                        {[selectedTags.length, search ? 1 : 0, category !== 'all' ? 1 : 0, state ? 1 : 0, city ? 1 : 0, priceFilter !== 'all' ? 1 : 0, ratingFilter ? 1 : 0].reduce((a, b) => a + b, 0)}
                                    </span>
                                ) : null}
                            </div>
                            <PiCaretDown className="text-gray-500" />
                        </button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-12 items-start">
                        {/* Фильтр слева - только для десктопа */}
                        <div
                            ref={sidebarContainerRef}
                            className="hidden lg:block lg:col-span-3 lg:sticky lg:top-6 self-start"
                        >
                            <FiltersSection
                                search={search}
                                setSearch={setSearch}
                                category={category}
                                setCategory={setCategory}
                                handleSetCategory={handleSetCategory}
                                priceFilter={priceFilter}
                                setPriceFilter={setPriceFilter}
                                ratingFilter={ratingFilter}
                                setRatingFilter={setRatingFilter}
                                selectedTags={selectedTags}
                                toggleTag={toggleTag}
                                resultCount={filteredListings.length}
                                onReset={resetFilters}
                                categories={categories}
                                states={states}
                            />
                        </div>

                        {/* Карточки справа */}
                        <div className="lg:col-span-9 w-full min-w-0 [overflow-anchor:none]">
                            {hasFeatured && (
                                <>
                                    <div ref={featuredRef} className="mb-6 md:mb-8">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                                                Рекомендуемые
                                            </h2>
                                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                Реклама
                                            </span>
                                        </div>
                                        {/* Горизонтальный скролл на мобильных, сетка на десктопе */}
                                        <div className="md:hidden overflow-x-auto -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            <div className="flex gap-4">
                                                {formattedFeaturedServices.map((listing) => (
                                                    <div key={listing.id} className="flex-shrink-0 w-[260px]">
                                                        <ServiceCard 
                                                            service={listing} 
                                                            variant="featured"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {formattedFeaturedServices.map((listing) => (
                                                <ServiceCard 
                                                    key={listing.id} 
                                                    service={listing} 
                                                    variant="featured"
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Разделитель */}
                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-6 md:my-8"></div>
                                </>
                            )}

                            <div ref={listingsRef}>
                                {/* Фильтры-чипы над списком */}
                                <div className="mb-4">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 md:gap-3 mb-3">
                                        <span className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                                            {t('quickFilters.title')}:
                                        </span>
                                        <button
                                            onClick={() => setQuickFilters(prev => ({ ...prev, rating45: !prev.rating45 }))}
                                            className={classNames(
                                                'px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-medium transition whitespace-nowrap',
                                                quickFilters.rating45
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            )}
                                        >
                                            ⭐ 4.5+
                                        </button>
                                        <button
                                            onClick={() => setQuickFilters(prev => ({ ...prev, availableSlots: !prev.availableSlots }))}
                                            className={classNames(
                                                'px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-medium transition whitespace-nowrap',
                                                quickFilters.availableSlots
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            )}
                                        >
                                            <span className="hidden sm:inline">{t('quickFilters.availableSlots')}</span>
                                            <span className="sm:hidden">{t('quickFilters.availableSlotsShort')}</span>
                                        </button>
                                        <button
                                            onClick={() => setQuickFilters(prev => ({ ...prev, mobile: !prev.mobile }))}
                                            className={classNames(
                                                'px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-medium transition whitespace-nowrap',
                                                quickFilters.mobile
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            )}
                                        >
                                            {t('quickFilters.mobile')}
                                        </button>
                                        <button
                                            onClick={() => setQuickFilters(prev => ({ ...prev, openNow: !prev.openNow }))}
                                            className={classNames(
                                                'px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs md:text-sm font-medium transition whitespace-nowrap',
                                                quickFilters.openNow
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            )}
                                        >
                                            <span className="hidden sm:inline">{t('quickFilters.openNow')}</span>
                                            <span className="sm:hidden">{t('quickFilters.openNowShort')}</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-500 dark:text-white/70 text-xs">
                                        <p>
                                            {t('foundOffers', { count: filteredListings.length })}
                                        </p>
                                    </div>
                                </div>

                                {/* Мобильная версия - список карточек */}
                                <div className="md:hidden space-y-3 w-full">
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, idx) => (
                                            <ServiceCardSkeleton key={idx} />
                                        ))
                                    ) : filteredListings.length === 0 ? (
                                        <div className="py-16 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                            <div className="flex flex-col items-center gap-3">
                                                <PiMagnifyingGlass className="text-4xl text-gray-400 dark:text-gray-500" />
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                        {t('noServicesFound')}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        {t('tryChangeFilters')}
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={resetFilters}
                                                    >
                                                        {t('resetFilters')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {visibleListings.map((listing) => (
                                                <ServiceCard key={listing.id} service={listing} variant="compact" />
                                            ))}
                                            {filteredListings.length > visibleServicesCount && (
                                                <div className="mt-6 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="md"
                                                        onClick={() => setVisibleServicesCount(prev => prev + 16)}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        {t('showMore', { remaining: filteredListings.length - visibleServicesCount })}
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Десктопная версия - сетка карточек */}
                                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {isLoading ? (
                                        Array.from({ length: 8 }).map((_, idx) => (
                                            <ServiceCardSkeleton key={idx} />
                                        ))
                                    ) : filteredListings.length === 0 ? (
                                        <div className="col-span-full py-16 text-center border border-dashed border-gray-200 dark:border-white/20 rounded-xl">
                                            <div className="flex flex-col items-center gap-3">
                                                <PiMagnifyingGlass className="text-4xl text-gray-400 dark:text-gray-500" />
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                                        {t('noServicesFound')}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                        {t('tryChangeFilters')}
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={resetFilters}
                                                    >
                                                        {t('resetFilters')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Реальные карточки */}
                                            {visibleListings.map((listing) => (
                                                <ServiceCard key={listing.id} service={listing} />
                                            ))}
                                            
                                            {/* Плейсхолдеры для фиксированной высоты сетки */}
                                            {desktopPlaceholdersCount > 0 &&
                                                Array.from({ length: desktopPlaceholdersCount }).map((_, idx) => (
                                                    <div
                                                        key={`placeholder-${idx}`}
                                                        className="invisible pointer-events-none"
                                                    >
                                                        <ServiceCardSkeleton />
                                                    </div>
                                                ))}
                                            
                                            {/* Кнопка "Показать ещё" */}
                                            {filteredListings.length > visibleServicesCount && (
                                                <div className="col-span-full mt-8 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="md"
                                                        onClick={() => setVisibleServicesCount(prev => prev + 16)}
                                                    >
                                                        {t('showMore', { remaining: filteredListings.length - visibleServicesCount })}
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Модалка фильтров для мобильных */}
            <FiltersModal
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                search={search}
                setSearch={setSearch}
                category={category}
                setCategory={setCategory}
                handleSetCategory={handleSetCategory}
                priceFilter={priceFilter}
                setPriceFilter={setPriceFilter}
                ratingFilter={ratingFilter}
                setRatingFilter={setRatingFilter}
                selectedTags={selectedTags}
                toggleTag={toggleTag}
                resultCount={filteredListings.length}
                onReset={resetFilters}
                categories={categories}
                states={states}
            />

        </main>
    )
}


