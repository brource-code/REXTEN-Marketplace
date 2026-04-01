'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Avatar from '@/components/ui/Avatar'
import { PiUpload, PiEye, PiArrowSquareOut } from 'react-icons/pi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessProfile, updateBusinessProfile, uploadBusinessAvatar } from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import AddressAutocomplete from '@/components/shared/AddressAutocomplete'
import useDebounce from '@/utils/hooks/useDebounce'

const ProfileTab = () => {
    const t = useTranslations('business.settings.profile')
    const tCommon = useTranslations('business.common')
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        telegram: '',
        whatsapp: '',
        website: '',
    })
    const [avatar, setAvatar] = useState(null)
    const isInitialMount = useRef(true)
    const hasChanges = useRef(false)

    const { data: profile, isLoading } = useQuery({
        queryKey: ['business-profile'],
        queryFn: getBusinessProfile,
    })

    const updateProfileMutation = useMutation({
        mutationFn: updateBusinessProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-profile'] })
            hasChanges.current = false
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('success')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('error')}
                </Notification>,
            )
        },
    })

    // Автосохранение с debounce — используем ref для актуальных данных (избегаем stale closure)
    const formDataRef = useRef(formData)
    formDataRef.current = formData
    const mutationRef = useRef(updateProfileMutation)
    mutationRef.current = updateProfileMutation

    const debouncedSave = useMemo(
        () =>
            useDebounce(() => {
                if (hasChanges.current && !isInitialMount.current) {
                    mutationRef.current.mutate(formDataRef.current)
                }
            }, 1000),
        [],
    )

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                description: profile.description || '',
                address: profile.address || '',
                phone: profile.phone || '',
                email: profile.email || '',
                telegram: profile.telegram || '',
                whatsapp: profile.whatsapp || '',
                website: profile.website || '',
            })
            setAvatar(profile.avatar)
            isInitialMount.current = true
            hasChanges.current = false
            setTimeout(() => {
                isInitialMount.current = false
            }, 150)
        }
    }, [profile])

    // Автосохранение при изменении данных
    useEffect(() => {
        if (!isInitialMount.current && hasChanges.current) {
            debouncedSave()
        }
    }, [formData, debouncedSave])

    const uploadAvatarMutation = useMutation({
        mutationFn: uploadBusinessAvatar,
        onSuccess: (data) => {
            setAvatar(data.avatar)
            queryClient.invalidateQueries({ queryKey: ['business-profile'] })
            toast.push(
                <Notification title={tCommon('success')} type="success">
                    {t('avatarSuccess')}
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('avatarError')}
                </Notification>,
            )
        },
    })

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                description: profile.description || '',
                address: profile.address || '',
                phone: profile.phone || '',
                email: profile.email || '',
                telegram: profile.telegram || '',
                whatsapp: profile.whatsapp || '',
                website: profile.website || '',
            })
            setAvatar(profile.avatar)
        }
    }, [profile])

    const handleChange = (field, value) => {
        hasChanges.current = true
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadAvatarMutation.mutate(file)
        }
    }


    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <FormContainer>
            <div className="flex flex-col gap-6">
                    {/* Аватар */}
                    <div className="flex items-center gap-4">
                        <Avatar size={100} shape="circle" src={avatar} />
                        <div>
                            <label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                    disabled={uploadAvatarMutation.isPending}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    icon={<PiUpload />}
                                    loading={uploadAvatarMutation.isPending}
                                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                                >
                                    {t('uploadPhoto')}
                                </Button>
                            </label>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2">
                                {t('recommendedSize')}
                            </p>
                        </div>
                    </div>

                    {/* Основная информация */}
                    <FormItem label={t('companyName')}>
                        <Input
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder={t('enterName')}
                        />
                    </FormItem>

                    <FormItem label={t('description')}>
                        <Input
                            textArea
                            rows={4}
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder={t('describeYourBusiness')}
                        />
                    </FormItem>

                    <FormItem label={t('address')}>
                        <AddressAutocomplete
                            value={formData.address}
                            onChange={(address) => handleChange('address', address)}
                            placeholder={t('enterAddress')}
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem label={t('phone')}>
                            <Input
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder={t('phonePlaceholder')}
                            />
                        </FormItem>
                        <FormItem label={t('email')}>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder={t('emailPlaceholder')}
                            />
                        </FormItem>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem label={t('telegram')}>
                            <Input
                                value={formData.telegram}
                                onChange={(e) => handleChange('telegram', e.target.value)}
                                placeholder={t('telegramPlaceholder')}
                            />
                        </FormItem>
                        <FormItem label={t('whatsapp')}>
                            <Input
                                value={formData.whatsapp}
                                onChange={(e) => handleChange('whatsapp', e.target.value)}
                                placeholder={t('whatsappPlaceholder')}
                            />
                        </FormItem>
                    </div>

                    <FormItem label={t('website')}>
                        <Input
                            value={formData.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            placeholder={t('websitePlaceholder')}
                        />
                    </FormItem>

                    {/* Ссылка на публичный профиль */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t('publicProfile')}</p>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {t('viewOnPlatform')}
                                </p>
                            </div>
                            <Link 
                                href={`/marketplace/company/${profile?.slug || formData.name.toLowerCase().replace(/\s+/g, '-')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    icon={<PiArrowSquareOut />}
                                >
                                    {t('openProfile')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
        </FormContainer>
    )
}

export default ProfileTab

