'use client'
import { useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Upload from '@/components/ui/Upload'
import Input from '@/components/ui/Input'
import Select, { Option as DefaultOption } from '@/components/ui/Select'
import Avatar from '@/components/ui/Avatar'
import { Form, FormItem } from '@/components/ui/Form'
import NumericInput from '@/components/shared/NumericInput'
import { countryList } from '@/constants/countries.constant'
import { components } from 'react-select'
import { useClientProfile, useUpdateClientProfile, useUploadAvatar, useDeleteAvatar } from '@/hooks/api/useClient'
import { useUserStore } from '@/store'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { HiOutlineUser } from 'react-icons/hi'
import { TbPlus } from 'react-icons/tb'

const { Control } = components

const getValidationSchema = (t) => z.object({
    firstName: z.string().min(1, { message: t('firstNameRequired') }),
    lastName: z.string().min(1, { message: t('lastNameRequired') }),
    dialCode: z.string().optional(),
    phoneNumber: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
    postcode: z.string().optional(),
    city: z.string().optional(),
    img: z.string(),
})

const CustomSelectOption = (props) => {
    return (
        <DefaultOption
            {...props}
            customLabel={(data, label) => (
                <span className="flex items-center gap-2">
                    <Avatar
                        shape="circle"
                        size={20}
                        src={`/img/countries/${data.value}.png`}
                    />
                    {props.variant === 'country' && <span>{label}</span>}
                    {props.variant === 'phone' && <span>{data.dialCode}</span>}
                </span>
            )}
        />
    )
}

const CustomControl = ({ children, ...props }) => {
    const selected = props.getValue()[0]
    return (
        <Control {...props}>
            {selected && (
                <Avatar
                    className="ltr:ml-4 rtl:mr-4"
                    shape="circle"
                    size={20}
                    src={`/img/countries/${selected.value}.png`}
                />
            )}
            {children}
        </Control>
    )
}

const SettingsProfile = () => {
    const t = useTranslations('accountSettings')
    const { data, isLoading, error } = useClientProfile()
    const updateProfileMutation = useUpdateClientProfile()
    const uploadAvatarMutation = useUploadAvatar()
    const deleteAvatarMutation = useDeleteAvatar()
    const { setUser } = useUserStore()

    // Логируем данные для отладки
    useEffect(() => {
        if (error) {
            console.error('Error loading profile:', error)
        }
        if (data) {
            console.log('Profile data loaded:', data)
            // Обновляем userStore при загрузке данных
            setUser(data)
        }
        if (isLoading) {
            console.log('Loading profile...')
        }
    }, [data, error, isLoading, setUser])

    const dialCodeList = useMemo(() => {
        const newCountryList = JSON.parse(JSON.stringify(countryList))

        return newCountryList.map((country) => {
            country.label = country.dialCode
            return country
        })
    }, [])

    const beforeUpload = (files) => {
        let valid = true

        const allowedFileType = ['image/jpeg', 'image/png']
        if (files) {
            const fileArray = Array.from(files)
            for (const file of fileArray) {
                if (!allowedFileType.includes(file.type)) {
                    valid = t('uploadError')
                }
            }
        }

        return valid
    }

    const {
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
        control,
    } = useForm({
        resolver: zodResolver(getValidationSchema(t)),
        defaultValues: {
            firstName: '',
            lastName: '',
            dialCode: '',
            phoneNumber: '',
            country: '',
            address: '',
            city: '',
            postcode: '',
            img: '',
        },
    })

    useEffect(() => {
        if (data) {
            // Разбиваем телефон на код страны и номер
            let dialCode = ''
            let phoneNumber = ''
            if (data.phone) {
                const phoneParts = data.phone.trim().split(' ')
                if (phoneParts.length > 1) {
                    dialCode = phoneParts[0]
                    phoneNumber = phoneParts.slice(1).join(' ')
                } else {
                    phoneNumber = data.phone
                }
            }
            
            // Обрабатываем аватар - используем normalizeImageUrl для консистентности
            let avatarUrl = ''
            if (data.avatar) {
                // Используем normalizeImageUrl для нормализации URL
                avatarUrl = normalizeImageUrl(data.avatar) || ''
            }
            
            reset({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                dialCode: dialCode,
                phoneNumber: phoneNumber,
                country: data.state || '',
                address: data.address || '',
                city: data.city || '',
                postcode: data.zipCode || '',
                img: avatarUrl,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    const onSubmit = async (values) => {
        try {
            // Формируем телефон из кода страны и номера
            let phone = ''
            if (values.phoneNumber) {
                phone = values.dialCode ? `${values.dialCode} ${values.phoneNumber}` : values.phoneNumber
            }
            
            const updateData = {
                firstName: values.firstName,
                lastName: values.lastName,
                ...(phone && { phone }),
                ...(values.address && { address: values.address }),
                ...(values.city && { city: values.city }),
                ...(values.country && { state: values.country }),
                ...(values.postcode && { zipCode: values.postcode }),
            }
            
            await updateProfileMutation.mutateAsync(updateData)
            
            toast.push(
                <Notification title={t('save')} type="success">
                    Profile updated successfully
                </Notification>,
                {
                    placement: 'top-center',
                },
            )
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error?.response?.data?.errors ? 
                Object.values(error.response.data.errors).flat().join(', ') : 
                'Failed to update profile'
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
                {
                    placement: 'top-center',
                },
            )
        }
    }

    const handleAvatarUpload = async (files) => {
        if (files.length === 0) return
        
        try {
            const file = files[0]
            const result = await uploadAvatarMutation.mutateAsync(file)
            
            // Обрабатываем URL аватара - API возвращает полный URL (http://...)
            let newAvatarUrl = result.avatar || result.data?.avatar || result
            // Бэкенд теперь возвращает полный URL, используем как есть
            if (typeof newAvatarUrl !== 'string') {
                newAvatarUrl = ''
            }
            
            // Обновляем форму с новым аватаром
            const currentValues = control._formValues
            reset({
                ...currentValues,
                img: newAvatarUrl,
            })
            
            // Определяем размещение уведомления: правый верхний угол на десктопе, по центру на мобилке
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
            const placement = isMobile ? 'top-center' : 'top-end'
            
            toast.push(
                <Notification title={t('success')} type="success">
                    {t('avatarUploadedSuccessfully')}
                </Notification>,
                {
                    placement,
                },
            )
        } catch (error) {
            // Определяем размещение уведомления: правый верхний угол на десктопе, по центру на мобилке
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
            const placement = isMobile ? 'top-center' : 'top-end'
            
            toast.push(
                <Notification title="Error" type="danger">
                    {error?.response?.data?.message || error?.response?.data?.errors?.avatar?.[0] || t('avatarUploadFailed')}
                </Notification>,
                {
                    placement,
                },
            )
        }
    }

    const handleAvatarRemove = async () => {
        try {
            await deleteAvatarMutation.mutateAsync()
            
            // Обновляем форму - убираем аватар
            const currentValues = control._formValues
            reset({
                ...currentValues,
                img: '',
            })
            
            // Обновляем userStore
            if (data) {
                setUser({
                    ...data,
                    avatar: null,
                    image: null,
                })
            }
            
            // Определяем размещение уведомления: правый верхний угол на десктопе, по центру на мобилке
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
            const placement = isMobile ? 'top-center' : 'top-end'
            
            toast.push(
                <Notification title={t('success')} type="success">
                    {t('avatarRemovedSuccessfully')}
                </Notification>,
                {
                    placement,
                },
            )
        } catch (error) {
            // Определяем размещение уведомления: правый верхний угол на десктопе, по центру на мобилке
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
            const placement = isMobile ? 'top-center' : 'top-end'
            
            toast.push(
                <Notification title="Error" type="danger">
                    {error?.response?.data?.message || t('avatarRemoveFailed')}
                </Notification>,
                {
                    placement,
                },
            )
        }
    }

    return (
        <>
            <h4 className="mb-8">{t('personalInfo')}</h4>
            <Form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-8">
                    <Controller
                        name="img"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center gap-4">
                                <Avatar
                                    size={90}
                                    className="border-4 border-white bg-gray-100 text-gray-300 shadow-lg"
                                    icon={<HiOutlineUser />}
                                    src={field.value}
                                />
                                <div className="flex items-center gap-2">
                                    <Upload
                                        showList={false}
                                        uploadLimit={1}
                                        beforeUpload={beforeUpload}
                                        onChange={handleAvatarUpload}
                                    >
                                        <Button
                                            variant="solid"
                                            size="sm"
                                            type="button"
                                            icon={<TbPlus />}
                                            loading={uploadAvatarMutation.isPending}
                                        >
                                            {t('uploadImage')}
                                        </Button>
                                    </Upload>
                                    {field.value && (
                                        <Button
                                            size="sm"
                                            type="button"
                                            onClick={handleAvatarRemove}
                                            loading={deleteAvatarMutation.isPending}
                                        >
                                            {t('remove')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <FormItem
                        label={t('firstName')}
                        invalid={Boolean(errors.firstName)}
                        errorMessage={errors.firstName?.message}
                    >
                        <Controller
                            name="firstName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('firstNamePlaceholder')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label={t('lastName')}
                        invalid={Boolean(errors.lastName)}
                        errorMessage={errors.lastName?.message}
                    >
                        <Controller
                            name="lastName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('lastNamePlaceholder')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                {data?.email && (
                    <FormItem label={t('email')}>
                        <Input
                            type="email"
                            value={data.email}
                            disabled
                            readOnly
                        />
                    </FormItem>
                )}
                <div className="flex items-end gap-4 w-full mb-6">
                    <FormItem
                        invalid={
                            Boolean(errors.phoneNumber) ||
                            Boolean(errors.dialCode)
                        }
                    >
                        <label className="form-label mb-2">{t('phoneNumber')}</label>
                        <Controller
                            name="dialCode"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    instanceId="dial-code"
                                    options={dialCodeList}
                                    {...field}
                                    className="w-[150px]"
                                    components={{
                                        Option: (props) => (
                                            <CustomSelectOption
                                                variant="phone"
                                                {...props}
                                            />
                                        ),
                                        Control: CustomControl,
                                    }}
                                    placeholder=""
                                    value={dialCodeList.filter(
                                        (option) =>
                                            option.dialCode === field.value,
                                    )}
                                    onChange={(option) =>
                                        field.onChange(option?.dialCode)
                                    }
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        className="w-full"
                        invalid={
                            Boolean(errors.phoneNumber) ||
                            Boolean(errors.dialCode)
                        }
                        errorMessage={errors.phoneNumber?.message}
                    >
                        <Controller
                            name="phoneNumber"
                            control={control}
                            render={({ field }) => (
                                <NumericInput
                                    autoComplete="off"
                                    placeholder={t('phoneNumberPlaceholder')}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                <h4 className="mb-6">{t('addressInfo')}</h4>
                <FormItem
                    label={t('country')}
                    invalid={Boolean(errors.country)}
                    errorMessage={errors.country?.message}
                >
                    <Controller
                        name="country"
                        control={control}
                        render={({ field }) => (
                            <Select
                                instanceId="country"
                                options={countryList}
                                {...field}
                                components={{
                                    Option: (props) => (
                                        <CustomSelectOption
                                            variant="country"
                                            {...props}
                                        />
                                    ),
                                    Control: CustomControl,
                                }}
                                placeholder=""
                                value={countryList.filter(
                                    (option) => option.value === field.value,
                                )}
                                onChange={(option) =>
                                    field.onChange(option?.value)
                                }
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('address')}
                    invalid={Boolean(errors.address)}
                    errorMessage={errors.address?.message}
                >
                    <Controller
                        name="address"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder={t('addressPlaceholder')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem
                        label={t('city')}
                        invalid={Boolean(errors.city)}
                        errorMessage={errors.city?.message}
                    >
                        <Controller
                            name="city"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('cityPlaceholder')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label={t('postalCode')}
                        invalid={Boolean(errors.postcode)}
                        errorMessage={errors.postcode?.message}
                    >
                        <Controller
                            name="postcode"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    autoComplete="off"
                                    placeholder={t('postalCodePlaceholder')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end">
                    <Button
                        variant="solid"
                        type="submit"
                        loading={isSubmitting || updateProfileMutation.isPending}
                    >
                        {t('save')}
                    </Button>
                </div>
            </Form>
        </>
    )
}

export default SettingsProfile
