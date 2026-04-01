'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import { Form, FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useUserStore } from '@/store'
import { CLIENT } from '@/constants/roles.constant'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authKeys } from '@/hooks/api/useAuth'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { PiUser, PiCamera, PiCheckCircle, PiArrowLeft, PiMapPin } from 'react-icons/pi'
import Link from 'next/link'
import { US_STATES, US_CITIES_BY_STATE, getCitiesByState } from '@/constants/us-locations.constant'
import { updateClientProfile } from '@/lib/api/client'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'

// Схема валидации
const profileSchema = z.object({
    firstName: z.string().min(1, 'Имя обязательно'),
    lastName: z.string().min(1, 'Фамилия обязательна'),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
})

export default function ClientProfileSettingsPage() {
    const queryClient = useQueryClient()
    const { data: user, isLoading: userLoading } = useCurrentUser()
    const { user: userStore, setUser } = useUserStore()
    const [selectedState, setSelectedState] = useState('')
    const [availableCities, setAvailableCities] = useState([])

    const {
        handleSubmit,
        control,
        formState: { errors, isDirty },
        reset,
        setValue,
        watch,
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
        },
    })

    const watchedState = watch('state')

    // Обновляем список городов при изменении штата
    useEffect(() => {
        if (watchedState) {
            const cities = getCitiesByState(watchedState)
            setAvailableCities(cities)
            setSelectedState(watchedState)
            // Сбрасываем город, если он не входит в список городов выбранного штата
            const currentCity = watch('city')
            if (currentCity && !cities.includes(currentCity)) {
                setValue('city', '')
            }
        } else {
            setAvailableCities([])
            setSelectedState('')
        }
    }, [watchedState, setValue, watch])

    // Загружаем данные пользователя в форму
    useEffect(() => {
        if (user) {
            const nameParts = (user.name || '').split(' ')
            
            // Определяем штат: если приходит строка (например, "Alaska"), находим соответствующий ID ("AK")
            let stateValue = user.state || ''
            if (stateValue && !US_STATES.find(s => s.id === stateValue)) {
                // Пытаемся найти по названию
                const stateByName = US_STATES.find(s => s.name === stateValue)
                if (stateByName) {
                    stateValue = stateByName.id
                }
            }
            
            reset({
                firstName: user.firstName || nameParts[0] || '',
                lastName: user.lastName || nameParts.slice(1).join(' ') || '',
                phone: user.phone || '',
                address: user.address || '',
                city: user.city || '',
                state: stateValue,
                zipCode: user.zipCode || '',
            })
            
            // Устанавливаем доступные города для выбранного штата
            if (stateValue) {
                const cities = getCitiesByState(stateValue)
                setAvailableCities(cities)
                setSelectedState(stateValue)
            }
            
            setUser(user)
        }
    }, [user, reset, setUser])

    // Мутация для обновления профиля
    const updateProfileMutation = useMutation({
        mutationFn: async (data) => {
            return await updateClientProfile(data)
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: authKeys.user() })
            reset({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phone: data.phone || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                zipCode: data.zipCode || '',
            })
            setUser(data)
            
            // Обновляем доступные города
            if (data.state) {
                const cities = getCitiesByState(data.state)
                setAvailableCities(cities)
                setSelectedState(data.state)
            }

            toast.push(
                <Notification title="Успешно" type="success">
                    Профиль успешно обновлен
                </Notification>
            )
        },
        onError: (error) => {
            console.error('Profile update error:', error)
            toast.push(
                <Notification title="Ошибка" type="danger">
                    {error?.response?.data?.message || 'Ошибка при обновлении профиля'}
                </Notification>
            )
        },
    })

    const onSubmit = (data) => {
        updateProfileMutation.mutate(data)
    }

    if (userLoading) {
        return (
            <Container className="py-12">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка профиля...</p>
                    </div>
                </div>
            </Container>
        )
    }

    const displayUser = user || userStore
    const avatarUrl = displayUser?.avatar || displayUser?.image
    const fullName =
        displayUser?.name || `${displayUser?.firstName || ''} ${displayUser?.lastName || ''}`.trim()

    return (
        <ProtectedRoute allowedRoles={[CLIENT]} redirectTo="/sign-in">
            <Container className="pt-20 pb-8 md:pt-24 md:pb-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <Link href="/profile">
                        <Button variant="plain" icon={<PiArrowLeft />} className="mb-6">
                            Назад к профилю
                        </Button>
                    </Link>

                    <Card className="p-4 sm:p-6 md:p-8">
                        {/* Заголовок */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <Avatar
                                    src={avatarUrl}
                                    alt={fullName || 'User'}
                                    size={80}
                                    shape="circle"
                                    className="border-4 border-gray-200 dark:border-gray-700 sm:w-[100px] sm:h-[100px]"
                                    icon={<PiUser />}
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2.5 cursor-pointer hover:bg-blue-700 transition shadow-lg"
                                    title="Изменить фото"
                                >
                                    <PiCamera className="w-5 h-5" />
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            toast.push(
                                                <Notification title="В разработке" type="info">
                                                    Загрузка аватара будет доступна позже
                                                </Notification>
                                            )
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                                    Настройки профиля
                                </h1>
                                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                                    Управление личными данными и настройками аккаунта
                                </p>
                            </div>
                        </div>

                        {/* Форма */}
                        <Form onSubmit={handleSubmit(onSubmit)}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <FormItem
                                    label="Имя"
                                    invalid={!!errors.firstName}
                                    errorMessage={errors.firstName?.message}
                                >
                                    <Controller
                                        name="firstName"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                placeholder="Введите имя"
                                                className="h-11"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem
                                    label="Фамилия"
                                    invalid={!!errors.lastName}
                                    errorMessage={errors.lastName?.message}
                                >
                                    <Controller
                                        name="lastName"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                placeholder="Введите фамилию"
                                                className="h-11"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem label="Email" className="md:col-span-2">
                                    <Input
                                        value={displayUser?.email || ''}
                                        disabled
                                        className="bg-gray-50 dark:bg-gray-800 h-11"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                        Email нельзя изменить
                                    </p>
                                </FormItem>

                                <FormItem
                                    label="Телефон"
                                    invalid={!!errors.phone}
                                    errorMessage={errors.phone?.message}
                                >
                                    <Controller
                                        name="phone"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                placeholder="+1 (555) 123-4567"
                                                className="h-11"
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormItem
                                    label="Адрес"
                                    invalid={!!errors.address}
                                    errorMessage={errors.address?.message}
                                    className="md:col-span-2"
                                >
                                    <Controller
                                        name="address"
                                        control={control}
                                        render={({ field }) => (
                                            <AddressAutocomplete
                                                value={field.value}
                                                onChange={field.onChange}
                                                onAddressParsed={(parsed) => {
                                                    // Автозаполнение города и штата при выборе адреса
                                                    if (parsed.city) setValue('city', parsed.city)
                                                    if (parsed.state) {
                                                        // Находим ID штата по названию или коду
                                                        const stateObj = US_STATES.find(s => 
                                                            s.name === parsed.state || s.id === parsed.state
                                                        )
                                                        if (stateObj) setValue('state', stateObj.id)
                                                    }
                                                    if (parsed.zip) setValue('zipCode', parsed.zip)
                                                }}
                                                placeholder="Введите адрес"
                                                className="h-11"
                                            />
                                        )}
                                    />
                                </FormItem>

                                {/* Постоянная локация */}
                                <FormItem
                                    label="Постоянная локация"
                                    className="md:col-span-2"
                                >
                                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PiMapPin className="text-lg text-blue-600 dark:text-blue-400" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Укажите вашу постоянную локацию для автоматического применения в каталоге
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Штат
                                                </label>
                                                <Controller
                                                    name="state"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            placeholder="Выберите штат"
                                                            options={US_STATES.map(state => ({
                                                                value: state.id,
                                                                label: state.name,
                                                            }))}
                                                            value={US_STATES.find(s => s.id === field.value) ? {
                                                                value: field.value,
                                                                label: US_STATES.find(s => s.id === field.value)?.name || '',
                                                            } : null}
                                                            onChange={(option) => {
                                                                field.onChange(option?.value || '')
                                                                setValue('city', '') // Сбрасываем город при смене штата
                                                            }}
                                                            className="h-11"
                                                        />
                                                    )}
                                                />
                                                {errors.state && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Город
                                                </label>
                                                <Controller
                                                    name="city"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            placeholder={selectedState ? "Выберите город" : "Сначала выберите штат"}
                                                            options={availableCities.map(city => ({
                                                                value: city,
                                                                label: city,
                                                            }))}
                                                            value={availableCities.includes(field.value) ? {
                                                                value: field.value,
                                                                label: field.value,
                                                            } : null}
                                                            onChange={(option) => field.onChange(option?.value || '')}
                                                            disabled={!selectedState || availableCities.length === 0}
                                                            className="h-11"
                                                        />
                                                    )}
                                                />
                                                {errors.city && (
                                                    <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Показываем выбранную локацию */}
                                        {selectedState && watch('city') && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <PiMapPin className="text-blue-600 dark:text-blue-400" />
                                                    <span>
                                                        {watch('city')}, {US_STATES.find(s => s.id === selectedState)?.name}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </FormItem>

                                <FormItem
                                    label="Почтовый индекс"
                                    invalid={!!errors.zipCode}
                                    errorMessage={errors.zipCode?.message}
                                >
                                    <Controller
                                        name="zipCode"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                placeholder="12345"
                                                className="h-11"
                                            />
                                        )}
                                    />
                                </FormItem>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => reset()}
                                    disabled={!isDirty || updateProfileMutation.isPending}
                                    className="h-11 flex items-center justify-center"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    type="submit"
                                    loading={updateProfileMutation.isPending}
                                    disabled={!isDirty}
                                    className="h-11 min-w-[160px] flex items-center justify-center"
                                >
                                    {updateProfileMutation.isPending ? (
                                        'Сохранение...'
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <PiCheckCircle />
                                            Сохранить изменения
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </div>
            </Container>
        </ProtectedRoute>
    )
}

