'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Dialog from '@/components/ui/Dialog'
import Tooltip from '@/components/ui/Tooltip'
import Switcher from '@/components/ui/Switcher'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
    createBusinessAdvertisement, 
    updateBusinessAdvertisement, 
    getBusinessAdvertisement,
    getTeamMembers,
    getBusinessServices
} from '@/lib/api/business'
import { 
    getAdditionalServices,
    createAdditionalService,
    updateAdditionalService,
    deleteAdditionalService
} from '@/lib/api/additionalServices'
import { getCategories, getStates } from '@/lib/api/marketplace'
import { getCitiesByState, getStateCode } from '@/lib/api/locations'
import { formatDuration } from '@/utils/formatDuration'
import LaravelAxios from '@/services/axios/LaravelAxios'
import Upload from '@/components/ui/Upload'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Loading from '@/components/shared/Loading'
import { 
    PiArrowLeft, 
    PiInfo, 
    PiCurrencyDollar, 
    PiCalendar, 
    PiUsers, 
    PiImages,
    PiPlus,
    PiTrash,
    PiX,
} from 'react-icons/pi'
import { TbPlus, TbPencil, TbTrash } from 'react-icons/tb'
import Link from 'next/link'
import classNames from '@/utils/classNames'

// Компонент для управления дополнительными услугами
const ServiceAdditionalServicesManager = ({ 
    serviceId, 
    serviceName,
    isNewService = false, // Флаг для новых услуг, которые еще не сохранены в БД
    serviceData = null, // Данные услуги для локального хранения дополнительных услуг
    onUpdateService = null, // Callback для обновления услуги в родительском компоненте
}) => {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [editingAdditionalService, setEditingAdditionalService] = useState(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [additionalServiceToDelete, setAdditionalServiceToDelete] = useState(null)

    // Для новых услуг (которые еще не сохранены в БД) не загружаем из API
    // Для существующих услуг загружаем из БД
    // Проверяем, что serviceId - это реальный ID из БД (не временный ID > 1000000)
    const isRealServiceId = serviceId && typeof serviceId === 'number' && serviceId < 1000000
    const { data: additionalServices = [], isLoading } = useQuery({
        queryKey: ['additional-services', serviceId],
        queryFn: () => getAdditionalServices(serviceId),
        enabled: !!isRealServiceId, // Загружаем только для реальных ID из БД
    })

    const createMutation = useMutation({
        mutationFn: createAdditionalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', serviceId] })
            setIsFormModalOpen(false)
            toast.push(
                <Notification title="Успешно" type="success">
                    Дополнительная услуга добавлена
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось добавить дополнительную услугу
                </Notification>,
            )
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateAdditionalService(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', serviceId] })
            setEditingAdditionalService(null)
            setIsFormModalOpen(false)
            toast.push(
                <Notification title="Успешно" type="success">
                    Дополнительная услуга обновлена
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить дополнительную услугу
                </Notification>,
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAdditionalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['additional-services', serviceId] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Дополнительная услуга удалена
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setAdditionalServiceToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось удалить дополнительную услугу
                </Notification>,
            )
        },
    })

    const handleAdd = () => {
        // Разрешаем создание дополнительных услуг для новых услуг
        // Они будут сохранены локально до сохранения объявления
        setEditingAdditionalService(null)
        setIsFormModalOpen(true)
    }

    const handleEdit = (additionalService) => {
        setEditingAdditionalService(additionalService)
        setIsFormModalOpen(true)
    }

    const handleDelete = (id) => {
        setAdditionalServiceToDelete(id)
        setIsDeleteDialogOpen(true)
    }
    
    const handleDeleteConfirm = () => {
        if (!additionalServiceToDelete) return
        
        // Если это новая услуга, удаляем локально
        if (isNewService && onUpdateService && serviceData) {
            const currentAdditionalServices = serviceData?.additional_services || []
            const updatedAdditionalServices = currentAdditionalServices.filter(
                item => item.id !== additionalServiceToDelete
            )
            
            onUpdateService({
                ...serviceData,
                additional_services: updatedAdditionalServices,
            })
            
            setIsDeleteDialogOpen(false)
            setAdditionalServiceToDelete(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    Дополнительная услуга удалена
                </Notification>,
            )
            return
        }
        
        // Для существующих услуг удаляем через API
        deleteMutation.mutate(additionalServiceToDelete)
    }

    const handleSave = (data) => {
        // Если это новая услуга (еще не сохранена в БД), сохраняем локально
        if (isNewService && onUpdateService && serviceData) {
            const currentAdditionalServices = serviceData?.additional_services || []
            let updatedAdditionalServices
            
            if (editingAdditionalService) {
                // Обновляем существующую локальную дополнительную услугу
                updatedAdditionalServices = currentAdditionalServices.map(item => 
                    item.id === editingAdditionalService.id 
                        ? { ...item, ...data }
                        : item
                )
            } else {
                // Добавляем новую локальную дополнительную услугу
                const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                updatedAdditionalServices = [...currentAdditionalServices, {
                    id: newId,
                    ...data,
                    is_active: true,
                }]
            }
            
            // Обновляем услугу в родительском компоненте
            onUpdateService({
                ...serviceData,
                additional_services: updatedAdditionalServices,
            })
            
            setIsFormModalOpen(false)
            setEditingAdditionalService(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    {editingAdditionalService ? 'Дополнительная услуга обновлена' : 'Дополнительная услуга добавлена'}
                </Notification>,
            )
            return
        }
        
        // Для существующих услуг сохраняем в БД через API
        // Проверяем, что serviceId - это реальный ID из БД (не временный ID)
        const isRealServiceId = serviceId && typeof serviceId === 'number' && serviceId < 1000000
        if (!isRealServiceId) {
            // Если это не реальный ID из БД, значит это новая услуга
            // Но мы уже обработали это выше, так что это ошибка
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить дополнительную услугу. Убедитесь, что услуга сохранена в БД.
                </Notification>,
            )
            return
        }

        if (editingAdditionalService) {
            updateMutation.mutate({
                id: editingAdditionalService.id,
                data,
            })
        } else {
            createMutation.mutate({
                ...data,
                service_id: serviceId,
                is_active: true,
            })
        }
    }

    // Используем данные из БД или локальные данные для новых услуг
    const allAdditionalServices = (isNewService && serviceData?.additional_services) 
        ? serviceData.additional_services 
        : additionalServices.filter(s => s.is_active)

    return (
        <>
            <Card className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Дополнительные услуги
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            Добавьте дополнительные услуги к этой основной услуге
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="solid"
                        icon={<TbPlus />}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsModalOpen(true)
                        }}
                    >
                        Управлять
                    </Button>
                </div>
                {isLoading && !isNewService ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка дополнительных услуг...</div>
                ) : allAdditionalServices.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        Нет дополнительных услуг. Нажмите "Управлять" чтобы добавить первую.
                    </div>
                ) : (
                    <div className="space-y-2 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        {allAdditionalServices.map((addService) => {
                            const price = typeof addService.price === 'number' ? addService.price : (typeof addService.price === 'string' ? parseFloat(addService.price) : 0);
                            const numericPrice = isNaN(price) ? 0 : price;
                            return (
                                <div key={addService.id} className="text-sm text-gray-700 dark:text-gray-300 flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                    <span className="font-medium text-gray-900 dark:text-white">{addService.name}</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">${numericPrice.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Модалка управления дополнительными услугами */}
            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width={800}>
                <div className="flex flex-col h-full max-h-[85vh]">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Дополнительные услуги
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Услуга: {serviceName}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Управление дополнительными услугами
                                {serviceId && (
                                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">(для услуги из БД)</span>
                                )}
                            </p>
                            <Button 
                                type="button"
                                size="sm" 
                                variant="solid" 
                                icon={<TbPlus />} 
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleAdd()
                                }}
                                disabled={false}
                            >
                                Добавить
                            </Button>
                        </div>

                        {isLoading && serviceId ? (
                            <Loading loading />
                        ) : allAdditionalServices.length === 0 ? (
                            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                                Нет дополнительных услуг. Нажмите "Добавить" чтобы создать первую.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allAdditionalServices.map((addService) => (
                                    <Card key={addService.id} className="p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {addService.name}
                                                </h5>
                                                {addService.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {addService.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        ${(() => {
                                                            const price = typeof addService.price === 'number' ? addService.price : (typeof addService.price === 'string' ? parseFloat(addService.price) : 0);
                                                            const numericPrice = isNaN(price) ? 0 : price;
                                                            return numericPrice.toFixed(2);
                                                        })()}
                                                    </span>
                                                    {addService.duration && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatDuration(addService.duration, 'minutes')}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded ${
                                                            addService.is_active
                                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {addService.is_active ? 'Активна' : 'Неактивна'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    icon={<TbPencil />}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleEdit(addService)
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="plain"
                                                    icon={<TbTrash />}
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleDelete(addService.id)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Dialog>

            {/* Форма создания/редактирования */}
            <AdditionalServiceFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false)
                    setEditingAdditionalService(null)
                }}
                additionalService={editingAdditionalService}
                onSave={handleSave}
            />

            {/* Диалог подтверждения удаления */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h4 className="text-lg font-semibold mb-2">Удалить дополнительную услугу?</h4>
                            <p className="text-sm text-gray-600 mb-4">
                                Вы уверены, что хотите удалить эту дополнительную услугу?
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="plain"
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false)
                                        setAdditionalServiceToDelete(null)
                                    }}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    variant="solid"
                                    color="red"
                                    onClick={handleDeleteConfirm}
                                >
                                    Удалить
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </>
    )
}

// Компонент формы для создания/редактирования дополнительной услуги
const AdditionalServiceFormModal = ({ isOpen, onClose, additionalService, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        duration: '',
        is_active: true,
        sort_order: 0,
    })

    useEffect(() => {
        // Сбрасываем форму при открытии модалки
        if (isOpen) {
            if (additionalService) {
                setFormData({
                    name: additionalService.name || '',
                    description: additionalService.description || '',
                    price: additionalService.price !== undefined && additionalService.price !== null && additionalService.price !== 0 ? additionalService.price : '',
                    duration: additionalService.duration !== undefined && additionalService.duration !== null && additionalService.duration !== 0 ? additionalService.duration : '',
                    is_active: additionalService.is_active !== undefined ? additionalService.is_active : true,
                    sort_order: additionalService.sort_order || 0,
                })
            } else {
                setFormData({
                    name: '',
                    description: '',
                    price: '',
                    duration: '',
                    is_active: true,
                    sort_order: 0,
                })
            }
        }
    }, [isOpen, additionalService])

    const handleSubmit = (e) => {
        e.preventDefault()
        e.stopPropagation() // Предотвращаем всплытие события к родительской форме
        
        // Валидация обязательных полей
        if (!formData.name || !formData.name.trim()) {
            alert('Пожалуйста, укажите название услуги')
            return
        }
        if (formData.price === '' || formData.price === null || formData.price === undefined) {
            alert('Пожалуйста, укажите цену')
            return
        }
        if (formData.duration === '' || formData.duration === null || formData.duration === undefined) {
            alert('Пожалуйста, укажите длительность')
            return
        }
        
        // Преобразуем значения в числа перед сохранением
        const submitData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            duration: parseInt(formData.duration) || 0,
        }
        
        onSave(submitData)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">
                        {additionalService ? 'Редактировать дополнительную услугу' : 'Добавить дополнительную услугу'}
                    </h4>
                </div>

                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="additional-service-form">
                        <FormItem label="Название" required>
                            <Input
                                size="sm"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Например: Укладка"
                                required
                            />
                        </FormItem>

                        <FormItem label="Описание">
                            <Input
                                size="sm"
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Описание услуги"
                                textArea
                                rows={3}
                            />
                        </FormItem>

                        <div className="grid grid-cols-2 gap-4">
                            <FormItem label="Цена ($)" required>
                                <Input
                                    size="sm"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value === '' ? '' : e.target.value }))}
                                    placeholder="Например: 25.50"
                                    required
                                />
                            </FormItem>

                            <FormItem label="Длительность (мин)" required>
                                <Input
                                    size="sm"
                                    type="number"
                                    min="0"
                                    value={formData.duration}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value === '' ? '' : e.target.value }))}
                                    placeholder="Например: 30"
                                    required
                                />
                            </FormItem>
                        </div>

                        <FormItem label="Порядок сортировки">
                            <Input
                                size="sm"
                                type="number"
                                min="0"
                                value={formData.sort_order}
                                onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                            />
                        </FormItem>

                        <FormItem label="Активна">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label className="ml-2 text-sm text-gray-600">
                                    Показывать в букинге
                                </label>
                            </div>
                        </FormItem>
                    </form>
                </div>

                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        type="button"
                        variant="solid"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const form = document.getElementById('additional-service-form')
                            if (form) {
                                // Проверяем валидность формы перед submit
                                if (form.checkValidity()) {
                                    form.requestSubmit()
                                } else {
                                    form.reportValidity()
                                }
                            }
                        }}
                    >
                        {additionalService ? 'Сохранить' : 'Добавить'}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

const SECTIONS = [
    { id: 'general', label: 'Общая информация', icon: PiInfo },
    { id: 'pricing', label: 'Цена', icon: PiCurrencyDollar },
    { id: 'services', label: 'Услуги', icon: PiCalendar },
    { id: 'schedule', label: 'Расписание', icon: PiCalendar },
    { id: 'team', label: 'Команда', icon: PiUsers },
    { id: 'portfolio', label: 'Портфолио', icon: PiImages },
]

export default function CreateAdvertisementPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const editId = searchParams.get('edit')
    const isEdit = !!editId

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
    const { data: states = [] } = useQuery({
        queryKey: ['states'],
        queryFn: getStates,
    })
    
    // Загрузка городов по выбранному штату
    const { data: cities = [], isLoading: citiesLoading } = useQuery({
        queryKey: ['cities', selectedStateId],
        queryFn: () => {
            console.log('Loading cities for stateId:', selectedStateId);
            return getCitiesByState(selectedStateId);
        },
        enabled: !!selectedStateId,
    })
    
    // Отладочная информация
    useEffect(() => {
        console.log('Selected state ID:', selectedStateId);
        console.log('Cities loaded:', cities);
        console.log('Cities loading:', citiesLoading);
    }, [selectedStateId, cities, citiesLoading])

    // Загрузка команды
    const { data: companyTeam = [] } = useQuery({
        queryKey: ['business-team'],
        queryFn: getTeamMembers,
    })

    // Загрузка услуг компании
    const { data: companyServices = [] } = useQuery({
        queryKey: ['business-services'],
        queryFn: getBusinessServices,
    })

    // Загрузка категорий
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    })

    // Заполнение формы при редактировании
    useEffect(() => {
        if (advertisement && isEdit) {
            // Устанавливаем draftId при загрузке объявления для редактирования
            setDraftId(advertisement.id)
            // Загружаем услуги из БД (если они есть)
            const servicesData = Array.isArray(advertisement.services) 
                ? advertisement.services.map(service => ({
                    id: service.id || service.service_id || Date.now() + Math.random(), // ID для формы
                    service_id: service.service_id || service.id || null, // ID из БД для дополнительных услуг
                    name: service.name || '',
                    price: service.price || '',
                    duration: service.duration || service.duration_minutes || '',
                    duration_unit: service.duration_unit || 'hours',
                    description: service.description || '',
                    // Дополнительные услуги теперь загружаются из БД через API
                    // Убираем additional_services из JSON
                }))
                : []
            
            setFormData({
                type: 'regular', // Всегда обычное объявление
                title: advertisement.title || '',
                description: advertisement.description || '',
                image: advertisement.image || '',
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
                state: advertisement.state || '',
                priceFrom: advertisement.price_from || '',
                priceTo: advertisement.price_to || '',
                currency: advertisement.currency || 'USD',
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
                slot_step_minutes: advertisement.slot_step_minutes || 60,
                portfolio: Array.isArray(advertisement.portfolio) ? advertisement.portfolio : [],
            })
            
            // Устанавливаем selectedStateId для загрузки городов
            if (advertisement.state && states.length > 0) {
                // Ищем штат по названию
                const stateObj = states.find(s => s.name === advertisement.state || s.id === advertisement.state || s.code === advertisement.state)
                if (stateObj) {
                    // В статических данных id - это код штата (например, "CA")
                    // Используем id (код штата) для запроса городов
                    const stateIdForCities = stateObj.id || stateObj.code || null
                    console.log('Setting selectedStateId for edit:', stateIdForCities, 'from state:', advertisement.state)
                    setSelectedStateId(stateIdForCities)
                }
            }
        }
        }, [advertisement, isEdit, states, categories])
    
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
            
            console.log('Uploading image, file:', file.name, 'size:', file.size)
            
            // Не устанавливаем Content-Type вручную - axios сделает это автоматически с boundary
            const response = await LaravelAxios.post('/business/settings/advertisements/upload-image', uploadFormData)
            
            console.log('Image upload response:', response.data)
            
            if (response.data?.url) {
                const imageUrl = response.data.url
                console.log('Setting image URL:', imageUrl)
                setFormData(prev => ({ ...prev, image: imageUrl }))
                toast.push(
                    <Notification title="Успешно" type="success">
                        Изображение загружено
                    </Notification>
                )
            } else {
                console.error('No URL in response:', response.data)
                throw new Error('URL не получен в ответе')
            }
        } catch (error) {
            console.error('Image upload error:', error)
            console.error('Error response:', error.response?.data)
            console.error('Error status:', error.response?.status)
            
            const errorMessage = error.response?.data?.message || 
                                error.response?.data?.error || 
                                (error.response?.status === 401 ? 'Требуется авторизация. Пожалуйста, войдите в систему.' : error.message)
            
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось загрузить изображение: {errorMessage}
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
                <Notification title="Успешно" type="success">
                    Объявление создано и отправлено на модерацию
                </Notification>
            )
            // Редиректим на страницу со списком объявлений
            router.push('/business/advertisements')
        },
        onError: (error) => {
            console.error('Advertisement creation error:', error)
            console.error('Error response:', error.response?.data)
            const errorMessage = error.response?.data?.message || 
                                (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                                error.message || 
                                'Неизвестная ошибка'
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось создать объявление: {errorMessage}
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
                <Notification title="Успешно" type="success">
                    Объявление обновлено и отправлено на модерацию
                </Notification>
            )
            // Редиректим на страницу со списком объявлений
            router.push('/business/advertisements')
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить объявление: {error.response?.data?.message || error.message || 'Неизвестная ошибка'}
                </Notification>
            )
        },
    })

    // Функция сохранения черновика
    const saveDraft = async () => {
        try {
            // Подготавливаем данные для черновика
            const servicesData = Array.isArray(formData.services) 
                ? formData.services.map(service => {
                    const { additional_services, ...serviceWithoutAdditional } = service
                    let serviceId = null
                    if (service.service_id && typeof service.service_id === 'number' && service.service_id < 1000000) {
                        serviceId = service.service_id
                    } else if (service.id && typeof service.id === 'number' && service.id < 1000000) {
                        serviceId = service.id
                    }
                    return {
                        ...serviceWithoutAdditional,
                        service_id: serviceId,
                        id: service.id || null,
                    }
                })
                : []
            
            // Если есть команда, используем её, иначе пытаемся взять первого участника из доступной команды
            let teamData = []
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
            } else if (Array.isArray(companyTeam) && companyTeam.length > 0) {
                // Если команда не выбрана, но есть доступные участники, берем первого
                // Это нужно для прохождения валидации бэкенда
                const firstMember = companyTeam[0]
                teamData = [{
                    id: firstMember.id,
                    name: firstMember.name,
                    role: firstMember.role || '',
                    description: firstMember.email || '',
                    avatar: firstMember.img || ''
                }]
            }
            
            const draftData = {
                type: 'regular',
                title: formData.title || 'Черновик',
                description: formData.description || null,
                image: formData.image || null,
                link: formData.link || null,
                category_id: formData.category_id || null,
                city: formData.city || null,
                state: formData.state || null,
                placement: 'services',
                services: servicesData,
                team: teamData, // Используем команду или первого доступного участника
                schedule: formData.schedule || null,
                slot_step_minutes: formData.slot_step_minutes || 60,
                priceFrom: formData.priceFrom && formData.priceFrom !== '' ? formData.priceFrom : null,
                priceTo: formData.priceTo && formData.priceTo !== '' ? formData.priceTo : null,
                currency: formData.currency || 'USD',
                portfolio: Array.isArray(formData.portfolio) ? formData.portfolio : [],
                status: 'draft', // Черновик со статусом draft
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
            console.error('Error saving draft:', error)
            // Если ошибка валидации о команде, не блокируем работу - пользователь выберет команду на следующем шаге
            if (error.response?.status === 422 && error.response?.data?.message?.includes('исполнитель')) {
                console.log('Draft save skipped: team validation failed, will save on team step')
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
            console.log('Form submit blocked: not on last section. Current section:', activeSection)
            return
        }
        
        // Дополнительная проверка: убеждаемся, что это действительно последний шаг
        const lastSectionId = SECTIONS[SECTIONS.length - 1].id
        if (activeSection !== lastSectionId) {
            console.log('Form submit blocked: section mismatch. Current:', activeSection, 'Expected:', lastSectionId)
            return
        }
        
        // Защита от двойного вызова
        if (createMutation.isPending || updateMutation.isPending) {
            console.warn('Mutation already in progress, skipping duplicate submit')
            return
        }
        
        console.log('Form submit allowed: on last section, proceeding with save')
        
        // Подготавливаем данные для отправки из актуального состояния
        // Дополнительные услуги теперь хранятся в БД, не отправляем их в JSON
        const servicesData = Array.isArray(formData.services) 
            ? formData.services.map(service => {
                // Убираем additional_services из данных - они хранятся в БД отдельно
                const { additional_services, ...serviceWithoutAdditional } = service
                
                // Определяем service_id: если это реальный ID из БД (< 1000000), используем его
                // Если это временный ID для новой услуги, не передаем service_id
                let serviceId = null
                if (service.service_id && typeof service.service_id === 'number' && service.service_id < 1000000) {
                    serviceId = service.service_id
                } else if (service.id && typeof service.id === 'number' && service.id < 1000000) {
                    serviceId = service.id
                }
                
                // Убеждаемся, что service_id передается только для реальных услуг из БД
                return {
                    ...serviceWithoutAdditional,
                    service_id: serviceId, // null для новых услуг
                    id: service.id || null, // ID для идентификации при обновлении
                }
            })
            : []
        
        // Отправляем данные на бэкенд
        const submitData = {
            type: 'regular', // Всегда обычное объявление
            title: formData.title,
            description: formData.description || null,
            image: formData.image || null,
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
            slot_step_minutes: formData.slot_step_minutes || 60,
            priceFrom: formData.priceFrom && formData.priceFrom !== '' ? formData.priceFrom : null,
            priceTo: formData.priceTo && formData.priceTo !== '' ? formData.priceTo : null,
            currency: formData.currency || 'USD',
            portfolio: Array.isArray(formData.portfolio) ? formData.portfolio : [],
        }
        
        // Логируем данные перед отправкой для отладки
        console.log('Submitting advertisement data:', {
            title: submitData.title,
            type: submitData.type,
            services_count: submitData.services?.length || 0,
            services: submitData.services?.map(s => ({
                id: s.id,
                service_id: s.service_id,
                name: s.name,
                price: s.price,
            })),
            team_count: submitData.team?.length || 0,
            portfolio_count: submitData.portfolio?.length || 0,
            portfolio: submitData.portfolio,
        })
        
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
        setFormData({
            ...formData,
            services: [...(formData.services || []), { 
                id: Date.now(), 
                name: '', 
                price: '', 
                duration: '', 
                duration_unit: 'hours', // По умолчанию часы
                description: '', 
                service_id: null,
                additional_services: [] // Локальные дополнительные услуги для этой услуги
            }]
        })
    }

    const removeService = (id) => {
        setFormData({
            ...formData,
            services: (formData.services || []).filter(s => s.id !== id)
        })
    }

    const updateService = (id, field, value) => {
        console.log('updateService called:', { id, field, value })
        setFormData({
            ...formData,
            services: (formData.services || []).map(s => {
                if (s.id === id) {
                    const updated = { ...s, [field]: value }
                    console.log('Updated service:', updated)
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
        updatedServices[serviceIndex] = {
            ...updatedServices[serviceIndex],
            service_id: selectedService.id,
            name: selectedService.name || updatedServices[serviceIndex].name,
            price: selectedService.price || updatedServices[serviceIndex].price,
            duration: selectedService.duration_minutes || selectedService.duration || updatedServices[serviceIndex].duration,
            duration_unit: selectedService.duration_unit || updatedServices[serviceIndex].duration_unit || 'hours',
            description: selectedService.description || updatedServices[serviceIndex].description,
        }

        setFormData({
            ...formData,
            services: updatedServices,
        })
    }

    // Функции для работы с локальными дополнительными услугами
    const addAdditionalServiceToService = (serviceId, additionalServiceData) => {
        console.log('addAdditionalServiceToService вызвана:', {
            serviceId,
            additionalServiceData,
            currentServices: formData.services,
            targetService: formData.services?.find(s => s.id === serviceId)
        })
        
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
                
                const updatedService = {
                    ...service,
                    additional_services: [...additionalServices, newAdditionalService]
                }
                
                console.log('Обновленная услуга:', {
                    serviceId: service.id,
                    serviceName: service.name,
                    oldAdditionalCount: additionalServices.length,
                    newAdditionalCount: updatedService.additional_services.length,
                    additionalServices: updatedService.additional_services
                })
                
                return updatedService
            }
            return service
        })
        
        console.log('Обновленные services перед setFormData:', {
            updatedServices,
            servicesWithAdditional: updatedServices.filter(s => s.additional_services && s.additional_services.length > 0).length
        })
        
        setFormData({
            ...formData,
            services: updatedServices
        })
        
        // Проверяем состояние после обновления
        setTimeout(() => {
            console.log('Состояние после setFormData (через setTimeout):', {
                services: formData.services,
                servicesWithAdditional: formData.services?.filter(s => s.additional_services && s.additional_services.length > 0).length || 0
            })
        }, 100)
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
                <div className="flex items-start gap-4">
                    <Link href="/business/advertisements">
                        <Button variant="plain" icon={<PiArrowLeft />} />
                    </Link>
                    <div className="flex-1">
                        <h3>
                            {isEdit ? 'Редактировать объявление' : 'Создать объявление'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Заполните все разделы для создания объявления
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} onKeyDown={async (e) => {
                    // Предотвращаем отправку формы при нажатии Enter на промежуточных шагах
                    if (e.key === 'Enter' && activeSection !== SECTIONS[SECTIONS.length - 1].id) {
                        e.preventDefault()
                        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection)
                        const nextSection = SECTIONS[currentIndex + 1]
                        
                        // Если переходим с шага "schedule" на шаг "team", сохраняем черновик
                        if (activeSection === 'schedule' && nextSection?.id === 'team') {
                            await saveDraft()
                        }
                        
                        if (currentIndex < SECTIONS.length - 1) {
                            setActiveSection(nextSection.id)
                        }
                    }
                }}>
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
                                                onClick={async () => {
                                                    // Если переходим с шага "schedule" на шаг "team", сохраняем черновик
                                                    if (activeSection === 'schedule' && section.id === 'team') {
                                                        await saveDraft()
                                                    }
                                                    setActiveSection(section.id)
                                                }}
                                                className={classNames(
                                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition',
                                                    activeSection === section.id
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                )}
                                            >
                                                <Icon className="text-base flex-shrink-0" />
                                                <span className="truncate">{section.label}</span>
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
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">Общая информация</h4>
                                            
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

                                            <FormItem label="Категория">
                                                <Select
                                                    size="sm"
                                                    options={categories
                                                        .filter(cat => cat.is_active !== false)
                                                        .map(cat => ({ 
                                                            value: cat.id, 
                                                            label: cat.name 
                                                        }))
                                                    }
                                                    value={formData.category_id && categories.find(c => c.id === formData.category_id)
                                                        ? { 
                                                            value: formData.category_id, 
                                                            label: categories.find(c => c.id === formData.category_id)?.name || 'Категория' 
                                                        }
                                                        : null
                                                    }
                                                    onChange={(option) => setFormData({ 
                                                        ...formData, 
                                                        category_id: option?.value || null 
                                                    })}
                                                    isClearable
                                                    placeholder="Выберите категорию"
                                                />
                                            </FormItem>

                                            <div className="grid grid-cols-2 gap-4">
                                                <FormItem label="Штат">
                                                    <Select
                                                        size="sm"
                                                        options={states.map(state => ({ value: state.name, label: state.name }))}
                                                        value={states.find(s => s.name === formData.state) ? { value: formData.state, label: formData.state } : null}
                                                        onChange={(option) => {
                                                            const stateName = option?.value || ''
                                                            if (!stateName) {
                                                                setSelectedStateId(null)
                                                                setFormData({ ...formData, state: '', city: '' })
                                                                return
                                                            }
                                                            
                                                            // Находим штат для загрузки городов
                                                            // Ищем по точному совпадению названия
                                                            let stateObj = states.find(s => s.name === stateName)
                                                            
                                                            // Если не нашли, пробуем найти похожий штат (для обработки опечаток)
                                                            if (!stateObj) {
                                                                // Нормализуем название для поиска (убираем пробелы, приводим к нижнему регистру)
                                                                const normalizedName = stateName.toLowerCase().trim().replace(/\s+/g, ' ')
                                                                stateObj = states.find(s => {
                                                                    const normalizedStateName = s.name.toLowerCase().trim().replace(/\s+/g, ' ')
                                                                    return normalizedStateName === normalizedName || 
                                                                           normalizedStateName.includes(normalizedName) ||
                                                                           normalizedName.includes(normalizedStateName)
                                                                })
                                                            }
                                                            
                                                            if (!stateObj) {
                                                                console.error('State not found:', stateName, 'Available states:', states.map(s => s.name))
                                                                setSelectedStateId(null)
                                                                setFormData({ ...formData, state: stateName, city: '' })
                                                                return
                                                            }
                                                            
                                                            // Получаем правильный код штата из статических данных
                                                            // Это важно, так как API может возвращать опечатки в названиях
                                                            const stateCode = getStateCode(stateObj.name) || stateObj.id || stateObj.code
                                                            
                                                            if (!stateCode) {
                                                                console.error('State code not found for state:', stateObj)
                                                                setSelectedStateId(null)
                                                                setFormData({ ...formData, state: stateName, city: '' })
                                                                return
                                                            }
                                                            
                                                            console.log('State selected:', stateName, 'State object:', stateObj, 'State code for cities:', stateCode)
                                                            // Используем код штата из статических данных для запроса городов
                                                            setSelectedStateId(stateCode)
                                                            setFormData({ 
                                                                ...formData, 
                                                                state: stateObj.name, // Используем правильное название из статических данных
                                                                city: '' // Сбрасываем город при смене штата
                                                            })
                                                        }}
                                                        isClearable
                                                        placeholder="Выберите штат"
                                                    />
                                                </FormItem>
                                                <FormItem label="Город">
                                                    <Select
                                                        size="sm"
                                                        options={cities.map(city => ({ value: city.name, label: city.name }))}
                                                        value={cities.find(c => c.name === formData.city) ? { value: formData.city, label: formData.city } : null}
                                                        onChange={(option) => setFormData({ ...formData, city: option?.value || '' })}
                                                        isClearable
                                                        placeholder={
                                                            citiesLoading 
                                                                ? "Загрузка городов..." 
                                                                : selectedStateId 
                                                                    ? cities.length > 0 
                                                                        ? "Выберите город" 
                                                                        : "Города не найдены"
                                                                    : "Сначала выберите штат"
                                                        }
                                                        isDisabled={!selectedStateId || citiesLoading}
                                                        noOptionsMessage={() => selectedStateId ? (citiesLoading ? "Загрузка..." : "Города не найдены") : "Сначала выберите штат"}
                                                    />
                                                    {selectedStateId && !citiesLoading && cities.length === 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Города не найдены для выбранного штата
                                                        </p>
                                                    )}
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
                                                            <img 
                                                                src={formData.image} 
                                                                alt="Preview" 
                                                                className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                                onError={(e) => {
                                                                    console.error('Image load error:', formData.image)
                                                                    e.target.style.display = 'none'
                                                                    toast.push(
                                                                        <Notification title="Ошибка" type="danger">
                                                                            Не удалось загрузить изображение. Проверьте URL: {formData.image}
                                                                        </Notification>
                                                                    )
                                                                }}
                                                                onLoad={() => {
                                                                    console.log('Image loaded successfully:', formData.image)
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </FormItem>

                                            <FormItem label="Ссылка (генерируется автоматически)">
                                                <Input
                                                    size="sm"
                                                    value={formData.link ? `/marketplace/${formData.link}` : ''}
                                                    onChange={(e) => {
                                                        // Извлекаем slug из пути или полного URL
                                                        let value = e.target.value
                                                        value = value.replace(/^\/marketplace\//, '')
                                                        value = value.replace(/^https?:\/\/[^\/]+\/marketplace\//, '')
                                                        value = value.trim()
                                                        setFormData({ ...formData, link: value })
                                                    }}
                                                    placeholder="slug"
                                                    readOnly={!isEdit}
                                                />
                                                {!isEdit && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Ссылка генерируется автоматически из названия объявления
                                                    </p>
                                                )}
                                            </FormItem>

                                        </div>
                                    )}

                                    {/* Цена */}
                                    {activeSection === 'pricing' && (
                                        <div className="space-y-4">
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">Цена</h4>
                                            
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
                                                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Услуги</h4>
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
                                                            {/* Выбор услуги из таблицы (шаблоны) - опционально */}
                                                            <FormItem label="Выбрать шаблон услуги (опционально)">
                                                                <Select
                                                                    size="sm"
                                                                    options={[
                                                                        { value: null, label: 'Ручной ввод' },
                                                                        ...(companyServices.length > 0 
                                                                            ? companyServices.map(s => ({
                                                                                value: s.id,
                                                                                label: `${s.name} ($${s.price})`
                                                                            }))
                                                                            : []
                                                                        )
                                                                    ]}
                                                                    value={service.service_id 
                                                                        ? { value: service.service_id, label: companyServices.find(s => s.id === service.service_id)?.name || 'Услуга' }
                                                                        : { value: null, label: 'Ручной ввод' }
                                                                    }
                                                                    onChange={(option) => {
                                                                        if (option && option.value) {
                                                                            handleSelectServiceFromTable(option.value, index)
                                                                        } else {
                                                                            handleClearServiceSelection(index)
                                                                        }
                                                                    }}
                                                                    isClearable
                                                                    placeholder={companyServices.length > 0 ? "Выберите шаблон или введите вручную" : "Создайте шаблоны в настройках бизнеса"}
                                                                />
                                                                {companyServices.length === 0 && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        💡 Создайте шаблоны услуг в <a href="/business/settings?tab=services" className="text-blue-600 hover:underline">настройках бизнеса → Услуги</a>, чтобы быстро добавлять их в объявления
                                                                    </p>
                                                                )}
                                                            </FormItem>
                                                            
                                                            <FormItem label="Название услуги" required>
                                                                <Input
                                                                    size="sm"
                                                                    value={service.name || ''}
                                                                    onChange={(e) => updateService(service.id, 'name', e.target.value)}
                                                                    placeholder="Название услуги"
                                                                    disabled={false}
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
                                                                        disabled={false}
                                                                    />
                                                                </FormItem>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <FormItem label="Длительность">
                                                                        <Input
                                                                            size="sm"
                                                                            type="number"
                                                                            min="0"
                                                                            value={service.duration || ''}
                                                                            onChange={(e) => updateService(service.id, 'duration', e.target.value)}
                                                                            placeholder="1"
                                                                            disabled={false}
                                                                        />
                                                                    </FormItem>
                                                                    <FormItem label="Единица измерения">
                                                                        <Select
                                                                            size="sm"
                                                                            value={service.duration_unit 
                                                                                ? { value: service.duration_unit, label: service.duration_unit === 'hours' ? 'Часы' : 'Дни' }
                                                                                : { value: 'hours', label: 'Часы' }
                                                                            }
                                                                            onChange={(option) => {
                                                                                console.log('Select onChange:', { option, serviceId: service.id, currentValue: service.duration_unit })
                                                                                const newValue = option?.value || 'hours'
                                                                                updateService(service.id, 'duration_unit', newValue)
                                                                            }}
                                                                            options={[
                                                                                { value: 'hours', label: 'Часы' },
                                                                                { value: 'days', label: 'Дни' }
                                                                            ]}
                                                                            isSearchable={false}
                                                                            components={{
                                                                                Input: (props) => (
                                                                                    <input
                                                                                        {...props}
                                                                                        inputMode="none"
                                                                                        readOnly
                                                                                        style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                                                                                    />
                                                                                ),
                                                                            }}
                                                                        />
                                                                    </FormItem>
                                                                </div>
                                                            </div>
                                                            <FormItem label="Описание">
                                                                <Input
                                                                    value={service.description || ''}
                                                                    onChange={(e) => updateService(service.id, 'description', e.target.value)}
                                                                    placeholder="Описание услуги"
                                                                    textArea
                                                                    rows={2}
                                                                    disabled={false}
                                                                />
                                                            </FormItem>
                                                            
                                                            {/* Управление дополнительными услугами */}
                                                            <ServiceAdditionalServicesManager 
                                                                serviceId={service.service_id || service.id} 
                                                                serviceName={service.name || companyServices.find(s => s.id === service.service_id)?.name}
                                                                isNewService={!service.service_id}
                                                                serviceData={service}
                                                                onUpdateService={(updatedService) => {
                                                                    // Обновляем услугу в форме с новыми дополнительными услугами
                                                                    updateService(service.id, 'additional_services', updatedService.additional_services || [])
                                                                }}
                                                            />
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
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Расписание работы</h4>
                                                <p className="text-sm text-gray-500">
                                                    Настройте рабочие часы для каждого дня недели
                                                </p>
                                            </div>
                                            
                                            <FormItem label="Шаг слотов для бронирования">
                                                <Select
                                                    size="sm"
                                                    options={[
                                                        { value: 15, label: '15 минут' },
                                                        { value: 30, label: '30 минут' },
                                                        { value: 60, label: '1 час' },
                                                        { value: 90, label: '1.5 часа' },
                                                        { value: 120, label: '2 часа' },
                                                        { value: 180, label: '3 часа' },
                                                        { value: 240, label: '4 часа' },
                                                    ]}
                                                    value={{ 
                                                        value: formData.slot_step_minutes || 60, 
                                                        label: formData.slot_step_minutes === 15 ? '15 минут' :
                                                               formData.slot_step_minutes === 30 ? '30 минут' :
                                                               formData.slot_step_minutes === 90 ? '1.5 часа' :
                                                               formData.slot_step_minutes === 120 ? '2 часа' :
                                                               formData.slot_step_minutes === 180 ? '3 часа' :
                                                               formData.slot_step_minutes === 240 ? '4 часа' : '1 час'
                                                    }}
                                                    onChange={(option) => setFormData({ ...formData, slot_step_minutes: option?.value || 60 })}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Интервал между доступными слотами для бронирования. По умолчанию: 1 час.
                                                </p>
                                            </FormItem>
                                            
                                            <Card className="p-4">
                                                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Рабочие дни</h5>
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
                                                            <div
                                                                key={day}
                                                                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                                            >
                                                                <div className="flex items-center w-full sm:w-40 flex-shrink-0">
                                                                    <Switcher
                                                                        checked={schedule.enabled}
                                                                        onChange={(checked) => updateSchedule(day, 'enabled', checked)}
                                                                    />
                                                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                        {dayLabels[day]}
                                                                    </span>
                                                                </div>
                                                                {schedule.enabled && (
                                                                    <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1">
                                                                        <Input
                                                                            size="sm"
                                                                            type="time"
                                                                            value={schedule.from || '09:00'}
                                                                            onChange={(e) => updateSchedule(day, 'from', e.target.value)}
                                                                            className="w-full sm:w-auto"
                                                                        />
                                                                        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">—</span>
                                                                        <Input
                                                                            size="sm"
                                                                            type="time"
                                                                            value={schedule.to || '18:00'}
                                                                            onChange={(e) => updateSchedule(day, 'to', e.target.value)}
                                                                            className="w-full sm:w-auto"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Портфолио */}
                                    {activeSection === 'portfolio' && (
                                        <div className="space-y-6">
                                            <Card className="p-4">
                                                <div className="space-y-4">
                                                    {/* Заголовок и кнопки управления портфолио */}
                                                    <div className="flex items-start justify-between mb-4 gap-4">
                                                        <div className="flex-1">
                                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Портфолио</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Добавьте примеры выполненных работ. Изображения будут отображаться на странице объявления.
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {!showAddPortfolioForm && (
                                                                <Button
                                                                    type="button"
                                                                    variant={formData.portfolio && formData.portfolio.length > 0 ? "plain" : "solid"}
                                                                    size="sm"
                                                                    onClick={() => setShowAddPortfolioForm(true)}
                                                                    className="whitespace-nowrap"
                                                                    icon={<PiPlus className="w-4 h-4" />}
                                                                    iconAlignment="start"
                                                                >
                                                                    {formData.portfolio && formData.portfolio.length > 0 ? 'Добавить еще' : 'Добавить'}
                                                                </Button>
                                                            )}
                                                            {showAddPortfolioForm && (
                                                                <Button
                                                                    type="button"
                                                                    variant="plain"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setShowAddPortfolioForm(false)
                                                                        setNewPortfolioItem({
                                                                            title: '',
                                                                            tag: '',
                                                                            description: '',
                                                                        })
                                                                        setUploadKey(prev => prev + 1)
                                                                    }}
                                                                    className="whitespace-nowrap"
                                                                >
                                                                    Отмена
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {formData.portfolio && formData.portfolio.length > 0 && (
                                                        <div className="space-y-4 mb-4">
                                                            {formData.portfolio.map((item, index) => {
                                                                const images = item.images || (item.imageUrl ? [item.imageUrl] : [])
                                                                return (
                                                                    <div
                                                                        key={item.id || index}
                                                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="flex-1 space-y-3">
                                                                                <div className="grid grid-cols-2 gap-3">
                                                                                    <FormItem label="Название">
                                                                                        <Input
                                                                                            size="sm"
                                                                                            value={item.title || ''}
                                                                                            onChange={(e) => {
                                                                                                const portfolio = [...(formData.portfolio || [])]
                                                                                                portfolio[index] = {
                                                                                                    ...portfolio[index],
                                                                                                    title: e.target.value,
                                                                                                }
                                                                                                setFormData({ ...formData, portfolio })
                                                                                            }}
                                                                                            placeholder="Название работы"
                                                                                        />
                                                                                    </FormItem>
                                                                                    <FormItem label="Тег">
                                                                                        <Input
                                                                                            size="sm"
                                                                                            value={item.tag || ''}
                                                                                            onChange={(e) => {
                                                                                                const portfolio = [...(formData.portfolio || [])]
                                                                                                portfolio[index] = {
                                                                                                    ...portfolio[index],
                                                                                                    tag: e.target.value,
                                                                                                }
                                                                                                setFormData({ ...formData, portfolio })
                                                                                            }}
                                                                                            placeholder="Например: Ремонт"
                                                                                        />
                                                                                    </FormItem>
                                                                                </div>
                                                                                <FormItem label="Описание">
                                                                                    <Input
                                                                                        value={item.description || ''}
                                                                                        onChange={(e) => {
                                                                                            const portfolio = [...(formData.portfolio || [])]
                                                                                            portfolio[index] = {
                                                                                                ...portfolio[index],
                                                                                                description: e.target.value,
                                                                                            }
                                                                                            setFormData({ ...formData, portfolio })
                                                                                        }}
                                                                                        placeholder="Подробное описание работы"
                                                                                        textArea
                                                                                        rows={3}
                                                                                    />
                                                                                </FormItem>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newPortfolio = formData.portfolio.filter((_, i) => i !== index)
                                                                                    setFormData({ ...formData, portfolio: newPortfolio })
                                                                                }}
                                                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0"
                                                                            >
                                                                                <PiTrash className="w-5 h-5" />
                                                                            </button>
                                                                        </div>
                                                                        
                                                                        {/* Изображения */}
                                                                        <div>
                                                                            <FormItem label={`Изображения (${images.length})`}>
                                                                                <div className="space-y-3">
                                                                                    {/* Список загруженных изображений */}
                                                                                    {images.length > 0 && (
                                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                                            {images.map((imgUrl, imgIndex) => (
                                                                                                <div
                                                                                                    key={imgIndex}
                                                                                                    className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                                                                                                >
                                                                                                    <img
                                                                                                        src={imgUrl}
                                                                                                        alt={`${item.title || 'Портфолио'} - ${imgIndex + 1}`}
                                                                                                        className="w-full h-full object-cover"
                                                                                                    />
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const portfolio = [...(formData.portfolio || [])]
                                                                                                            const itemImages = [...(portfolio[index].images || [])]
                                                                                                            itemImages.splice(imgIndex, 1)
                                                                                                            portfolio[index] = {
                                                                                                                ...portfolio[index],
                                                                                                                images: itemImages,
                                                                                                                imageUrl: itemImages[0] || null, // Для обратной совместимости
                                                                                                            }
                                                                                                            setFormData({ ...formData, portfolio })
                                                                                                        }}
                                                                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                                                                    >
                                                                                                        <PiX className="w-3 h-3" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    
                                                                                    {/* Загрузка новых изображений */}
                                                                                    <Upload
                                                                                        accept="image/*"
                                                                                            onChange={async (files) => {
                                                                                                if (files && files.length > 0) {
                                                                                                    setIsUploadingImage(true)
                                                                                                    try {
                                                                                                        const filesArray = Array.from(files)
                                                                                                        
                                                                                                        // Загружаем все файлы параллельно
                                                                                                        const uploadPromises = filesArray.map(async (file) => {
                                                                                                            try {
                                                                                                                const formDataUpload = new FormData()
                                                                                                                formDataUpload.append('image', file)
                                                                                                                const response = await LaravelAxios.post('/business/settings/advertisements/upload-image', formDataUpload, {
                                                                                                                    headers: {
                                                                                                                        'Content-Type': 'multipart/form-data',
                                                                                                                    },
                                                                                                                })
                                                                                                                if (response.data.success && response.data.url) {
                                                                                                                    return response.data.url
                                                                                                                }
                                                                                                                return null
                                                                                                            } catch (fileError) {
                                                                                                                console.error(`Error uploading file ${file.name}:`, fileError)
                                                                                                                toast.push({
                                                                                                                    title: 'Предупреждение',
                                                                                                                    message: `Не удалось загрузить файл ${file.name || 'изображение'}`,
                                                                                                                    type: 'warning',
                                                                                                                })
                                                                                                                return null
                                                                                                            }
                                                                                                        })
                                                                                                        
                                                                                                        // Ждем завершения всех загрузок
                                                                                                        const uploadedUrls = (await Promise.all(uploadPromises)).filter(url => url !== null)
                                                                                                    
                                                                                                    if (uploadedUrls.length > 0) {
                                                                                                        const portfolio = [...(formData.portfolio || [])]
                                                                                                        const currentImages = portfolio[index].images || (portfolio[index].imageUrl ? [portfolio[index].imageUrl] : [])
                                                                                                        portfolio[index] = {
                                                                                                            ...portfolio[index],
                                                                                                            images: [...currentImages, ...uploadedUrls],
                                                                                                            imageUrl: [...currentImages, ...uploadedUrls][0] || null, // Для обратной совместимости
                                                                                                        }
                                                                                                        setFormData({ ...formData, portfolio })
                                                                                                        toast.push({
                                                                                                            title: 'Успешно',
                                                                                                            message: `Загружено ${uploadedUrls.length} изображений`,
                                                                                                            type: 'success',
                                                                                                        })
                                                                                                    }
                                                                                                } catch (error) {
                                                                                                    console.error('Error uploading portfolio images:', error)
                                                                                                    toast.push({
                                                                                                        title: 'Ошибка',
                                                                                                        message: 'Не удалось загрузить изображения',
                                                                                                        type: 'error',
                                                                                                    })
                                                                                                } finally {
                                                                                                    setIsUploadingImage(false)
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        uploadLimit={10}
                                                                                        multiple
                                                                                        disabled={isUploadingImage}
                                                                                    >
                                                                                        <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition">
                                                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                                                {isUploadingImage ? 'Загрузка...' : 'Нажмите или перетащите файлы для загрузки (можно несколько)'}
                                                                                            </p>
                                                                                        </div>
                                                                                    </Upload>
                                                                                </div>
                                                                            </FormItem>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Форма добавления нового элемента */}
                                                    {showAddPortfolioForm && (
                                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 mb-4">
                                                            <div className="space-y-3">
                                                                <FormItem label="Изображения" required>
                                                                    <Upload
                                                                        key={uploadKey}
                                                                        accept="image/*"
                                                                        showList={false}
                                                                        onChange={async (files) => {
                                                                            if (files && files.length > 0) {
                                                                            setIsUploadingImage(true)
                                                                            try {
                                                                                const filesArray = Array.from(files)
                                                                                
                                                                                // Загружаем все файлы параллельно
                                                                                const uploadPromises = filesArray.map(async (file) => {
                                                                                    try {
                                                                                        const formDataUpload = new FormData()
                                                                                        formDataUpload.append('image', file)
                                                                                        const response = await LaravelAxios.post('/business/settings/advertisements/upload-image', formDataUpload, {
                                                                                            headers: {
                                                                                                'Content-Type': 'multipart/form-data',
                                                                                            },
                                                                                        })
                                                                                        if (response.data.success && response.data.url) {
                                                                                            return response.data.url
                                                                                        }
                                                                                        return null
                                                                                    } catch (fileError) {
                                                                                        console.error(`Error uploading file ${file.name}:`, fileError)
                                                                                        toast.push({
                                                                                            title: 'Предупреждение',
                                                                                            message: `Не удалось загрузить файл ${file.name || 'изображение'}`,
                                                                                            type: 'warning',
                                                                                        })
                                                                                        return null
                                                                                    }
                                                                                })
                                                                                
                                                                                // Ждем завершения всех загрузок
                                                                                const uploadedUrls = (await Promise.all(uploadPromises)).filter(url => url !== null)
                                                                                
                                                                                if (uploadedUrls.length > 0) {
                                                                                    const newItem = {
                                                                                        id: Date.now() + Math.random(),
                                                                                        images: uploadedUrls,
                                                                                        imageUrl: uploadedUrls[0] || null, // Для обратной совместимости
                                                                                        title: newPortfolioItem.title,
                                                                                        description: newPortfolioItem.description,
                                                                                        tag: newPortfolioItem.tag,
                                                                                    }
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        portfolio: [...(formData.portfolio || []), newItem],
                                                                                    })
                                                                                    
                                                                                    // Очищаем временные поля
                                                                                    setNewPortfolioItem({
                                                                                        title: '',
                                                                                        tag: '',
                                                                                        description: '',
                                                                                    })
                                                                                    
                                                                                    // Пересоздаем Upload компонент для очистки
                                                                                    setUploadKey(prev => prev + 1)
                                                                                    
                                                                                    // Скрываем форму добавления
                                                                                    setShowAddPortfolioForm(false)
                                                                                    
                                                                                    toast.push({
                                                                                        title: 'Успешно',
                                                                                        message: `Загружено ${uploadedUrls.length} изображений`,
                                                                                        type: 'success',
                                                                                    })
                                                                                }
                                                                            } catch (error) {
                                                                                console.error('Error uploading portfolio images:', error)
                                                                                toast.push({
                                                                                    title: 'Ошибка',
                                                                                    message: 'Не удалось загрузить изображения',
                                                                                    type: 'error',
                                                                                })
                                                                            } finally {
                                                                                setIsUploadingImage(false)
                                                                            }
                                                                        }
                                                                    }}
                                                                    uploadLimit={10}
                                                                    multiple
                                                                    disabled={isUploadingImage}
                                                                >
                                                                    <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition">
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                            {isUploadingImage ? 'Загрузка...' : 'Нажмите или перетащите файлы для загрузки (можно несколько)'}
                                                                        </p>
                                                                    </div>
                                                                </Upload>
                                                            </FormItem>
                                                            
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <FormItem label="Название">
                                                                    <Input
                                                                        size="sm"
                                                                        value={newPortfolioItem.title}
                                                                        onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                                                                        placeholder="Название работы"
                                                                    />
                                                                </FormItem>
                                                                <FormItem label="Тег">
                                                                    <Input
                                                                        size="sm"
                                                                        value={newPortfolioItem.tag}
                                                                        onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, tag: e.target.value })}
                                                                        placeholder="Например: Ремонт"
                                                                    />
                                                                </FormItem>
                                                            </div>
                                                            
                                                            <FormItem label="Описание">
                                                                <Input
                                                                    value={newPortfolioItem.description}
                                                                    onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                                                                    placeholder="Подробное описание работы"
                                                                    textArea
                                                                    rows={3}
                                                                />
                                                            </FormItem>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                </div>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Команда */}
                                    {activeSection === 'team' && (
                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-1">
                                                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">Команда</h4>
                                                    <Link href="/business/settings?tab=team">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            type="button"
                                                        >
                                                            Управление командой
                                                        </Button>
                                                    </Link>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Выберите участников команды из списка. Управление командой доступно в <Link href="/business/settings?tab=team" className="text-blue-600 dark:text-blue-400 hover:underline">настройках бизнеса</Link>.
                                                </p>
                                            </div>

                                            {companyTeam.length === 0 ? (
                                                <Card className="p-6">
                                                    <div className="text-center py-8">
                                                        <p className="text-gray-500 dark:text-gray-400 mb-4">У вас пока нет участников команды</p>
                                                        <Link href="/business/settings?tab=team">
                                                            <Button
                                                                size="sm"
                                                                variant="solid"
                                                            >
                                                                Добавить участника команды
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </Card>
                                            ) : (
                                                <Card className="p-4">
                                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Участники команды</h5>
                                                    <div className="space-y-3">
                                                        {companyTeam.map((member) => {
                                                            const currentTeamIds = Array.isArray(formData.team) 
                                                                ? formData.team.map(m => typeof m === 'object' ? (m.id || m) : m)
                                                                : []
                                                            const isSelected = currentTeamIds.includes(member.id)
                                                            return (
                                                                <div
                                                                    key={member.id}
                                                                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition hover:border-gray-300 dark:hover:border-gray-600"
                                                                >
                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                        <Switcher
                                                                            checked={isSelected}
                                                                            onChange={() => toggleTeamMember(member.id)}
                                                                        />
                                                                        {member.img && (
                                                                            <img
                                                                                src={member.img}
                                                                                alt={member.name}
                                                                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                                                                            />
                                                                        )}
                                                                        <div 
                                                                            className="flex-1 min-w-0 cursor-pointer"
                                                                            onClick={() => toggleTeamMember(member.id)}
                                                                        >
                                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                                                                            {member.role && (
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{member.role}</div>
                                                                            )}
                                                                            {member.email && (
                                                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{member.email}</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <Badge className="flex-shrink-0" variant="solid" color="blue">
                                                                            Выбрано
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </Card>
                                            )}
                                        </div>
                                    )}

                                    {/* Кнопки действий */}
                                    <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex gap-2">
                                            <Link href="/business/advertisements">
                                                <Button variant="plain" type="button">
                                                    Отмена
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
                                                    Назад
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
                                                        
                                                        // Если переходим с шага "schedule" на шаг "team", сохраняем черновик
                                                        if (activeSection === 'schedule' && nextSection?.id === 'team') {
                                                            await saveDraft()
                                                        }
                                                        
                                                        if (currentIndex < SECTIONS.length - 1) {
                                                            setActiveSection(nextSection.id)
                                                        }
                                                    }}
                                                >
                                                    Далее
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
                                                    {isEdit ? 'Сохранить' : 'Создать'}
                                                </Button>
                                            )}
                                        </div>
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

