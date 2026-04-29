'use client'

import { Suspense, useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import classNames from '@/utils/classNames'
import { motion } from 'framer-motion'
import {
    getCategories,
    getStates,
    getFilteredServices,
    getFeaturedServices,
    postMarketplaceHasSlotsForDate,
} from '@/lib/api/marketplace'
import { useLocation } from '@/hooks/useLocation'
import { CitySelect } from '@/components/location'
import Select from '@/components/ui/Select'
import Calendar from '@/components/ui/DatePicker/Calendar'
import dayjs from 'dayjs'
import { tagKeys, getTagLabel } from '@/mocks/tags'
import ServiceCard from '@/components/marketplace/ServiceCard'
import Skeleton from '@/components/ui/Skeleton'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { getCategoryName } from '@/utils/categoryUtils'
import {
    PiSlidersDuotone,
    PiMagnifyingGlass,
    PiCaretDown,
    PiX,
    PiMapPin,
    PiCalendarBlank,
    PiSquaresFour,
    PiListBullets,
    PiLightningBold,
    PiPhoneSlash,
    PiShieldCheck,
    PiStarFill,
    PiClockCountdown,
    PiCreditCard,
    PiBroom,
    PiCar,
    PiSparkle,
    PiScissors,
    PiFlower,
    PiHammer,
    PiLightning,
    PiDrop,
    PiWind,
    PiTree,
    PiSnowflake,
    PiBaby,
    PiHeart,
    PiDog,
    PiStudent,
    PiTranslate,
    PiMusicNote,
    PiCamera,
    PiVideo,
    PiConfetti,
    PiForkKnife,
    PiTruck,
    PiPackage,
    PiDesktop,
    PiCode,
    PiGavel,
    PiCalculator,
    PiArticle,
    PiFileText,
    PiStethoscope,
    PiPersonSimpleRun,
    PiTShirt,
    PiWashingMachine,
    PiNeedle,
    PiTag,
    PiPaintBrush,
} from 'react-icons/pi'
import { useTranslations, useLocale } from 'next-intl'
import { PUBLIC_MARKETPLACE_CONTENT_MAX } from '@/constants/public-marketplace-layout.constant'

/** Компактный пикер локации: одна кнопка-триггер → дроп с выбором штата и города */
function HeroLocationPicker({ t, availableStates, state, setState, city, getStateName }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const { availableCities, setCity } = useLocation()

    useEffect(() => {
        if (!open) return
        const handle = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [open])

    const displayValue = useMemo(() => {
        if (city && state) return `${city}, ${getStateName(state)}`
        if (state) return getStateName(state)
        return null
    }, [city, state, getStateName])

    const cityOptions = useMemo(
        () => availableCities.map((c) => ({ value: c.name, label: c.name })),
        [availableCities],
    )
    const stateOptions = useMemo(
        () => [
            { value: '', label: t('allStates') },
            ...availableStates.map((s) => ({ value: s.id, label: s.name })),
        ],
        [availableStates, t],
    )

    return (
        <div ref={ref} className="relative min-w-0 w-full">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-1 text-left text-sm font-bold leading-snug transition hover:opacity-80"
            >
                <span className={classNames('min-w-0 truncate', displayValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500')}>
                    {displayValue || t('heroWhereCityExample')}
                </span>
                <PiCaretDown className={classNames('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-[200] mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-gray-800">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('allStates')}</p>
                    <Select
                        instanceId="hero-loc-state"
                        options={stateOptions}
                        value={state ? { value: state, label: getStateName(state) } : { value: '', label: t('allStates') }}
                        onChange={(opt) => {
                            setState(opt?.value || null)
                            setCity(null)
                        }}
                        isClearable={false}
                        isSearchable
                        className="mb-2 text-sm"
                    />
                    {state && (
                        <>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('cityOptional')}</p>
                            <Select
                                instanceId="hero-loc-city"
                                options={[{ value: '', label: t('cityOptional') }, ...cityOptions]}
                                value={city ? { value: city, label: city } : null}
                                onChange={(opt) => {
                                    setCity(opt?.value || null)
                                    setOpen(false)
                                }}
                                isClearable={false}
                                isSearchable
                                className="text-sm"
                                placeholder={t('cityOptional')}
                            />
                        </>
                    )}
                    {!state && (
                        <p className="mt-1 text-xs text-gray-400">{t('heroWhereCityExample')}</p>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * Пикер даты:
 *  - md+: кастомная кнопка + Calendar из UI-кита в дропдауне (как в бизнес-админке)
 *  - < md: кнопка-триггер + нативный <input type="date">
 */
const HERO_CALENDAR_WIDTH = 320

function HeroDatePicker({ value, onChange, placeholder }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const dropdownRef = useRef(null)
    const nativeInputRef = useRef(null)
    const [portalPos, setPortalPos] = useState({ top: 0, left: 0 })

    const updatePortalPosition = useCallback(() => {
        const el = ref.current
        if (!el || typeof window === 'undefined') return
        const rect = el.getBoundingClientRect()
        const gutter = 8
        const left = Math.min(
            rect.right - HERO_CALENDAR_WIDTH,
            Math.max(gutter, window.innerWidth - HERO_CALENDAR_WIDTH - gutter),
        )
        setPortalPos({ top: rect.bottom + gutter, left })
    }, [])

    useLayoutEffect(() => {
        if (!open) return
        updatePortalPosition()
    }, [open, updatePortalPosition])

    useEffect(() => {
        if (!open) return
        const handle = (e) => {
            if (ref.current?.contains(e.target)) return
            if (dropdownRef.current?.contains(e.target)) return
            setOpen(false)
        }
        const onScrollOrResize = () => updatePortalPosition()
        document.addEventListener('mousedown', handle)
        window.addEventListener('scroll', onScrollOrResize, true)
        window.addEventListener('resize', onScrollOrResize)
        return () => {
            document.removeEventListener('mousedown', handle)
            window.removeEventListener('scroll', onScrollOrResize, true)
            window.removeEventListener('resize', onScrollOrResize)
        }
    }, [open, updatePortalPosition])

    const dateValue = useMemo(() => {
        if (!value) return null
        const d = dayjs(value)
        return d.isValid() ? d.toDate() : null
    }, [value])

    const displayValue = useMemo(() => {
        if (!dateValue) return null
        return dayjs(dateValue).format('D MMM YYYY')
    }, [dateValue])

    const handleCalendarChange = useCallback((date) => {
        onChange(date ? dayjs(date).format('YYYY-MM-DD') : '')
        setOpen(false)
    }, [onChange])

    const openNative = () => {
        const input = nativeInputRef.current
        if (!input) return
        if (typeof input.showPicker === 'function') {
            try { input.showPicker() } catch { input.focus() }
        } else {
            input.focus()
        }
    }

    return (
        <div ref={ref} className="relative min-w-0 w-full">
            {/* Кнопка-триггер (общая для обоих вариантов) */}
            <button
                type="button"
                onClick={() => {
                    if (window.innerWidth < 768) {
                        openNative()
                    } else {
                        setOpen((v) => !v)
                    }
                }}
                className="flex w-full items-center justify-between gap-1 text-left text-sm font-bold leading-snug transition hover:opacity-80"
            >
                <span className={classNames('min-w-0 truncate', displayValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500')}>
                    {displayValue || placeholder}
                </span>
                <PiCaretDown className={classNames('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>

            {/* Нативный инпут для мобильных (скрыт визуально) */}
            <input
                ref={nativeInputRef}
                type="date"
                value={value || ''}
                min={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => onChange(e.target.value)}
                className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-hidden
            />

            {/* Десктоп: портал + fixed — не уходит под следующую секцию и не режется overflow */}
            {open &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-30 w-[320px] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-gray-800"
                        style={{ top: portalPos.top, left: portalPos.left }}
                    >
                        <Calendar
                            value={dateValue}
                            onChange={handleCalendarChange}
                            minDate={new Date()}
                        />
                    </div>,
                    document.body,
                )}
        </div>
    )
}

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

/** Панель фильтров: светлая / тёмная тема — чипы и селекты одной системы поверхностей */
const CATALOG_CHIP_BASE =
    'inline-flex items-center rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition'
const CATALOG_CHIP_OFF =
    'border-gray-200 bg-white text-gray-900 hover:border-gray-300 dark:border-white/10 dark:bg-gray-800 dark:text-gray-100 dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)] dark:hover:border-white/20 dark:hover:bg-gray-700'
const CATALOG_CHIP_ON =
    'border-primary bg-primary/5 text-primary dark:border-primary dark:bg-primary/15 dark:text-primary dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]'

const CATALOG_SELECT_WRAP =
    'min-w-0 [&_.select-control]:!min-h-[42px] [&_.select-control]:!rounded-xl [&_.select-control]:!border-gray-200 [&_.select-control]:!bg-white [&_.select-control]:!shadow-sm [&_.select-control.select-control-focused]:!bg-white [&_.select-single-value]:!text-sm [&_.select-single-value]:!font-bold [&_.select-single-value]:!text-gray-900 [&_.select-placeholder]:!text-sm [&_.select-placeholder]:!font-bold [&_.select-placeholder]:!text-gray-500 [&_.select-indicators-container]:!text-gray-600 dark:[&_.select-control]:!border-white/10 dark:[&_.select-control]:!bg-gray-800 dark:[&_.select-control]:!shadow-[0_1px_2px_rgba(0,0,0,0.35)] dark:[&_.select-control.select-control-focused]:!bg-gray-800 dark:[&_.select-single-value]:!text-gray-100 dark:[&_.select-placeholder]:!text-gray-400 dark:[&_.select-indicators-container]:!text-gray-400'

/** Меню react-select панели каталога (портал на body) — тёмная тема как у чипов */
const CATALOG_FILTER_SELECT_CLASSNAMES = {
    menu: () =>
        classNames(
            'select-menu',
            '!bg-white shadow-md dark:!bg-gray-800 dark:!text-gray-100 dark:!border-white/10 dark:!ring-white/10 dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]',
        ),
    option: ({ isDisabled, isSelected }) =>
        classNames(
            'select-option',
            'text-gray-800 dark:!text-gray-100',
            !isDisabled &&
                !isSelected &&
                'dark:hover:!bg-white/10 dark:hover:!text-gray-100',
            isSelected && 'dark:!text-primary',
            isDisabled && 'opacity-60 dark:!text-gray-500',
        ),
}

const SIDEBAR_CATEGORY_ICON_BY_SLUG = {
    cleaning: PiBroom,
    'auto-service': PiCar,
    beauty: PiSparkle,
    'hair-services': PiScissors,
    barbershop: PiScissors,
    'massage-spa': PiFlower,
    'repair-construction': PiHammer,
    electrical: PiLightning,
    plumbing: PiDrop,
    hvac: PiWind,
    landscaping: PiTree,
    'snow-removal': PiSnowflake,
    childcare: PiBaby,
    eldercare: PiHeart,
    'pet-care': PiDog,
    tutoring: PiStudent,
    'language-learning': PiTranslate,
    'music-lessons': PiMusicNote,
    photography: PiCamera,
    videography: PiVideo,
    'event-planning': PiConfetti,
    catering: PiForkKnife,
    delivery: PiTruck,
    moving: PiPackage,
    'it-support': PiDesktop,
    'web-development': PiCode,
    'legal-services': PiGavel,
    accounting: PiCalculator,
    translation: PiArticle,
    notary: PiFileText,
    'medical-services': PiStethoscope,
    'physical-therapy': PiPersonSimpleRun,
    'dry-cleaning': PiTShirt,
    laundry: PiWashingMachine,
    'tattoo-piercing': PiNeedle,
    'nail-services': PiPaintBrush,
    cosmetology: PiSparkle,
}

function SidebarPopularCategoryGlyph({ category }) {
    const raw = category?.icon != null && String(category.icon).trim()
    if (raw) {
        return (
            <span className="select-none text-[1.125rem] leading-none" aria-hidden>
                {String(category.icon).trim()}
            </span>
        )
    }
    const slug = (category?.slug || '').toLowerCase().trim()
    const Icon = SIDEBAR_CATEGORY_ICON_BY_SLUG[slug] || PiTag
    return <Icon className="h-5 w-5 shrink-0" aria-hidden />
}

const getQuickTags = (t) => tagKeys.map((id) => ({
    id,
    label: getTagLabel(id, t),
}))

/** Акцентные слова в hero-заголовке (мультиязычность, без привязки к одной локали) */
const getHeroTitleWordClass = ({ word }) => {
    const w = word
        .replace(/^[«»"'„“]+/u, '')
        .replace(/[.,!?;:\u0589]+$/u, '')
        .toLowerCase()
    const accentClass = 'text-primary'
    const accent = new Set([
        'searching',
        'booking',
        'искать',
        'бронировать',
        'buscar',
        'reservar',
        'пошук',
        'бронювання',
        'փնտրել',
        'փնտրելը',
        'ամրագրել',
        'ամրագրելը',
    ])
    if (accent.has(w)) return accentClass
    return 'text-gray-900 dark:text-white'
}

/** Две строки заголовка: явный \n в переводе или fallback по «. » */
const splitHeroTitleLines = (title) => {
    if (!title || typeof title !== 'string') return ['']
    const trimmed = title.trim()
    const byNl = trimmed.split(/\n/).map((s) => s.trim()).filter(Boolean)
    if (byNl.length > 1) return byNl
    const dotSpace = trimmed.indexOf('. ')
    if (dotSpace !== -1) {
        const first = trimmed.slice(0, dotSpace + 1).trim()
        const second = trimmed.slice(dotSpace + 2).trim()
        if (second) return [first, second]
    }
    return [trimmed]
}

/** Декоративные фото для hero-коллажа, если в выдаче мало изображений (только визуал). */
/** Порядок: верхний ряд слева направо, нижний ряд — как на макете hero */
const HERO_COLLAGE_FALLBACK_URLS = [
    'https://picsum.photos/seed/rexten-hero-plumb/640/480',
    'https://picsum.photos/seed/rexten-hero-hvac/640/480',
    'https://picsum.photos/seed/rexten-hero-barber/640/480',
    'https://picsum.photos/seed/rexten-hero-nails/640/480',
    'https://picsum.photos/seed/rexten-hero-paint/640/480',
    'https://picsum.photos/seed/rexten-hero-auto/640/480',
]

/** Лица в бейдже «4.5+ / отзывы» (стабильные портреты, не пустые кружки) */
const HERO_REVIEW_AVATAR_URLS = [
    'https://i.pravatar.cc/96?img=12',
    'https://i.pravatar.cc/96?img=28',
    'https://i.pravatar.cc/96?img=44',
    'https://i.pravatar.cc/96?img=59',
]

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
                        {getQuickTags(t).map((tag) => (
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
        <div className="fixed inset-0 z-[9999]">
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
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden pointer-events-auto">
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

// Debounce хук
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
}

export default function ServicesPageWrapper({
    initialCategories,
    initialStates,
    initialServices,
    initialFeatured,
}) {
    return (
        <Suspense>
            <ServicesPage
                initialCategories={initialCategories}
                initialStates={initialStates}
                initialServices={initialServices}
                initialFeatured={initialFeatured}
            />
        </Suspense>
    )
}

function ServicesPage({
    initialCategories,
    initialStates,
    initialServices,
    initialFeatured,
}) {
    const t = useTranslations('public.services')
    const tServiceCard = useTranslations('components.serviceCard')
    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // --- Инициализация из URL query params ---
    const [search, setSearch] = useState(searchParams.get('q') || '')
    const [category, setCategory] = useState(searchParams.get('category') || 'all')
    const [priceFilter, setPriceFilter] = useState(searchParams.get('price') || 'all')
    const [ratingFilter, setRatingFilter] = useState(searchParams.get('rating') ? Number(searchParams.get('rating')) : null)
    const [selectedTags, setSelectedTags] = useState(() => {
        const t = searchParams.get('tags')
        return t ? t.split(',').filter(Boolean) : []
    })
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [visibleServicesCount, setVisibleServicesCount] = useState(16)
    
    const location = useLocation()
    const { state, city, setState, setCity, getStateName, reset: resetLocation, availableStates = [] } = location
    
    
    // Быстрые фильтры
    const [quickFilters, setQuickFilters] = useState({
        rating45: false,
        availableSlots: false,
        openNow: false,
    })
    const [heroDate, setHeroDate] = useState('')
    /** После успешного POST /marketplace/has-slots — Set id вида `ad_12`; иначе null */
    const [heroDateMatchIds, setHeroDateMatchIds] = useState(null)
    const [heroDateFilterApplied, setHeroDateFilterApplied] = useState(false)
    const heroDateFetchGenRef = useRef(0)
    const [catalogViewMode, setCatalogViewMode] = useState('grid')
    
    // Данные из API
    const hasServerData =
        initialServices != null &&
        initialCategories != null &&
        initialStates != null

    const [categories, setCategories] = useState(() => initialCategories ?? [])
    const [states, setStates] = useState(() => initialStates ?? [])
    const [services, setServices] = useState(() => initialServices ?? [])
    const [featuredServices, setFeaturedServices] = useState(() => initialFeatured ?? [])
    const [isLoading, setIsLoading] = useState(() => !hasServerData)
    const skipInitialFetchRef = useRef(hasServerData)

    const featuredRef = useRef(null)
    const listingsRef = useRef(null)
    const layoutSectionRef = useRef(null)

    // Debounce поиска (400ms)
    const debouncedSearch = useDebounce(search, 400)
    const debouncedHeroDate = useDebounce(heroDate, 350)

    useEffect(() => {
        if (!debouncedHeroDate) {
            setHeroDateMatchIds(null)
            setHeroDateFilterApplied(false)
            return
        }

        const gen = ++heroDateFetchGenRef.current
        const controller = new AbortController()

        const numericIds = services
            .map((s) => {
                const raw = String(s?.id ?? '')
                if (!raw.startsWith('ad_')) return null
                const n = parseInt(raw.slice(3), 10)
                return Number.isFinite(n) ? n : null
            })
            .filter((n) => n != null)

        if (numericIds.length === 0) {
            setHeroDateMatchIds(null)
            setHeroDateFilterApplied(false)
            return
        }

        setHeroDateFilterApplied(false)

        ;(async () => {
            try {
                const available = await postMarketplaceHasSlotsForDate(debouncedHeroDate, numericIds, {
                    signal: controller.signal,
                })
                if (gen !== heroDateFetchGenRef.current) return
                setHeroDateMatchIds(new Set(available.map((n) => `ad_${n}`)))
                setHeroDateFilterApplied(true)
            } catch (e) {
                if (e?.name === 'AbortError' || controller.signal.aborted) return
                if (gen !== heroDateFetchGenRef.current) return
                setHeroDateMatchIds(null)
                setHeroDateFilterApplied(false)
            }
        })()

        return () => controller.abort()
    }, [debouncedHeroDate, services])

    // --- Синхронизация фильтров → URL ---
    const syncUrlRef = useRef(false)
    useEffect(() => {
        if (!syncUrlRef.current) {
            syncUrlRef.current = true
            return
        }
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (category && category !== 'all') params.set('category', category)
        if (priceFilter && priceFilter !== 'all') params.set('price', priceFilter)
        if (ratingFilter) params.set('rating', String(ratingFilter))
        if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
        if (sortBy && sortBy !== 'default') params.set('sort', sortBy)
        const qs = params.toString()
        const newUrl = qs ? `${pathname}?${qs}` : pathname
        router.replace(newUrl, { scroll: false })
    }, [debouncedSearch, category, priceFilter, ratingFilter, selectedTags, sortBy])
    
    // Загрузка данных
    useEffect(() => {
        const loadData = async () => {
            if (skipInitialFetchRef.current) {
                skipInitialFetchRef.current = false
                return
            }
            setIsLoading(true)
            try {
                const filters = {}
                
                if (state && state !== '' && state !== 'all') {
                    filters.state = state
                }
                if (city && city !== '' && city !== 'all') {
                    filters.city = city
                }
                if (sortBy && sortBy !== 'default') {
                    filters.sort_by = sortBy
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
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [state, city, sortBy])

    const handleSetCategory = (next) => {
        setCategory(next)
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
        const baseCategory = categoryObj
            ? getCategoryName(categoryObj, t)
            : (service.category ?? tServiceCard('service'))
        // Для объявлений бэкенд уже возвращает полный URL, не нужно нормализовать
        // Для обычных услуг может быть относительный путь, нормализуем только их
        const isAdvertisement = service.id && String(service.id).startsWith('ad_')
        const rawImageCandidate =
            service.imageUrl ?? service.image ?? service.businessImageUrl ?? null
        const rawImageUrl =
            rawImageCandidate == null || rawImageCandidate === ''
                ? null
                : String(rawImageCandidate).trim() || null

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
        [services, categories, t, tServiceCard],
    )

    // Фильтрация услуг
    const filteredListings = useMemo(() => {
        if (isLoading) return []
        
        return formattedListings.filter((listing) => {
            const q = (debouncedSearch || '').toLowerCase()
            const matchesSearch =
                !debouncedSearch ||
                (listing.name ?? '').toLowerCase().includes(q) ||
                (listing.category ?? '').toLowerCase().includes(q) ||
                (listing.city ?? '').toLowerCase().includes(q)

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
                if (
                    String(listing.state).toLowerCase() === String(state).toLowerCase()
                ) {
                    return true
                }
                
                // Если ничего не совпало - не показываем
                return false
            })()

            const matchesCity =
                !city || city === '' || city === 'all' ||
                listing.city == null ||
                String(listing.city).toLowerCase().includes(String(city).toLowerCase())

            const matchesPrice = (() => {
                const range = getPriceRanges(t).find((p) => p.id === priceFilter)
                if (!range || range.id === 'all') return true
                const priceNum = Number(listing.priceValue)
                const pv = Number.isFinite(priceNum) ? priceNum : 0
                if (range.min && pv < range.min) return false
                if (range.max && pv > range.max) return false
                return true
            })()

            // Используем quickFilters.rating45 если активен, иначе ratingFilter
            const activeRatingFilter = quickFilters.rating45 ? 4.5 : ratingFilter
            const matchesRating =
                !activeRatingFilter || listing.rating >= Number(activeRatingFilter)

            const matchesTags =
                selectedTags.length === 0 ||
                selectedTags.every((tag) => (listing.tags || []).includes(tag))

            const matchesQuickFilters = 
                (!quickFilters.availableSlots || (listing.allowBooking !== false && listing.hasSchedule)) &&
                (!quickFilters.openNow || listing.isOpenNow)

            const applyHeroDateFilter =
                Boolean(debouncedHeroDate) && heroDateFilterApplied && heroDateMatchIds !== null
            const matchesHeroDate =
                !applyHeroDateFilter || heroDateMatchIds.has(String(listing.id))

            return (
                matchesSearch &&
                matchesCategory &&
                matchesState &&
                matchesCity &&
                matchesPrice &&
                matchesRating &&
                matchesTags &&
                matchesQuickFilters &&
                matchesHeroDate
            )
        })
    }, [
        formattedListings,
        debouncedSearch,
        category,
        state,
        city,
        availableStates,
        priceFilter,
        ratingFilter,
        quickFilters,
        selectedTags,
        isLoading,
        debouncedHeroDate,
        heroDateFilterApplied,
        heroDateMatchIds,
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
        [featuredServices, categories, t, tServiceCard],
    )
    const hasFeatured = formattedFeaturedServices.length > 0

    const heroCollageSources = useMemo(() => {
        const pool = [...formattedFeaturedServices, ...formattedListings]
        const urls = []
        for (const s of pool) {
            const u = s?.imageUrl
            if (u && !String(u).includes('placeholder')) {
                urls.push(normalizeImageUrl(u) || u)
            }
            if (urls.length >= 6) break
        }
        while (urls.length < 6) {
            urls.push(HERO_COLLAGE_FALLBACK_URLS[urls.length % HERO_COLLAGE_FALLBACK_URLS.length])
        }
        return urls.slice(0, 6)
    }, [formattedFeaturedServices, formattedListings])

    const intlLocale =
        locale === 'es-MX'
            ? 'es-MX'
            : locale === 'hy-AM'
              ? 'hy-AM'
              : locale === 'uk-UA'
                ? 'uk-UA'
                : locale === 'ru'
                  ? 'ru-RU'
                  : 'en-US'

    const openHeroDatePicker = () => {
        // оставлено для совместимости, не используется
        if (false) {
        }
    }

    const categoryListingCounts = useMemo(() => {
        const map = new Map()
        for (const c of categories) {
            map.set(String(c.id), 0)
        }
        for (const s of formattedListings) {
            const g = s.group != null ? String(s.group) : null
            if (g && map.has(g)) {
                map.set(g, (map.get(g) || 0) + 1)
            }
        }
        return map
    }, [categories, formattedListings])

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
        setSortBy('default')
        setQuickFilters({
            rating45: false,
            availableSlots: false,
            openNow: false,
        })
        setHeroDate('')
        setHeroDateMatchIds(null)
        setHeroDateFilterApplied(false)
        
        resetLocation()
    }
    
    // Локация теперь управляется через LocationProvider - нет необходимости в локальных функциях

    const scrollToListings = () => {
        listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <main className="w-full min-w-0 text-base bg-gray-50 dark:bg-gray-950 overflow-x-hidden pt-20 md:pt-24 [overflow-anchor:none]">
            <section className="relative z-20 bg-[#f5f6f8] pt-7 pb-10 dark:bg-gray-900 md:pt-11 md:pb-14">
                <div className={`mx-auto w-full ${PUBLIC_MARKETPLACE_CONTENT_MAX} px-4 sm:px-6 lg:px-8`}>
                    <div className="grid gap-4 md:gap-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 xl:gap-x-6 lg:gap-y-0">
                        <div className="flex w-full min-w-0 flex-col gap-4 md:gap-5 lg:col-span-8 xl:col-span-7">
                            {/* Мобиле: заголовок слева + мини-коллаж справа; md+ — только заголовок */}
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                                        {t('heroBrandLabel')}
                                    </p>
                                    <h1 className="text-balance text-[1.75rem] font-bold leading-[1.2] tracking-tight md:text-4xl lg:text-[2.375rem] lg:leading-[1.22]">
                                        {splitHeroTitleLines(t('heroTitle')).map((line, lineIdx) => (
                                            <span key={`${locale}-hero-line-${lineIdx}`} className="block">
                                                {line
                                                    .split(/\s+/)
                                                    .filter(Boolean)
                                                    .map((word, i) => (
                                                        <span
                                                            key={`${locale}-hero-${lineIdx}-${i}-${word}`}
                                                            className={getHeroTitleWordClass({ word })}
                                                        >
                                                            {word}{' '}
                                                        </span>
                                                    ))}
                                            </span>
                                        ))}
                                    </h1>
                                </div>
                                {/* Мини-коллаж — мобиле + планшет < lg */}
                                <div className="relative w-[46%] shrink-0 lg:hidden">
                                    <div className="grid grid-cols-3 gap-1">
                                        {heroCollageSources.slice(0, 6).map((src, i) => (
                                            <div
                                                key={`hero-mobile-col-${i}`}
                                                className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm dark:bg-gray-800"
                                            >
                                                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute left-1.5 top-1/2 z-10 w-[calc(66.66%-0.375rem)] -translate-y-1/2 rounded-lg border border-gray-200/90 bg-white/95 px-1.5 py-1.5 shadow backdrop-blur-sm dark:border-white/12 dark:bg-gray-800/90">
                                        <div className="flex items-center gap-1">
                                            <span className="flex shrink-0 -space-x-1">
                                                {HERO_REVIEW_AVATAR_URLS.slice(0, 3).map((src) => (
                                                    <span key={src} className="inline-block h-4 w-4 overflow-hidden rounded-full border border-white bg-gray-200 dark:border-gray-700">
                                                        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                    </span>
                                                ))}
                                            </span>
                                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-gray-900 dark:text-gray-100">
                                                <PiStarFill className="text-amber-400 text-[10px]" aria-hidden />
                                                {t('heroReviewsBadgeScore')}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[9px] font-bold leading-tight text-gray-500 dark:text-gray-400">
                                            {t('heroReviewsBadgeSub')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <motion.p
                                initial={{ opacity: 0, translateY: 8 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ duration: 0.25, delay: 0.06 }}
                                className="max-w-xl text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400"
                            >
                                {t('heroDescription')}
                            </motion.p>

                            <div className="w-full min-w-0 space-y-3 pt-1">
                                <div className="flex w-full min-w-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)] ring-0 dark:border-white/10 dark:bg-gray-900/85 dark:shadow-[0_4px_28px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/[0.06] dark:backdrop-blur-sm md:flex-row md:items-stretch">
                                    {/* Поиск */}
                                    <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-gray-200 px-4 py-3.5 dark:border-white/10 md:border-b-0 md:border-r md:py-4">
                                        <PiMagnifyingGlass
                                            className="shrink-0 text-xl text-gray-400 dark:text-gray-500"
                                            aria-hidden
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('heroSearchSegmentLabel')}
                                            </p>
                                            <input
                                                type="search"
                                                enterKeyHint="search"
                                                placeholder={t('heroSearchHint')}
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="mt-0.5 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-bold leading-snug text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                                            />
                                        </div>
                                    </div>
                                    {/* Где */}
                                    <div className="flex flex-1 items-center gap-3 border-b border-gray-200 px-4 py-3.5 dark:border-white/10 md:border-b-0 md:border-r md:py-4">
                                        <PiMapPin
                                            className="shrink-0 text-xl text-gray-400 dark:text-gray-500"
                                            aria-hidden
                                        />
                                        <div className="w-full flex-1">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('heroWhereSegmentLabel')}
                                            </p>
                                            <div className="mt-0.5">
                                                <HeroLocationPicker
                                                    t={t}
                                                    availableStates={availableStates}
                                                    state={state}
                                                    setState={setState}
                                                    city={city}
                                                    getStateName={getStateName}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Когда */}
                                    <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3.5 dark:border-white/10 md:w-48 md:shrink-0 md:border-b-0 md:border-r md:py-4">
                                        <PiCalendarBlank
                                            className="shrink-0 text-xl text-gray-400 dark:text-gray-500"
                                            aria-hidden
                                        />
                                        <div className="w-full flex-1">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('heroWhenSegmentLabel')}
                                            </p>
                                            <div className="mt-0.5">
                                                <HeroDatePicker
                                                    value={heroDate}
                                                    onChange={setHeroDate}
                                                    placeholder={t('heroDatePlaceholder')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Кнопка */}
                                    <div className="flex w-full items-center px-3 py-3 md:w-auto md:shrink-0 md:px-3 md:py-2.5">
                                        <Button
                                            type="button"
                                            variant="solid"
                                            size="md"
                                            className="w-full rounded-xl border-0 px-5 py-2.5 text-sm font-bold shadow-sm ring-0 md:w-auto md:min-w-[120px]"
                                            onClick={scrollToListings}
                                        >
                                            {t('heroCta')}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-x-6 gap-y-2.5 pt-0.5">
                                    {[
                                        { key: 'reviews', icon: PiShieldCheck },
                                        { key: 'booking', icon: PiLightningBold },
                                        { key: 'noCalls', icon: PiPhoneSlash },
                                    ].map(({ key, icon: Icon }) => (
                                        <span
                                            key={key}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400"
                                        >
                                            <Icon className="text-primary text-[17px] shrink-0" aria-hidden />
                                            {t(`heroFeatures.${key}`)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:col-span-4 xl:col-span-5 lg:pt-1">
                            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:gap-3">
                                {heroCollageSources.slice(0, 6).map((src, i) => (
                                    <div
                                        key={`hero-collage-${i}`}
                                        className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-gray-800"
                                    >
                                        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                    </div>
                                ))}
                            </div>
                            <div className="absolute left-3 top-1/2 z-10 w-[min(calc(66.66%-1rem),200px)] -translate-y-1/2 rounded-xl border border-gray-200/90 bg-white/95 p-2.5 pr-3 shadow-[0_6px_24px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:border-white/12 dark:bg-gray-800/90 dark:shadow-[0_8px_28px_rgba(0,0,0,0.5)]">
                                <div className="flex items-center gap-2">
                                    <span className="flex shrink-0 -space-x-1.5">
                                        {HERO_REVIEW_AVATAR_URLS.map((src) => (
                                            <span
                                                key={src}
                                                className="relative inline-block h-6 w-6 shrink-0 overflow-hidden rounded-full border-2 border-white bg-gray-200 ring-0 dark:border-gray-700 dark:bg-gray-600"
                                            >
                                                <img
                                                    src={src}
                                                    alt=""
                                                    width={24}
                                                    height={24}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                />
                                            </span>
                                        ))}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                                        <PiStarFill className="text-amber-400" aria-hidden />
                                        {t('heroReviewsBadgeScore')}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] font-bold leading-snug text-gray-500 dark:text-gray-400">
                                    {t('heroReviewsBadgeSub')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section ref={layoutSectionRef} className="relative z-10 w-full min-w-0 overflow-x-hidden bg-gray-50 pb-16 pt-4 dark:bg-gray-950 md:pt-6">
                <div className={`mx-auto w-full ${PUBLIC_MARKETPLACE_CONTENT_MAX} px-4 sm:px-6 lg:px-8`}>
                    {hasFeatured && (
                        <div ref={featuredRef} className="mb-8 md:mb-10">
                            <div className="mb-3 flex items-center justify-between md:mb-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {t('featuredTitle')}
                                </h2>
                                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                    {t('featuredSponsored')}
                                </span>
                            </div>
                            <div className="overflow-x-auto px-0 md:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="flex gap-4">
                                    {formattedFeaturedServices.map((listing) => (
                                        <div key={listing.id} className="w-[260px] shrink-0">
                                            <ServiceCard service={listing} variant="featured" showBadges />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-3">
                                {formattedFeaturedServices.map((listing) => (
                                    <ServiceCard key={listing.id} service={listing} variant="featured" showBadges />
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={listingsRef} className="flex flex-col gap-5">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-950 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setQuickFilters((prev) => ({ ...prev, rating45: !prev.rating45 }))}
                                    className={classNames(
                                        CATALOG_CHIP_BASE,
                                        'gap-1.5 shrink-0',
                                        quickFilters.rating45 ? CATALOG_CHIP_ON : CATALOG_CHIP_OFF,
                                    )}
                                >
                                    <PiStarFill className="text-base text-amber-400" aria-hidden />
                                    {t('filtersBarRating')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickFilters((prev) => ({ ...prev, openNow: !prev.openNow }))}
                                    className={classNames(
                                        CATALOG_CHIP_BASE,
                                        'gap-2 shrink-0',
                                        quickFilters.openNow ? CATALOG_CHIP_ON : CATALOG_CHIP_OFF,
                                    )}
                                >
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                                    {t('filtersBarAvailableNow')}
                                </button>
                                <div className={classNames(CATALOG_SELECT_WRAP, 'shrink-0 min-w-[118px] max-w-[200px]')}>
                                    <Select
                                        instanceId="toolbar-price"
                                        size="sm"
                                        isSearchable={false}
                                        isClearable={false}
                                        classNames={CATALOG_FILTER_SELECT_CLASSNAMES}
                                        placeholder={t('filtersBarPrice')}
                                        className="text-sm"
                                        value={(() => {
                                            const pr = getPriceRanges(t).find((r) => r.id === priceFilter)
                                            const all = getPriceRanges(t).find((r) => r.id === 'all')
                                            return pr
                                                ? { value: pr.id, label: pr.label }
                                                : { value: 'all', label: all?.label ?? '' }
                                        })()}
                                        options={getPriceRanges(t).map((r) => ({ value: r.id, label: r.label }))}
                                        onChange={(opt) => setPriceFilter(opt?.value || 'all')}
                                    />
                                </div>
                                <div className={classNames(CATALOG_SELECT_WRAP, 'hidden md:block min-w-[140px] max-w-[220px]')}>
                                    <Select
                                        instanceId="toolbar-category"
                                        size="sm"
                                        isSearchable={false}
                                        isClearable={false}
                                        classNames={CATALOG_FILTER_SELECT_CLASSNAMES}
                                        placeholder={t('filtersBarCategory')}
                                        className="text-sm"
                                        value={
                                            category === 'all'
                                                ? { value: 'all', label: t('allServices') }
                                                : (() => {
                                                      const cat = categories.find((c) => String(c.id) === String(category))
                                                      return cat
                                                          ? { value: String(cat.id), label: getCategoryName(cat, t) }
                                                          : { value: 'all', label: t('allServices') }
                                                  })()
                                        }
                                        options={[
                                            { value: 'all', label: t('allServices') },
                                            ...categories.map((c) => ({
                                                value: String(c.id),
                                                label: getCategoryName(c, t),
                                            })),
                                        ]}
                                        onChange={(opt) => handleSetCategory(opt?.value === 'all' ? 'all' : opt?.value || 'all')}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFiltersOpen(true)}
                                    className={classNames(CATALOG_CHIP_BASE, 'gap-2 shrink-0', CATALOG_CHIP_OFF)}
                                >
                                    <PiSlidersDuotone className="text-base text-gray-500 dark:text-gray-400" aria-hidden />
                                    <span className="hidden md:inline">{t('filtersBarMore')}</span>
                                </button>
                            </div>
                            <div className="hidden md:flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 sm:max-w-md lg:flex-initial">
                                    <span className="shrink-0 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('sortByLabel')}
                                    </span>
                                    <div className={classNames(CATALOG_SELECT_WRAP, 'min-w-[160px] flex-1 sm:max-w-[240px]')}>
                                        <Select
                                            instanceId="sort-select"
                                            size="sm"
                                            isSearchable={false}
                                            isClearable={false}
                                            classNames={CATALOG_FILTER_SELECT_CLASSNAMES}
                                            className="text-sm"
                                            value={{
                                                value: sortBy,
                                                label: t(`sortOptions.${sortBy}`, { defaultValue: t('sortOptions.default') }),
                                            }}
                                            options={[
                                                { value: 'default', label: t('sortOptions.default') },
                                                { value: 'rating', label: t('sortOptions.rating') },
                                                { value: 'price_asc', label: t('sortOptions.price_asc') },
                                                { value: 'price_desc', label: t('sortOptions.price_desc') },
                                                { value: 'newest', label: t('sortOptions.newest') },
                                                { value: 'reviews', label: t('sortOptions.reviews') },
                                            ]}
                                            onChange={(opt) => setSortBy(opt?.value || 'default')}
                                        />
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                                    <button
                                        type="button"
                                        onClick={() => setCatalogViewMode('grid')}
                                        className={classNames(
                                            'rounded-lg p-2 transition',
                                            catalogViewMode === 'grid'
                                                ? 'bg-gray-900 text-white dark:bg-white/15 dark:text-gray-100'
                                                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10',
                                        )}
                                        aria-pressed={catalogViewMode === 'grid'}
                                        aria-label={t('viewGrid')}
                                    >
                                        <PiSquaresFour className="text-lg" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCatalogViewMode('list')}
                                        className={classNames(
                                            'rounded-lg p-2 transition',
                                            catalogViewMode === 'list'
                                                ? 'bg-gray-900 text-white dark:bg-white/15 dark:text-gray-100'
                                                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10',
                                        )}
                                        aria-pressed={catalogViewMode === 'list'}
                                        aria-label={t('viewList')}
                                    >
                                        <PiListBullets className="text-lg" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-white/10">
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {t('foundOffers', { count: filteredListings.length })}
                            </p>
                            {/* Мобильная сортировка */}
                            <div className={classNames(CATALOG_SELECT_WRAP, 'md:hidden min-w-[130px] max-w-[200px]')}>
                                <Select
                                    instanceId="sort-select-mobile"
                                    size="sm"
                                    isSearchable={false}
                                    isClearable={false}
                                    classNames={CATALOG_FILTER_SELECT_CLASSNAMES}
                                    className="text-sm"
                                    value={{
                                        value: sortBy,
                                        label: t(`sortOptions.${sortBy}`, { defaultValue: t('sortOptions.default') }),
                                    }}
                                    options={[
                                        { value: 'default', label: t('sortOptions.default') },
                                        { value: 'rating', label: t('sortOptions.rating') },
                                        { value: 'price_asc', label: t('sortOptions.price_asc') },
                                        { value: 'price_desc', label: t('sortOptions.price_desc') },
                                        { value: 'newest', label: t('sortOptions.newest') },
                                        { value: 'reviews', label: t('sortOptions.reviews') },
                                    ]}
                                    onChange={(opt) => setSortBy(opt?.value || 'default')}
                                />
                            </div>
                        </div>
                        </div>

                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                            <div className="min-w-0 flex-1 [overflow-anchor:none]">
                                <div className="md:hidden space-y-3">
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, idx) => (
                                            <ServiceCardSkeleton key={idx} />
                                        ))
                                    ) : filteredListings.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-white/20">
                                            <div className="flex flex-col items-center gap-3">
                                                <PiMagnifyingGlass className="text-4xl text-gray-400 dark:text-gray-500" />
                                                <div>
                                                    <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                                                        {t('noServicesFound')}
                                                    </h4>
                                                    <p className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                        {t('tryChangeFilters')}
                                                    </p>
                                                    <Button variant="outline" size="sm" onClick={resetFilters}>
                                                        {t('resetFilters')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {visibleListings.map((listing) => (
                                                <ServiceCard key={listing.id} service={listing} variant="compact" showBadges />
                                            ))}
                                            {filteredListings.length > visibleServicesCount && (
                                                <div className="mt-6 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="md"
                                                        className="w-full sm:w-auto"
                                                        onClick={() => setVisibleServicesCount((prev) => prev + 16)}
                                                    >
                                                        {t('showMore', { remaining: filteredListings.length - visibleServicesCount })}
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {catalogViewMode === 'grid' ? (
                                    <div className="hidden md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                                        {isLoading ? (
                                            Array.from({ length: 8 }).map((_, idx) => (
                                                <ServiceCardSkeleton key={idx} />
                                            ))
                                        ) : filteredListings.length === 0 ? (
                                            <div className="col-span-full rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-white/20">
                                                <div className="flex flex-col items-center gap-3">
                                                    <PiMagnifyingGlass className="text-4xl text-gray-400 dark:text-gray-500" />
                                                    <div>
                                                        <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
                                                            {t('noServicesFound')}
                                                        </h4>
                                                        <p className="mb-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                            {t('tryChangeFilters')}
                                                        </p>
                                                        <Button variant="outline" size="sm" onClick={resetFilters}>
                                                            {t('resetFilters')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {visibleListings.map((listing) => (
                                                    <ServiceCard key={listing.id} service={listing} showBadges />
                                                ))}
                                                {desktopPlaceholdersCount > 0 &&
                                                    Array.from({ length: desktopPlaceholdersCount }).map((_, idx) => (
                                                        <div key={`placeholder-${idx}`} className="pointer-events-none invisible">
                                                            <ServiceCardSkeleton />
                                                        </div>
                                                    ))}
                                                {filteredListings.length > visibleServicesCount && (
                                                    <div className="col-span-full mt-8 text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="md"
                                                            onClick={() => setVisibleServicesCount((prev) => prev + 16)}
                                                        >
                                                            {t('showMore', { remaining: filteredListings.length - visibleServicesCount })}
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="hidden md:flex md:flex-col md:gap-3">
                                        {isLoading ? (
                                            Array.from({ length: 6 }).map((_, idx) => (
                                                <ServiceCardSkeleton key={idx} />
                                            ))
                                        ) : filteredListings.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-white/20">
                                                <p className="text-sm font-bold text-gray-500">{t('noServicesFound')}</p>
                                            </div>
                                        ) : (
                                            <>
                                                {visibleListings.map((listing) => (
                                                    <ServiceCard key={listing.id} service={listing} variant="list" showBadges />
                                                ))}
                                                {filteredListings.length > visibleServicesCount && (
                                                    <div className="mt-6 text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="md"
                                                            onClick={() => setVisibleServicesCount((prev) => prev + 16)}
                                                        >
                                                            {t('showMore', { remaining: filteredListings.length - visibleServicesCount })}
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <aside className="hidden w-[300px] max-w-full shrink-0 space-y-4 lg:block xl:w-[300px]">
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
                                    <ul className="space-y-4">
                                        <li className="flex gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <PiShieldCheck className="text-xl" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {t('sidebarTrustVerifiedTitle')}
                                                </p>
                                                <p className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {t('sidebarTrustVerifiedDesc')}
                                                </p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <PiClockCountdown className="text-xl" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {t('sidebarTrustBookingTitle')}
                                                </p>
                                                <p className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {t('sidebarTrustBookingDesc')}
                                                </p>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <PiCreditCard className="text-xl" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    {t('sidebarTrustPaymentsTitle')}
                                                </p>
                                                <p className="mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    {t('sidebarTrustPaymentsDesc')}
                                                </p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('sidebarPopularCategories')}
                                    </h4>
                                    <ul className="mt-5 flex flex-col">
                                        {categories.slice(0, 6).map((cat) => {
                                            const count = categoryListingCounts.get(String(cat.id)) ?? 0
                                            return (
                                                <li
                                                    key={cat.id}
                                                    className="border-b border-gray-100 py-3.5 last:border-b-0 dark:border-white/10"
                                                >
                                                    <button
                                                        type="button"
                                                        className="group flex w-full items-center justify-between gap-4 text-left transition"
                                                        onClick={() => handleSetCategory(cat.id)}
                                                    >
                                                        <span className="flex min-w-0 flex-1 items-center gap-3">
                                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                                <SidebarPopularCategoryGlyph category={cat} />
                                                            </span>
                                                            <span className="min-w-0 truncate text-sm font-bold text-gray-900 group-hover:text-primary dark:text-gray-100">
                                                                {getCategoryName(cat, t)}
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                            {count}+ {t('servicesSuffix')}
                                                        </span>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() => handleSetCategory('all')}
                                        className="mt-2 w-full pt-1 text-left text-sm font-bold text-primary transition hover:underline"
                                    >
                                        {t('sidebarViewAllCategories')}
                                    </button>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
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


