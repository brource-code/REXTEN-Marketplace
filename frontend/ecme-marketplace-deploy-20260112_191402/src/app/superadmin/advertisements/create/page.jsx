'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Card from '@/components/ui/Card'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdvertisement, updateAdvertisement, getAdvertisement, getCompanies, getCompanyTeam, getCompanyServices } from '@/lib/api/superadmin'
import { getAdditionalServices } from '@/lib/api/additionalServices'
import { getCategories, getStates } from '@/lib/api/marketplace'
import LaravelAxios from '@/services/axios/LaravelAxios'
import Upload from '@/components/ui/Upload'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Loading from '@/components/shared/Loading'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { 
    PiArrowLeft, 
    PiInfo, 
    PiCurrencyDollar, 
    PiCalendar, 
    PiUsers, 
    PiImages,
    PiPlus,
    PiTrash,
    PiX
} from 'react-icons/pi'
import Link from 'next/link'
import classNames from '@/utils/classNames'

// Компонент для отображения дополнительных услуг (только просмотр)
const ServiceAdditionalServicesView = ({ serviceId }) => {
    const { data: additionalServices = [], isLoading } = useQuery({
        queryKey: ['additional-services', serviceId],
        queryFn: () => getAdditionalServices(serviceId),
        enabled: !!serviceId,
    })

    if (isLoading) {
        return (
            <div className="text-sm text-gray-500">
                Загрузка дополнительных услуг...
            </div>
        )
    }

    if (!additionalServices || additionalServices.length === 0) {
        return null
    }

    return (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дополнительные услуги:
            </p>
            <div className="space-y-1">
                {additionalServices.filter(s => s.is_active).map((addService) => {
                    const price = typeof addService.price === 'number' ? addService.price : (typeof addService.price === 'string' ? parseFloat(addService.price) : 0);
                    const numericPrice = isNaN(price) ? 0 : price;
                    return (
                    <div key={addService.id} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                        <span>{addService.name}</span>
                        <span className="font-medium">${numericPrice.toFixed(2)}</span>
                    </div>
                    );
                })}
            </div>
        </div>
    )
}

const SECTIONS = [
    { id: 'general', label: 'Общая информация', icon: PiInfo },
    { id: 'pricing', label: 'Цена', icon: PiCurrencyDollar },
    { id: 'services', label: 'Услуги', icon: PiCalendar },
    { id: 'schedule', label: 'Расписание', icon: PiCalendar },
    { id: 'team', label: 'Команда', icon: PiUsers },
]

export default function CreateAdvertisementPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const editId = searchParams.get('edit')
    const isEdit = !!editId

    const [activeSection, setActiveSection] = useState('general')
    const [formData, setFormData] = useState({
        type: 'advertisement',
        title: '',
        description: '',
        image: '',
        link: '',
        category: '',
        company_id: null,
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
        // Команда
        team: [],
        // Режим работы с командой: 'select' - выбор из компании, 'create' - создание новой
        teamMode: 'select',
        // Даты
        start_date: '',
        end_date: '',
        priority: 1,
        is_active: true,
    })
    const [isUploadingImage, setIsUploadingImage] = useState(false)

    // Загрузка данных для редактирования
    const { data: advertisement, isLoading: isLoadingAd } = useQuery({
        queryKey: ['advertisement', editId],
        queryFn: () => getAdvertisement(Number(editId)),
        enabled: isEdit && !!editId,
    })

    // Загрузка категорий
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    })

    // Загрузка штатов
    const { data: states = [] } = useQuery({
        queryKey: ['states'],
        queryFn: getStates,
    })

    // Загрузка компаний
    const { data: companiesData } = useQuery({
        queryKey: ['companies'],
        queryFn: () => getCompanies({ pageSize: 1000 }),
    })
    const companies = companiesData?.data || []

    // Загрузка команды компании (если выбрана компания)
    const { data: companyTeam = [] } = useQuery({
        queryKey: ['company-team', formData.company_id],
        queryFn: () => getCompanyTeam(formData.company_id),
        enabled: !!formData.company_id && formData.teamMode === 'select',
    })

    // Загрузка услуг компании (если выбрана компания)
    const { data: companyServices = [] } = useQuery({
        queryKey: ['company-services', formData.company_id],
        queryFn: () => getCompanyServices(formData.company_id),
        enabled: !!formData.company_id,
    })

    // Заполнение формы при редактировании
    useEffect(() => {
        if (advertisement && isEdit) {
            setFormData({
                type: advertisement.type || 'advertisement',
                title: advertisement.title || '',
                description: advertisement.description || '',
                image: advertisement.image || '',
                link: advertisement.link || '',
                category: '',
                company_id: advertisement.company_id || null,
                city: advertisement.city || '',
                state: advertisement.state || '',
                priceFrom: advertisement.price_from || '',
                priceTo: advertisement.price_to || '',
                currency: advertisement.currency || 'USD',
                services: advertisement.services || [],
                team: advertisement.team || [],
                teamMode: advertisement.company_id ? 'select' : 'create',
                schedule: advertisement.schedule || {
                    monday: { enabled: true, from: '09:00', to: '18:00' },
                    tuesday: { enabled: true, from: '09:00', to: '18:00' },
                    wednesday: { enabled: true, from: '09:00', to: '18:00' },
                    thursday: { enabled: true, from: '09:00', to: '18:00' },
                    friday: { enabled: true, from: '09:00', to: '18:00' },
                    saturday: { enabled: false, from: '09:00', to: '18:00' },
                    sunday: { enabled: false, from: '09:00', to: '18:00' },
                },
                start_date: advertisement.start_date ? advertisement.start_date.split('T')[0] : '',
                end_date: advertisement.end_date ? advertisement.end_date.split('T')[0] : '',
                priority: advertisement.priority || 1,
                is_active: advertisement.is_active !== undefined ? advertisement.is_active : true,
            })
        }
    }, [advertisement, isEdit])

    // Загрузка изображения
    const handleImageUpload = async (files) => {
        if (!files || files.length === 0) return
        
        const file = files[0]
        setIsUploadingImage(true)
        
        try {
            const uploadFormData = new FormData()
            uploadFormData.append('image', file)
            
            const response = await LaravelAxios.post('/admin/advertisements/upload-image', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            
            setFormData(prev => ({ ...prev, image: response.data.url }))
            toast.push(
                <Notification title="Успешно" type="success">
                    Изображение загружено
                </Notification>
            )
        } catch (error) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось загрузить изображение: {error.response?.data?.message || error.message}
                </Notification>
            )
        } finally {
            setIsUploadingImage(false)
        }
    }

    const isAdvertisement = formData.type === 'advertisement'

    const createMutation = useMutation({
        mutationFn: createAdvertisement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Объявление создано
                </Notification>
            )
            router.push('/superadmin/advertisements')
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось создать объявление: {error.message || 'Неизвестная ошибка'}
                </Notification>
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data) => updateAdvertisement(Number(editId), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advertisements'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Объявление обновлено
                </Notification>
            )
            router.push('/superadmin/advertisements')
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить объявление: {error.message || 'Неизвестная ошибка'}
                </Notification>
            )
        },
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        
        // Подготавливаем данные для отправки
        const submitData = {
            type: formData.type || 'advertisement',
            title: formData.title,
            description: formData.description || null,
            image: formData.image || null,
            link: formData.link || null,
            company_id: formData.company_id || null,
            city: formData.city || null,
            state: formData.state || null,
            priority: formData.priority || 1,
            is_active: formData.is_active !== undefined ? formData.is_active : true,
            // Дополнительные данные - отправляем массивы даже если они пустые, бэкенд обработает
            services: Array.isArray(formData.services) ? formData.services : [],
            team: Array.isArray(formData.team) ? formData.team : [],
            schedule: formData.schedule || null,
            priceFrom: formData.priceFrom && formData.priceFrom !== '' ? formData.priceFrom : null,
            priceTo: formData.priceTo && formData.priceTo !== '' ? formData.priceTo : null,
            currency: formData.currency || 'USD',
            placement: 'services',
        }
        
        // Для обычных объявлений полностью удаляем поля дат
        if (formData.type === 'regular') {
            delete submitData.start_date
            delete submitData.end_date
        } else if (formData.type === 'advertisement') {
            // Для рекламных объявлений даты обязательны
            submitData.start_date = formData.start_date
            submitData.end_date = formData.end_date
        }
        
        // Логирование для отладки
        console.log('Отправка данных объявления:', {
            ...submitData,
            servicesCount: submitData.services?.length || 0,
            teamCount: submitData.team?.length || 0,
        })
        
        if (isEdit) {
            updateMutation.mutate(submitData)
        } else {
            createMutation.mutate(submitData)
        }
    }

    const addService = () => {
        setFormData({
            ...formData,
            services: [...(formData.services || []), { id: Date.now(), name: '', price: '', duration: '', description: '', service_id: null }]
        })
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
            services: (formData.services || []).map(s => s.id === id ? { ...s, [field]: value } : s)
        })
    }

    // Обработка выбора услуги из таблицы
    const handleSelectServiceFromTable = async (serviceId, serviceIndex) => {
        const selectedService = companyServices.find(s => s.id === serviceId)
        if (!selectedService) return

        // Обновляем услугу в форме
        const updatedServices = [...(formData.services || [])]
        updatedServices[serviceIndex] = {
            ...updatedServices[serviceIndex],
            service_id: selectedService.id,
            name: selectedService.name || updatedServices[serviceIndex].name,
            price: selectedService.price || updatedServices[serviceIndex].price,
            duration: selectedService.duration_minutes || selectedService.duration || updatedServices[serviceIndex].duration,
            description: selectedService.description || updatedServices[serviceIndex].description,
        }

        setFormData({
            ...formData,
            services: updatedServices,
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

    // Работа с командой
    const toggleTeamMember = (memberId) => {
        setFormData({
            ...formData,
            team: formData.team.includes(memberId)
                ? formData.team.filter(id => id !== memberId)
                : [...formData.team, memberId]
        })
    }

    const addTeamMember = () => {
        setFormData({
            ...formData,
            team: [...(formData.team || []), { id: Date.now(), name: '', role: '', description: '', avatar: '' }]
        })
    }

    const removeTeamMember = (id) => {
        setFormData({
            ...formData,
            team: (formData.team || []).filter(t => {
                // Если это ID из выбранных, просто удаляем
                if (typeof t === 'number') {
                    return t !== id
                }
                // Если это объект, удаляем по id
                return t.id !== id
            })
        })
    }

    const updateTeamMember = (id, field, value) => {
        setFormData({
            ...formData,
            team: (formData.team || []).map(t => {
                // Если это ID, пропускаем
                if (typeof t === 'number') return t
                // Если это объект, обновляем
                return t.id === id ? { ...t, [field]: value } : t
            })
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
            <Container>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loading loading />
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <div className="space-y-6">
                {/* Заголовок */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/superadmin/advertisements">
                            <Button variant="plain" icon={<PiArrowLeft />} />
                        </Link>
                        <div>
                            <h3 className="text-xl font-semibold">
                                {isEdit ? 'Редактировать объявление' : 'Создать объявление'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Заполните все разделы для создания объявления
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid lg:grid-cols-12 gap-6">
                        {/* Боковое меню разделов */}
                        <div className="lg:col-span-3">
                            <Card className="sticky top-24">
                                <div className="p-4 space-y-1">
                                    {SECTIONS.map((section) => {
                                        const Icon = section.icon
                                        return (
                                            <button
                                                key={section.id}
                                                type="button"
                                                onClick={() => setActiveSection(section.id)}
                                                className={classNames(
                                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                                                    activeSection === section.id
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                )}
                                            >
                                                <Icon className="text-base" />
                                                <span className="hidden sm:inline">{section.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </Card>
                        </div>

                        {/* Основной контент */}
                        <div className="lg:col-span-9">
                            <Card>
                                <div className="p-6 space-y-6">
                                    {/* Общая информация */}
                                    {activeSection === 'general' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold">Общая информация</h4>
                                            
                                            <FormItem label="Тип объявления" required>
                                                <Select
                                                    size="sm"
                                                    options={[
                                                        { value: 'advertisement', label: 'Рекламное' },
                                                        { value: 'regular', label: 'Обычное' },
                                                    ]}
                                                    value={formData.type === 'advertisement' ? { value: 'advertisement', label: 'Рекламное' } : { value: 'regular', label: 'Обычное' }}
                                                    onChange={(option) => setFormData({ ...formData, type: option.value })}
                                                />
                                            </FormItem>

                                            <FormItem label="Название" required>
                                                <Input
                                                    size="sm"
                                                    value={formData.title || ''}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    placeholder="Введите название объявления"
                                                    required
                                                />
                                            </FormItem>

                                            <FormItem label="Описание">
                                                <Input
                                                    value={formData.description || ''}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder="Подробное описание объявления"
                                                    textArea
                                                    rows={4}
                                                />
                                            </FormItem>

                                            <FormItem label="Компания">
                                                <Select
                                                    size="sm"
                                                    options={companies.map(comp => ({ value: comp.id, label: comp.name }))}
                                                    value={companies.find(c => c.id === formData.company_id) ? { value: formData.company_id, label: companies.find(c => c.id === formData.company_id).name } : null}
                                                    onChange={(option) => setFormData({ ...formData, company_id: option?.value || null })}
                                                    isClearable
                                                />
                                            </FormItem>

                                            <FormItem label="Категория">
                                                <Select
                                                    size="sm"
                                                    options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                                                    value={categories.find(c => c.id === formData.category) ? { value: formData.category, label: categories.find(c => c.id === formData.category).name } : null}
                                                    onChange={(option) => setFormData({ ...formData, category: option?.value || '' })}
                                                />
                                            </FormItem>

                                            <div className="grid grid-cols-2 gap-4">
                                                <FormItem label="Город">
                                                    <Input
                                                        size="sm"
                                                        value={formData.city || ''}
                                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                        placeholder="Нью-Йорк"
                                                    />
                                                </FormItem>
                                                <FormItem label="Штат">
                                                    <Select
                                                        size="sm"
                                                        options={states.map(state => ({ value: state.id, label: state.name }))}
                                                        value={states.find(s => s.id === formData.state) ? { value: formData.state, label: states.find(s => s.id === formData.state).name } : null}
                                                        onChange={(option) => setFormData({ ...formData, state: option?.value || '' })}
                                                        isClearable
                                                        placeholder="Выберите штат"
                                                    />
                                                </FormItem>
                                            </div>

                                            <FormItem label="Изображение">
                                                <div className="space-y-3">
                                                    <Upload
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        uploadLimit={1}
                                                        disabled={isUploadingImage}
                                                    >
                                                        <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition">
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {isUploadingImage ? 'Загрузка...' : 'Нажмите или перетащите файл для загрузки'}
                                                            </p>
                                                        </div>
                                                    </Upload>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        Или введите URL изображения:
                                                    </div>
                                                    <Input
                                                        size="sm"
                                                        value={formData.image || ''}
                                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                                        placeholder="https://example.com/image.jpg"
                                                    />
                                                    {formData.image && (
                                                        <div className="mt-2">
                                                            <img src={normalizeImageUrl(formData.image)} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700" onError={(e) => { e.target.style.display = 'none' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </FormItem>

                                            <FormItem label="Ссылка">
                                                <Input
                                                    size="sm"
                                                    value={formData.link || ''}
                                                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                                    placeholder="https://example.com или /marketplace/slug"
                                                />
                                            </FormItem>

                                            {/* Даты только для рекламных объявлений */}
                                            {isAdvertisement && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormItem label="Дата начала" required>
                                                        <Input
                                                            size="sm"
                                                            type="date"
                                                            value={formData.start_date || ''}
                                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                            required
                                                        />
                                                    </FormItem>

                                                    <FormItem label="Дата окончания" required>
                                                        <Input
                                                            size="sm"
                                                            type="date"
                                                            value={formData.end_date || ''}
                                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                            required
                                                        />
                                                    </FormItem>
                                                </div>
                                            )}

                                            <FormItem label="Приоритет">
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={formData.priority || 1}
                                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                                                />
                                            </FormItem>

                                            <FormItem label="Статус">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="is_active"
                                                        checked={formData.is_active}
                                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                                                        Активно
                                                    </label>
                                                </div>
                                            </FormItem>
                                        </div>
                                    )}

                                    {/* Цена */}
                                    {activeSection === 'pricing' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold">Цена</h4>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormItem label="Цена от">
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        value={formData.priceFrom || ''}
                                                        onChange={(e) => setFormData({ ...formData, priceFrom: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </FormItem>

                                                <FormItem label="Цена до">
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        value={formData.priceTo || ''}
                                                        onChange={(e) => setFormData({ ...formData, priceTo: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </FormItem>
                                            </div>

                                            <FormItem label="Валюта">
                                                <Select
                                                    size="sm"
                                                    options={[
                                                        { value: 'USD', label: 'USD ($)' },
                                                        { value: 'EUR', label: 'EUR (€)' },
                                                        { value: 'RUB', label: 'RUB (₽)' },
                                                    ]}
                                                    value={{ value: formData.currency, label: formData.currency }}
                                                    onChange={(option) => setFormData({ ...formData, currency: option.value })}
                                                />
                                            </FormItem>
                                        </div>
                                    )}

                                    {/* Услуги */}
                                    {activeSection === 'services' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-lg font-semibold">Услуги</h4>
                                                <Button
                                                    size="sm"
                                                    icon={<PiPlus />}
                                                    onClick={addService}
                                                    type="button"
                                                >
                                                    Добавить услугу
                                                </Button>
                                            </div>

                                            <div className="space-y-4">
                                                {(formData.services || []).map((service, index) => (
                                                    <Card key={service.id} className="p-4">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <h5 className="font-medium">Услуга #{index + 1}</h5>
                                                            <Button
                                                                size="sm"
                                                                variant="plain"
                                                                icon={<PiTrash />}
                                                                onClick={() => removeService(service.id)}
                                                                type="button"
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            {/* Выбор услуги из таблицы (если выбрана компания) */}
                                                            {formData.company_id && companyServices.length > 0 && (
                                                                <FormItem label="Выбрать услугу из компании">
                                                                    <Select
                                                                        size="sm"
                                                                        options={[
                                                                            { value: null, label: 'Ручной ввод' },
                                                                            ...companyServices.map(s => ({
                                                                                value: s.id,
                                                                                label: `${s.name} ($${s.price})`
                                                                            }))
                                                                        ]}
                                                                        value={service.service_id 
                                                                            ? { value: service.service_id, label: companyServices.find(s => s.id === service.service_id)?.name || 'Услуга' }
                                                                            : { value: null, label: 'Ручной ввод' }
                                                                        }
                                                                        onChange={(option) => {
                                                                            if (option.value) {
                                                                                handleSelectServiceFromTable(option.value, index)
                                                                            } else {
                                                                                handleClearServiceSelection(index)
                                                                            }
                                                                        }}
                                                                        isClearable
                                                                    />
                                                                </FormItem>
                                                            )}
                                                            
                                                            <FormItem label="Название услуги">
                                                                <Input
                                                                    size="sm"
                                                                    value={service.name || ''}
                                                                    onChange={(e) => updateService(service.id, 'name', e.target.value)}
                                                                    placeholder="Название услуги"
                                                                    disabled={!!service.service_id}
                                                                />
                                                            </FormItem>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <FormItem label="Цена">
                                                                    <Input
                                                                        size="sm"
                                                                        type="number"
                                                                        value={service.price || ''}
                                                                        onChange={(e) => updateService(service.id, 'price', e.target.value)}
                                                                        placeholder="0"
                                                                    />
                                                                </FormItem>
                                                                <FormItem label="Длительность">
                                                                    <Input
                                                                        size="sm"
                                                                        value={service.duration || ''}
                                                                        onChange={(e) => updateService(service.id, 'duration', e.target.value)}
                                                                        placeholder="1 час"
                                                                    />
                                                                </FormItem>
                                                            </div>
                                                            <FormItem label="Описание">
                                                                <Input
                                                                    value={service.description || ''}
                                                                    onChange={(e) => updateService(service.id, 'description', e.target.value)}
                                                                    placeholder="Описание услуги"
                                                                    textArea
                                                                    rows={2}
                                                                    disabled={!!service.service_id}
                                                                />
                                                            </FormItem>
                                                            
                                                            {/* Отображение дополнительных услуг (только для просмотра) */}
                                                            {service.service_id && (
                                                                <ServiceAdditionalServicesView serviceId={service.service_id} />
                                                            )}
                                                        </div>
                                                    </Card>
                                                ))}
                                                {(!formData.services || formData.services.length === 0) && (
                                                    <div className="text-center py-8 text-gray-500">
                                                        Нет услуг. Нажмите "Добавить услугу" чтобы добавить первую.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Расписание */}
                                    {activeSection === 'schedule' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold">Расписание работы</h4>
                                            
                                            <div className="space-y-3">
                                                {Object.entries(formData.schedule || {}).map(([day, schedule]) => {
                                                    if (!schedule) return null
                                                    const dayLabels = {
                                                        monday: 'Понедельник',
                                                        tuesday: 'Вторник',
                                                        wednesday: 'Среда',
                                                        thursday: 'Четверг',
                                                        friday: 'Пятница',
                                                        saturday: 'Суббота',
                                                        sunday: 'Воскресенье',
                                                    }
                                                    return (
                                                        <Card key={day} className="p-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2 min-w-[140px]">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={schedule.enabled}
                                                                        onChange={(e) => updateSchedule(day, 'enabled', e.target.checked)}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                    />
                                                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                        {dayLabels[day]}
                                                                    </label>
                                                                </div>
                                                                {schedule.enabled && (
                                                                    <div className="flex items-center gap-2 flex-1">
                                                                        <Input
                                                                            size="sm"
                                                                            type="time"
                                                                            value={schedule.from || '09:00'}
                                                                            onChange={(e) => updateSchedule(day, 'from', e.target.value)}
                                                                        />
                                                                        <span className="text-gray-500">—</span>
                                                                        <Input
                                                                            size="sm"
                                                                            type="time"
                                                                            value={schedule.to || '18:00'}
                                                                            onChange={(e) => updateSchedule(day, 'to', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Команда */}
                                    {activeSection === 'team' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-lg font-semibold">Команда</h4>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={formData.teamMode === 'select' ? 'solid' : 'plain'}
                                                        onClick={() => setFormData({ ...formData, teamMode: 'select', team: [] })}
                                                        type="button"
                                                    >
                                                        Выбрать из компании
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={formData.teamMode === 'create' ? 'solid' : 'plain'}
                                                        onClick={() => setFormData({ ...formData, teamMode: 'create', team: [] })}
                                                        type="button"
                                                    >
                                                        Создать новую
                                                    </Button>
                                                </div>
                                            </div>

                                            {formData.teamMode === 'select' ? (
                                                <>
                                                    {!formData.company_id ? (
                                                        <div className="text-center py-8 text-gray-500">
                                                            <p>Сначала выберите компанию в разделе "Общая информация"</p>
                                                        </div>
                                                    ) : companyTeam.length === 0 ? (
                                                        <div className="text-center py-8 text-gray-500">
                                                            <p>У выбранной компании нет участников команды</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {companyTeam.map((member) => {
                                                                const isSelected = formData.team.includes(member.id)
                                                                return (
                                                                    <Card 
                                                                        key={member.id} 
                                                                        className={`p-4 cursor-pointer transition ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-300'}`}
                                                                        onClick={() => toggleTeamMember(member.id)}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={() => toggleTeamMember(member.id)}
                                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                            />
                                                                            {member.img && (
                                                                                <img
                                                                                    src={member.img}
                                                                                    alt={member.name}
                                                                                    className="w-12 h-12 rounded-full object-cover"
                                                                                />
                                                                            )}
                                                                            <div className="flex-1">
                                                                                <div className="font-medium">{member.name}</div>
                                                                                <div className="text-sm text-gray-500">{member.role}</div>
                                                                                {member.email && (
                                                                                    <div className="text-xs text-gray-400">{member.email}</div>
                                                                                )}
                                                                            </div>
                                                                            {isSelected && (
                                                                                <Badge className="bg-blue-500">Выбрано</Badge>
                                                                            )}
                                                                        </div>
                                                                    </Card>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <p className="text-sm text-gray-500">Создайте новую команду для этого объявления</p>
                                                        <Button
                                                            size="sm"
                                                            icon={<PiPlus />}
                                                            onClick={addTeamMember}
                                                            type="button"
                                                        >
                                                            Добавить участника
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {(formData.team || []).filter(t => typeof t !== 'number').map((member, index) => (
                                                            <Card key={member.id} className="p-4">
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <h5 className="font-medium">Участник #{index + 1}</h5>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="plain"
                                                                        icon={<PiTrash />}
                                                                        onClick={() => removeTeamMember(member.id)}
                                                                        type="button"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <FormItem label="Имя">
                                                                            <Input
                                                                                size="sm"
                                                                                value={member.name || ''}
                                                                                onChange={(e) => updateTeamMember(member.id, 'name', e.target.value)}
                                                                                placeholder="Имя участника"
                                                                            />
                                                                        </FormItem>
                                                                        <FormItem label="Роль">
                                                                            <Input
                                                                                size="sm"
                                                                                value={member.role || ''}
                                                                                onChange={(e) => updateTeamMember(member.id, 'role', e.target.value)}
                                                                                placeholder="Роль"
                                                                            />
                                                                        </FormItem>
                                                                    </div>
                                                                    <FormItem label="Описание">
                                                                        <Input
                                                                            value={member.description || ''}
                                                                            onChange={(e) => updateTeamMember(member.id, 'description', e.target.value)}
                                                                            placeholder="Описание участника"
                                                                            textArea
                                                                            rows={2}
                                                                        />
                                                                    </FormItem>
                                                                    <FormItem label="Аватар (URL)">
                                                                        <Input
                                                                            size="sm"
                                                                            value={member.avatar || ''}
                                                                            onChange={(e) => updateTeamMember(member.id, 'avatar', e.target.value)}
                                                                            placeholder="https://example.com/avatar.jpg"
                                                                        />
                                                                    </FormItem>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                        {(!formData.team || formData.team.filter(t => typeof t !== 'number').length === 0) && (
                                                            <div className="text-center py-8 text-gray-500">
                                                                Нет участников команды. Нажмите "Добавить участника" чтобы добавить первого.
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Кнопки действий */}
                                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Link href="/superadmin/advertisements">
                                            <Button variant="plain" type="button">
                                                Отмена
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="solid"
                                            type="submit"
                                            loading={createMutation.isPending || updateMutation.isPending}
                                        >
                                            {isEdit ? 'Сохранить' : 'Создать'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </Container>
    )
}

