'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import PermissionGuard from '@/components/shared/PermissionGuard'
import Button from '@/components/ui/Button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
    createBusinessAdvertisement, 
    updateBusinessAdvertisement, 
    getBusinessAdvertisement,
    getTeamMembers,
    getBusinessServices
} from '@/lib/api/business'
import { getCategories } from '@/lib/api/marketplace'
import { getCitiesByState } from '@/lib/api/locations'
import { getStates as fetchLocationStates, parseUsStateCode } from '@/services/location/LocationService'
import { normalizeImageUrl, denormalizeImageUrl } from '@/utils/imageUtils'
import LaravelAxios from '@/services/axios/LaravelAxios'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Loading from '@/components/shared/Loading'
import Link from 'next/link'
import {
    ADVERTISEMENT_CREATE_SECTION_ICONS,
    ADVERTISEMENT_CREATE_SECTION_IDS,
    STABLE_EMPTY_ARRAY,
} from './_components/advertisementCreateConstants'
import { AdvertisementCreatePageHeader } from './_components/AdvertisementCreatePageHeader'
import { AdvertisementCreateSectionNav } from './_components/AdvertisementCreateSectionNav'
import { AdvertisementCreateGeneralSection } from './_components/AdvertisementCreateGeneralSection'
import { AdvertisementCreatePricingSection } from './_components/AdvertisementCreatePricingSection'
import { AdvertisementCreateServicesSection } from './_components/AdvertisementCreateServicesSection'
import { AdvertisementCreateScheduleSection } from './_components/AdvertisementCreateScheduleSection'
import { AdvertisementCreatePortfolioSection } from './_components/AdvertisementCreatePortfolioSection'
import { AdvertisementCreateTeamSection } from './_components/AdvertisementCreateTeamSection'
import {
    advertisementMinutesToDisplay,
    advertisementDisplayToMinutes,
    mapAdvertisementServiceForSubmit,
    sortAdvertisementServicesNewestFirst,
    nextAdvertisementServiceTempId,
} from './_components/advertisementFormDuration'

const ALLOWED_SLOT_STEP_MINUTES = [60, 90, 120, 180, 240]

function normalizeSlotStepMinutes(value) {
    const n = Number(value) || 60
    return ALLOWED_SLOT_STEP_MINUTES.includes(n) ? n : 60
}

/** Финальная публикация: минимум полей (без портфолио и части «общей»). */
function validateAdvertisementForPublish(formData, t) {
    const title = (formData.title || '').trim()
    if (!title) {
        return { section: 'general', message: t('validation.titleRequired') }
    }
    if (!formData.category_id) {
        return { section: 'general', message: t('validation.categoryRequired') }
    }
    if (!formData.state || String(formData.state).trim() === '') {
        return { section: 'general', message: t('validation.stateRequired') }
    }
    if (!formData.city || String(formData.city).trim() === '') {
        return { section: 'general', message: t('validation.cityRequired') }
    }

    const pf = formData.priceFrom
    const pt = formData.priceTo
    if (pf === '' || pf == null) {
        return { section: 'pricing', message: t('validation.priceFromRequired') }
    }
    const nFrom = Number(pf)
    if (!Number.isFinite(nFrom) || nFrom < 0) {
        return { section: 'pricing', message: t('validation.pricesNumeric') }
    }
    const ptEmpty = pt === '' || pt == null
    if (!ptEmpty) {
        const nTo = Number(pt)
        if (!Number.isFinite(nTo) || nTo < 0) {
            return { section: 'pricing', message: t('validation.pricesNumeric') }
        }
        if (nFrom > nTo) {
            return { section: 'pricing', message: t('validation.priceRangeInvalid') }
        }
    }

    const services = Array.isArray(formData.services) ? formData.services : []
    const hasRealTemplateId = (s) => {
        const sid = s.service_id != null ? Number(s.service_id) : 0
        return sid > 0 && sid < 1_000_000
    }
    const isMeaningfulRow = (s) => (s.name || '').trim() !== '' || hasRealTemplateId(s)

    const meaningful = services.filter(isMeaningfulRow)
    if (meaningful.length === 0) {
        return { section: 'services', message: t('validation.servicesRequired') }
    }

    for (const s of meaningful) {
        const price = s.price
        if (price === '' || price == null || Number.isNaN(Number(price))) {
            return { section: 'services', message: t('validation.servicePriceRequired') }
        }
        if (Number(price) < 0) {
            return { section: 'services', message: t('validation.servicePriceNonNegative') }
        }
        const unit = s.duration_unit === 'days' ? 'days' : 'hours'
        const mins = advertisementDisplayToMinutes(s.duration, unit)
        if (mins < 1) {
            return { section: 'services', message: t('validation.serviceDurationRequired') }
        }
    }

    return null
}

export default function CreateAdvertisementPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const editId = searchParams.get('edit')
    const isEdit = !!editId
    
    const t = useTranslations('business.advertisements.create')
    const tCommon = useTranslations('business.common')
    
    // Динамические секции с переводами
    const SECTIONS = useMemo(() => ADVERTISEMENT_CREATE_SECTION_IDS.map(id => ({
        id,
        label: t(`sections.${id}`),
        icon: ADVERTISEMENT_CREATE_SECTION_ICONS[id],
    })), [t])

    const [activeSection, setActiveSection] = useState('general')
    const [draftId, setDraftId] = useState(null) // ID черновика, если он был создан
    const [formData, setFormData] = useState({
        type: 'regular',
        title: '',
        description: '',
        image: '',
        link: '',
        // Категория
        category_id: null,
        // Локация
        city: '',
        state: '',
        // Цены
        priceFrom: '',
        priceTo: '',
        currency: 'USD',
        // Услуги
        services: [],
        // Расписание
        schedule: {
            monday: { enabled: true, from: '09:00', to: '18:00' },
            tuesday: { enabled: true, from: '09:00', to: '18:00' },
            wednesday: { enabled: true, from: '09:00', to: '18:00' },
            thursday: { enabled: true, from: '09:00', to: '18:00' },
            friday: { enabled: true, from: '09:00', to: '18:00' },
            saturday: { enabled: false, from: '09:00', to: '18:00' },
            sunday: { enabled: false, from: '09:00', to: '18:00' },
        },
        // Шаг слотов для бронирования (в минутах)
        slot_step_minutes: 60, // По умолчанию 1 час
        // Команда (выбранные ID из существующей команды)
        team: [],
        // Портфолио
        portfolio: [],
        // Даты размещения
        start_date: '',
        end_date: '',
    })
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [selectedStateId, setSelectedStateId] = useState(null)
    const [newPortfolioItem, setNewPortfolioItem] = useState({
        title: '',
        tag: '',
        description: '',
    })
    const [uploadKey, setUploadKey] = useState(0) // Ключ для пересоздания Upload компонента
    const [showAddPortfolioForm, setShowAddPortfolioForm] = useState(false) // Показывать ли форму добавления
    
    // Функция для генерации slug из строки с поддержкой русских символов
    const generateSlug = (text) => {
        if (!text) return ''
        
        // Транслитерация кириллицы в латиницу
        const translit = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
            'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
            'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
            'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
            'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
            'э': 'e', 'ю': 'yu', 'я': 'ya',
            'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
            'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
            'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
            'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
            'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
            'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
            'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
        }
        
        let result = text
            .split('')
            .map(char => translit[char] || char)
            .join('')
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Удаляем спецсимволы (кроме букв, цифр, пробелов и дефисов)
            .replace(/[\s_-]+/g, '-') // Заменяем пробелы и подчеркивания на дефисы
            .replace(/^-+|-+$/g, '') // Удаляем дефисы в начале и конце
        
        // Добавляем случайные 2 цифры в конце для уникальности
        const randomDigits = String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')
        result = result + '-' + randomDigits
        
        return result
    }

    // Загрузка данных для редактирования
    const { data: advertisement, isLoading: isLoadingAd } = useQuery({
        queryKey: ['business-advertisement', editId],
        queryFn: () => getBusinessAdvertisement(Number(editId)),
        enabled: isEdit && !!editId,
    })

    // Загрузка штатов
    const { data: statesData } = useQuery({
        queryKey: ['locations-states', 'advertisement-form'],
        queryFn: () => fetchLocationStates(false),
    })
    const states = statesData ?? STABLE_EMPTY_ARRAY

    // Загрузка городов по выбранному штату
    const { data: citiesData, isLoading: citiesLoading } = useQuery({
        queryKey: ['cities', selectedStateId],
        queryFn: () => getCitiesByState(selectedStateId),
        enabled: !!selectedStateId,
    })
    const cities = citiesData ?? STABLE_EMPTY_ARRAY

    // Загрузка команды
    const { data: companyTeamData } = useQuery({
        queryKey: ['business-team', 'full'],
        queryFn: () => getTeamMembers({ includeInactive: true }),
    })
    const companyTeam = companyTeamData ?? STABLE_EMPTY_ARRAY

    // Загрузка услуг компании
    const { data: companyServicesData } = useQuery({
        queryKey: ['business-services', 'full'],
        queryFn: () => getBusinessServices({ includeInactive: true }),
    })
    const companyServices = companyServicesData ?? STABLE_EMPTY_ARRAY

    // Загрузка категорий
    const { data: categoriesData } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    })
    const categories = categoriesData ?? STABLE_EMPTY_ARRAY

    // Заполнение формы при редактировании
    useEffect(() => {
        if (advertisement && isEdit) {
            // Устанавливаем draftId при загрузке объявления для редактирования
            setDraftId(advertisement.id)
            // Загружаем услуги из БД (если они есть)
            const servicesData = sortAdvertisementServicesNewestFirst(advertisement.services).map((service) => {
                const totalMinutes = Number(service.duration ?? service.duration_minutes ?? 0) || 0
                const { value: durValue, unit: durUnit } = advertisementMinutesToDisplay(
                    totalMinutes,
                    service.duration_unit || 'hours',
                )
                return {
                    id: service.id || service.service_id || Date.now() + Math.random(),
                    service_id: service.service_id || service.id || null,
                    name: service.name || '',
                    price: service.price || '',
                    duration: durValue,
                    duration_unit: durUnit,
                    description: service.description || '',
                }
            })
            
            setFormData({
                type: 'regular', // Всегда обычное объявление
                title: advertisement.title || '',
                description: advertisement.description || '',
                image: normalizeImageUrl(advertisement.image) || '',
                link: (() => {
                    // Извлекаем slug из link (может быть полный URL или только slug)
                    let link = advertisement.link || ''
                    if (link) {
                        // Убираем полный URL или путь /marketplace/
                        link = link.replace(/^\/marketplace\//, '')
                        link = link.replace(/^https?:\/\/[^\/]+\/marketplace\//, '')
                        link = link.trim()
                    }
                    return link
                })(),
                category_id: (() => {
                    // Если есть category_id, используем его
                    if (advertisement.category_id) {
                        return advertisement.category_id
                    }
                    // Если есть category_slug, находим категорию по slug и берем её ID
                    if (advertisement.category_slug && categories.length > 0) {
                        const category = categories.find(c => c.slug === advertisement.category_slug)
                        return category?.id || null
                    }
                    return null
                })(),
                city: advertisement.city || '',
                state: parseUsStateCode(advertisement.state ?? '') ?? '',
                priceFrom: advertisement.price_from || '',
                priceTo: advertisement.price_to || '',
                currency: 'USD',
                services: servicesData,
                // Преобразуем team в массив ID для работы с формой
                team: (() => {
                    const team = Array.isArray(advertisement.team) ? advertisement.team : (advertisement.team ? JSON.parse(advertisement.team) : [])
                    return Array.isArray(team) && team.length > 0
                        ? team.map(m => typeof m === 'object' && m.id ? m.id : m)
                        : []
                })(),
                schedule: advertisement.schedule || {
                    monday: { enabled: true, from: '09:00', to: '18:00' },
                    tuesday: { enabled: true, from: '09:00', to: '18:00' },
                    wednesday: { enabled: true, from: '09:00', to: '18:00' },
                    thursday: { enabled: true, from: '09:00', to: '18:00' },
                    friday: { enabled: true, from: '09:00', to: '18:00' },
                    saturday: { enabled: false, from: '09:00', to: '18:00' },
                    sunday: { enabled: false, from: '09:00', to: '18:00' },
                },
                slot_step_minutes: normalizeSlotStepMinutes(advertisement.slot_step_minutes),
                portfolio: Array.isArray(advertisement.portfolio) 
                    ? advertisement.portfolio.map(item => ({
                        ...item,
                        imageUrl: item.imageUrl ? normalizeImageUrl(item.imageUrl) : item.imageUrl,
                        images: Array.isArray(item.images) 
                            ? item.images.map(img => normalizeImageUrl(img))
                            : item.images
                    }))
                    : [],
                // Даты размещения
                start_date: advertisement.start_date ? advertisement.start_date.split('T')[0] : '',
                end_date: advertisement.end_date ? advertisement.end_date.split('T')[0] : '',
            })

            const code = parseUsStateCode(advertisement.state ?? '')
            if (code) {
                setSelectedStateId(code)
            }
        }
        }, [advertisement, isEdit, categories])
    
    // Автоматическая генерация link (slug) из title
    useEffect(() => {
        if (formData.title && !isEdit) {
            // Генерируем slug только при создании, не при редактировании
            const slug = generateSlug(formData.title)
            if (slug) {
                setFormData(prev => ({
                    ...prev,
                    link: slug // Отправляем только slug, без /marketplace/
                }))
            }
        }
    }, [formData.title, isEdit])

    // Загрузка изображения
    const handleImageUpload = async (files) => {
        if (!files || files.length === 0) return
        
        const file = files[0]
        setIsUploadingImage(true)
        
        try {
            const uploadFormData = new FormData()
            uploadFormData.append('image', file)

            // Не устанавливаем Content-Type вручную - axios сделает это автоматически с boundary
            const response = await LaravelAxios.post('/business/settings/advertisements/upload-image', uploadFormData)

            if (response.data?.url) {
                const imageUrl = response.data.url
                const normalizedUrl = normalizeImageUrl(imageUrl)
                setFormData(prev => ({ ...prev, image: normalizedUrl || imageUrl }))
                toast.push(
                    <Notification title={tCommon('success')} type="success">
                        {t('notifications.imageUploaded')}
                    </Notification>
                )
            } else {
                throw new Error('No image URL in response')
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                (error.response?.status === 401 ? t('notifications.authRequired') : error.message)
            
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.imageUploadError')}: {errorMessage}
                </Notification>
            )
        } finally {
            setIsUploadingImage(false)
        }
    }


    const createMutation = useMutation({
        mutationFn: (data) => {
            return createBusinessAdvertisement(data)
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements'] })
            // Устанавливаем draftId, если объявление было создано
            if (response.id) {
                setDraftId(response.id)
            }
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.created')}
                </Notification>
            )
            // Редиректим на страницу со списком объявлений
            router.push('/business/advertisements')
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                                error.message || 
                                t('notifications.unknownError')
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.createError')}: {errorMessage}
                </Notification>
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data) => {
            // Используем draftId, если он есть, иначе editId
            const idToUpdate = draftId ? Number(draftId) : (editId ? Number(editId) : null)
            if (!idToUpdate) {
                throw new Error('No ID provided for update')
            }
            return updateBusinessAdvertisement(idToUpdate, data)
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['business-advertisements'] })
            const idToInvalidate = draftId || editId
            if (idToInvalidate) {
                queryClient.invalidateQueries({ queryKey: ['business-advertisement', idToInvalidate] })
            }
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('notifications.updated')}
                </Notification>
            )
            // Редиректим на страницу со списком объявлений
            router.push('/business/advertisements')
        },
        onError: (error) => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('notifications.updateError')}: {error.response?.data?.message || error.message || t('notifications.unknownError')}
                </Notification>
            )
        },
    })

    // Функция сохранения черновика
    const saveDraft = async () => {
        // Проверяем, есть ли минимальные данные для сохранения черновика
        // Не создаём пустой черновик, если пользователь ничего не заполнил
        const hasTitle = formData.title && formData.title.trim() !== '' && formData.title !== t('draft')
        const hasDescription = formData.description && formData.description.trim() !== ''
        const hasCategory = formData.category_id && formData.category_id !== null
        const hasServices = Array.isArray(formData.services) && formData.services.length > 0 && formData.services.some(s => s.name || s.service_id)
        
        // Если форма пустая и это не редактирование - не сохраняем
        if (!isEdit && !draftId && !hasTitle && !hasDescription && !hasCategory && !hasServices) {
            return null
        }
        
        try {
            // Подготавливаем данные для черновика
            const servicesData = Array.isArray(formData.services)
                ? formData.services.map((service) => mapAdvertisementServiceForSubmit(service))
                : []
            
            // Для драфтов команда опциональна - формируем только если есть выбранная команда или доступные участники
            let teamData = null // null означает, что поле не будет отправлено
            if (Array.isArray(formData.team) && formData.team.length > 0) {
                teamData = formData.team.map(id => {
                    const member = companyTeam.find(m => m.id === id)
                    return member ? {
                        id: member.id,
                        name: member.name,
                        role: member.role,
                        description: member.email || '',
                        avatar: member.img || ''
                    } : null
                }).filter(Boolean)
                if (teamData.length === 0) {
                    teamData = null
                }
            }
            
            const draftData = {
                type: 'regular',
                title: formData.title || t('draft'),
                description: formData.description || null,
                image: denormalizeImageUrl(formData.image) || null,
                link: formData.link || null,
                category_id: formData.category_id || null,
                city: formData.city || null,
                state: formData.state || null,
                placement: 'services',
                services: servicesData,
                schedule: formData.schedule || null,
                slot_step_minutes: normalizeSlotStepMinutes(formData.slot_step_minutes),
                priceFrom: formData.priceFrom !== '' && formData.priceFrom != null ? formData.priceFrom : null,
                priceTo: formData.priceTo !== '' && formData.priceTo != null ? formData.priceTo : null,
                currency: 'USD',
                portfolio: Array.isArray(formData.portfolio) 
                    ? formData.portfolio.map(item => ({
                        ...item,
                        imageUrl: item.imageUrl ? denormalizeImageUrl(item.imageUrl) : item.imageUrl,
                        images: Array.isArray(item.images) 
                            ? item.images.map(img => denormalizeImageUrl(img))
                            : item.images
                    }))
                    : [],
                status: 'draft', // Черновик со статусом draft
                // Даты размещения
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
            }
            
            // Добавляем team только если он есть (для драфтов это опционально)
            if (teamData !== null && teamData.length > 0) {
                draftData.team = teamData
            }

            // Если черновик уже существует (isEdit или есть draftId), обновляем его
            const idToUpdate = isEdit ? Number(editId) : draftId
            if (idToUpdate) {
                const response = await updateBusinessAdvertisement(idToUpdate, draftData)
                setDraftId(response.id)
                return response.id
            } else {
                // Создаем новый черновик
                const response = await createBusinessAdvertisement(draftData)
                setDraftId(response.id)
                // Обновляем URL для редактирования черновика
                if (!isEdit) {
                    router.replace(`/business/settings/advertisements/create?edit=${response.id}`, { scroll: false })
                }
                return response.id
            }
        } catch (error) {
            // Если ошибка 401 (Unauthorized), LaravelAxios должен автоматически обновить токен
            // Но если это не помогло, просто пропускаем сохранение драфта
            if (error.response?.status === 401) {
                // Не показываем ошибку пользователю - возможно токен обновится при следующем запросе
                return null
            }
            // Для других ошибок тоже не показываем пользователю, чтобы не мешать работе
            return null
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        // СТРОГАЯ проверка: сохраняем ТОЛЬКО если мы на последнем шаге
        const isLastSection = activeSection === SECTIONS[SECTIONS.length - 1].id
        if (!isLastSection) {
            // Если не на последнем шаге, НЕ сохраняем и НЕ переходим
            // Просто блокируем отправку формы
            return
        }
        
        // Дополнительная проверка: убеждаемся, что это действительно последний шаг
        const lastSectionId = SECTIONS[SECTIONS.length - 1].id
        if (activeSection !== lastSectionId) {
            return
        }
        
        // Защита от двойного вызова
        if (createMutation.isPending || updateMutation.isPending) {
            return
        }

        const publishCheck = validateAdvertisementForPublish(formData, t)
        if (publishCheck) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {publishCheck.message}
                </Notification>,
            )
            setActiveSection(publishCheck.section)
            return
        }

        // Подготавливаем данные для отправки из актуального состояния
        // Дополнительные услуги теперь хранятся в БД, не отправляем их в JSON
        const servicesData = Array.isArray(formData.services)
            ? formData.services.map((service) => {
                  const mapped = mapAdvertisementServiceForSubmit(service)
                  const { additional_services: _a, ...withoutAdditional } = mapped
                  return withoutAdditional
              })
            : []
        
        // Отправляем данные на бэкенд
        const submitData = {
            type: 'regular', // Всегда обычное объявление
            title: formData.title,
            description: formData.description || null,
            image: denormalizeImageUrl(formData.image) || null,
            link: formData.link || null,
            category_id: formData.category_id || null,
            city: formData.city || null,
            state: formData.state || null,
            placement: 'services', // Всегда маркетплейс в каталоге услуг
            // Дополнительные данные
            services: servicesData,
            // Команда - отправляем массив выбранных участников
            team: Array.isArray(formData.team) && formData.team.length > 0
                ? (formData.team[0] && typeof formData.team[0] === 'object' && ('id' in formData.team[0] || 'name' in formData.team[0])
                    ? formData.team // Уже массив объектов
                    : formData.team.map(id => {
                        const member = companyTeam.find(m => m.id === id)
                        return member ? {
                            id: member.id,
                            name: member.name,
                            role: member.role,
                            description: member.email || '',
                            avatar: member.img || ''
                        } : null
                    }).filter(Boolean)
                )
                : [],
            schedule: formData.schedule || null,
            slot_step_minutes: normalizeSlotStepMinutes(formData.slot_step_minutes),
            priceFrom: formData.priceFrom !== '' && formData.priceFrom != null ? formData.priceFrom : null,
            priceTo: formData.priceTo !== '' && formData.priceTo != null ? formData.priceTo : null,
            currency: 'USD',
            portfolio: Array.isArray(formData.portfolio) 
                ? formData.portfolio.map(item => ({
                    ...item,
                    imageUrl: item.imageUrl ? denormalizeImageUrl(item.imageUrl) : item.imageUrl,
                    images: Array.isArray(item.images) 
                        ? item.images.map(img => denormalizeImageUrl(img))
                        : item.images
                }))
                : [],
            // Даты размещения
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            // ВАЖНО: При финальном сохранении (публикации) НЕ передаем status: draft
            // Бэкенд установит pending и запустит модерацию
        }
        
        // ВАЖНО: Удаляем status из submitData - при финальном сохранении бэкенд сам ставит pending
        // Это нужно чтобы объявление прошло модерацию, а не осталось как черновик
        delete submitData.status
        
        // Убеждаемся, что команда и портфолио всегда передаются при обновлении
        // Используем draftId, если он есть (черновик был создан ранее)
        const idToUse = isEdit ? Number(editId) : (draftId ? Number(draftId) : null)
        
        if (idToUse) {
            // При обновлении (редактирование или обновление черновика) всегда передаем команду из текущего объявления, если она не была изменена
            if (!submitData.team || submitData.team.length === 0) {
                const currentTeam = advertisement?.team || []
                if (Array.isArray(currentTeam) && currentTeam.length > 0) {
                    // Если команда - массив объектов, оставляем как есть
                    submitData.team = currentTeam[0] && typeof currentTeam[0] === 'object' 
                        ? currentTeam 
                        : (typeof currentTeam === 'string' ? JSON.parse(currentTeam) : [])
                }
            }
            // Убеждаемся, что портфолио всегда передается (даже если пустое)
            if (!submitData.hasOwnProperty('portfolio')) {
                submitData.portfolio = Array.isArray(formData.portfolio) ? formData.portfolio : []
            }
            // Обновляем существующее объявление или черновик
            updateMutation.mutate(submitData)
        } else {
            // При создании также убеждаемся, что портфолио передается
            if (!submitData.hasOwnProperty('portfolio')) {
                submitData.portfolio = Array.isArray(formData.portfolio) ? formData.portfolio : []
            }
            createMutation.mutate(submitData)
        }
    }

    const addService = () => {
        setFormData((prev) => ({
            ...prev,
            services: [
                {
                    id: nextAdvertisementServiceTempId(),
                    name: '',
                    price: '',
                    duration: '',
                    duration_unit: 'hours',
                    description: '',
                    service_id: null,
                    additional_services: [],
                },
                ...(prev.services || []),
            ],
        }))
    }

    const removeService = (id) => {
        setFormData({
            ...formData,
            services: (formData.services || []).filter(s => s.id !== id)
        })
    }

    const updateService = (id, field, value) => {
        setFormData({
            ...formData,
            services: (formData.services || []).map(s => {
                if (s.id === id) {
                    const updated = { ...s, [field]: value }
                    return updated
                }
                return s
            })
        })
    }

    // Обработка выбора услуги из таблицы
    const handleSelectServiceFromTable = async (serviceId, serviceIndex) => {
        const selectedService = companyServices.find(s => s.id === serviceId)
        if (!selectedService) return

        // Обновляем услугу в форме
        const updatedServices = [...(formData.services || [])]
        const templateMinutes =
            Number(selectedService.duration_minutes ?? selectedService.duration ?? 0) || 0
        const { value: tplDur, unit: tplUnit } = advertisementMinutesToDisplay(
            templateMinutes,
            selectedService.duration_unit || 'hours',
        )
        updatedServices[serviceIndex] = {
            ...updatedServices[serviceIndex],
            service_id: selectedService.id,
            name: selectedService.name || updatedServices[serviceIndex].name,
            price: selectedService.price || updatedServices[serviceIndex].price,
            duration: tplDur,
            duration_unit: tplUnit,
            description: selectedService.description || updatedServices[serviceIndex].description,
        }

        setFormData({
            ...formData,
            services: updatedServices,
        })
    }

    // Функции для работы с локальными дополнительными услугами
    const addAdditionalServiceToService = (serviceId, additionalServiceData) => {
        const updatedServices = (formData.services || []).map(service => {
            if (service.id === serviceId) {
                const additionalServices = service.additional_services || []
                const newAdditionalService = {
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: additionalServiceData.name || '',
                    description: additionalServiceData.description || '',
                    price: additionalServiceData.price || 0,
                    duration: additionalServiceData.duration || null,
                    is_local: true,
                    ...additionalServiceData
                }

                return {
                    ...service,
                    additional_services: [...additionalServices, newAdditionalService]
                }
            }
            return service
        })

        setFormData({
            ...formData,
            services: updatedServices
        })
    }

    const updateAdditionalServiceInService = (serviceId, additionalServiceId, updates) => {
        const updatedServices = (formData.services || []).map(service => {
            if (service.id === serviceId) {
                const additionalServices = (service.additional_services || []).map(addService => {
                    if (addService.id === additionalServiceId) {
                        return { ...addService, ...updates }
                    }
                    return addService
                })
                return {
                    ...service,
                    additional_services: additionalServices
                }
            }
            return service
        })
        setFormData({
            ...formData,
            services: updatedServices
        })
    }

    const removeAdditionalServiceFromService = (serviceId, additionalServiceId) => {
        const updatedServices = (formData.services || []).map(service => {
            if (service.id === serviceId) {
                const additionalServices = (service.additional_services || []).filter(
                    addService => addService.id !== additionalServiceId
                )
                return {
                    ...service,
                    additional_services: additionalServices
                }
            }
            return service
        })
        setFormData({
            ...formData,
            services: updatedServices
        })
    }

    // Обработка очистки выбора услуги (ручной ввод)
    const handleClearServiceSelection = (serviceIndex) => {
        const updatedServices = [...(formData.services || [])]
        updatedServices[serviceIndex] = {
            ...updatedServices[serviceIndex],
            service_id: null,
        }

        setFormData({
            ...formData,
            services: updatedServices,
        })
    }

    // Работа с командой - выбор из существующей команды компании
    const toggleTeamMember = (memberId) => {
        // Преобразуем team в массив ID для работы с формой
        const currentTeamIds = Array.isArray(formData.team) 
            ? formData.team.map(m => typeof m === 'object' ? (m.id || m) : m)
            : []
        
        const newTeamIds = currentTeamIds.includes(memberId)
            ? currentTeamIds.filter(id => id !== memberId)
            : [...currentTeamIds, memberId]
        
        setFormData({
            ...formData,
            team: newTeamIds
        })
    }

    const updateSchedule = (day, field, value) => {
        setFormData({
            ...formData,
            schedule: {
                ...(formData.schedule || {}),
                [day]: {
                    ...(formData.schedule?.[day] || { enabled: false, from: '09:00', to: '18:00' }),
                    [field]: value
                }
            }
        })
    }

    if (isEdit && isLoadingAd) {
        return (
            <PermissionGuard permission="manage_settings">
                <Container>
                    <AdaptiveCard>
                        <div className="flex min-h-[400px] items-center justify-center">
                            <Loading loading />
                        </div>
                    </AdaptiveCard>
                </Container>
            </PermissionGuard>
        )
    }

    return (
        <PermissionGuard permission="manage_settings">
            <Container>
                <AdaptiveCard>
                    <div className="flex min-w-0 max-w-full flex-col gap-4 overflow-x-hidden">
                        <AdvertisementCreatePageHeader isEdit={isEdit} />

                <form
                    className="border-t border-gray-200 pt-4 dark:border-gray-700"
                    onSubmit={handleSubmit}
                    onKeyDown={async (e) => {
                    // Предотвращаем отправку формы при нажатии Enter на промежуточных шагах
                    // НО НЕ на последнем шаге - там Enter должен вызвать handleSubmit
                    if (e.key === 'Enter') {
                        const isLastSection = activeSection === SECTIONS[SECTIONS.length - 1].id
                        if (isLastSection) {
                            // На последнем шаге НЕ вызываем saveDraft - пусть сработает handleSubmit
                            return
                        }
                        
                        e.preventDefault()
                        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection)
                        const nextSection = SECTIONS[currentIndex + 1]
                        
                        // Сохраняем драфт при переходе на следующий шаг, начиная со 2-го
                        if (currentIndex >= 1 && nextSection) {
                            await saveDraft()
                        }
                        
                        if (currentIndex < SECTIONS.length - 1) {
                            setActiveSection(nextSection.id)
                        }
                    }
                }}>
                    <div className="grid w-full max-w-full grid-cols-1 items-start gap-3 overflow-x-hidden sm:gap-6 lg:grid-cols-12">
                        <AdvertisementCreateSectionNav
                            sections={SECTIONS}
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                            saveDraft={saveDraft}
                        />

                        <div className="min-w-0 lg:col-span-9">
                            <div className="min-w-0 space-y-4 overflow-x-hidden sm:space-y-6 sm:rounded-2xl sm:border sm:border-gray-200 sm:bg-white sm:p-6 dark:sm:border-gray-700 dark:sm:bg-gray-800">
                                    {activeSection === 'general' && (
                                        <AdvertisementCreateGeneralSection
                                            formData={formData}
                                            setFormData={setFormData}
                                            categories={categories}
                                            states={states}
                                            cities={cities}
                                            citiesLoading={citiesLoading}
                                            selectedStateId={selectedStateId}
                                            setSelectedStateId={setSelectedStateId}
                                            isUploadingImage={isUploadingImage}
                                            handleImageUpload={handleImageUpload}
                                            isEdit={isEdit}
                                        />
                                    )}
                                    {activeSection === 'pricing' && (
                                        <AdvertisementCreatePricingSection
                                            formData={formData}
                                            setFormData={setFormData}
                                        />
                                    )}
                                    {activeSection === 'services' && (
                                        <AdvertisementCreateServicesSection
                                            formData={formData}
                                            setFormData={setFormData}
                                            companyServices={companyServices}
                                            addService={addService}
                                            removeService={removeService}
                                            updateService={updateService}
                                            handleSelectServiceFromTable={handleSelectServiceFromTable}
                                            handleClearServiceSelection={handleClearServiceSelection}
                                        />
                                    )}
                                    {activeSection === 'schedule' && (
                                        <AdvertisementCreateScheduleSection
                                            formData={formData}
                                            setFormData={setFormData}
                                            updateSchedule={updateSchedule}
                                        />
                                    )}
                                    {activeSection === 'team' && (
                                        <AdvertisementCreateTeamSection
                                            formData={formData}
                                            companyTeam={companyTeam}
                                            toggleTeamMember={toggleTeamMember}
                                        />
                                    )}
                                    {activeSection === 'portfolio' && (
                                        <AdvertisementCreatePortfolioSection
                                            formData={formData}
                                            setFormData={setFormData}
                                            isUploadingImage={isUploadingImage}
                                            setIsUploadingImage={setIsUploadingImage}
                                            newPortfolioItem={newPortfolioItem}
                                            setNewPortfolioItem={setNewPortfolioItem}
                                            showAddPortfolioForm={showAddPortfolioForm}
                                            setShowAddPortfolioForm={setShowAddPortfolioForm}
                                            uploadKey={uploadKey}
                                            setUploadKey={setUploadKey}
                                        />
                                    )}

                                    {/* Кнопки действий */}
                                    <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex gap-2">
                                            <Link href="/business/advertisements">
                                                <Button variant="plain" type="button">
                                                    {t('buttons.cancel')}
                                                </Button>
                                            </Link>
                                            {activeSection !== SECTIONS[0].id && (
                                                <Button
                                                    variant="plain"
                                                    type="button"
                                                    onClick={() => {
                                                        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection)
                                                        if (currentIndex > 0) {
                                                            setActiveSection(SECTIONS[currentIndex - 1].id)
                                                        }
                                                    }}
                                                >
                                                    {t('buttons.back')}
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {activeSection !== SECTIONS[SECTIONS.length - 1].id ? (
                                                <Button
                                                    variant="solid"
                                                    type="button"
                                                    onClick={async (e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection)
                                                        const nextSection = SECTIONS[currentIndex + 1]
                                                        
                                                        // Сохраняем драфт при переходе на следующий шаг, начиная со 2-го
                                                        if (currentIndex >= 1 && nextSection) {
                                                            await saveDraft()
                                                        }
                                                        
                                                        if (currentIndex < SECTIONS.length - 1) {
                                                            setActiveSection(nextSection.id)
                                                        }
                                                    }}
                                                >
                                                    {t('buttons.next')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="solid"
                                                    type="submit"
                                                    loading={createMutation.isPending || updateMutation.isPending}
                                                    onClick={(e) => {
                                                        // Убеждаемся, что мы действительно на последнем шаге
                                                        if (activeSection !== SECTIONS[SECTIONS.length - 1].id) {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            return
                                                        }
                                                    }}
                                                >
                                                    {isEdit ? t('save') : t('create')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                </form>
                    </div>
                </AdaptiveCard>
            </Container>
        </PermissionGuard>
    )
}

