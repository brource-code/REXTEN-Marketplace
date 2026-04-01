'use client'
import { useState, useEffect } from 'react'
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

const ProfileTab = () => {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
    })
    const [avatar, setAvatar] = useState(null)

    const { data: profile, isLoading } = useQuery({
        queryKey: ['business-profile'],
        queryFn: getBusinessProfile,
    })

    const updateProfileMutation = useMutation({
        mutationFn: updateBusinessProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-profile'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Профиль успешно обновлен
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить профиль
                </Notification>,
            )
        },
    })

    const uploadAvatarMutation = useMutation({
        mutationFn: uploadBusinessAvatar,
        onSuccess: (data) => {
            setAvatar(data.avatar)
            queryClient.invalidateQueries({ queryKey: ['business-profile'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Аватар успешно загружен
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось загрузить аватар
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
                website: profile.website || '',
            })
            setAvatar(profile.avatar)
        }
    }, [profile])

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            uploadAvatarMutation.mutate(file)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        updateProfileMutation.mutate(formData)
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
            <form onSubmit={handleSubmit}>
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
                                    Загрузить фото
                                </Button>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                                Рекомендуемый размер: 400x400px
                            </p>
                        </div>
                    </div>

                    {/* Основная информация */}
                    <FormItem label="Название бизнеса">
                        <Input
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Введите название"
                        />
                    </FormItem>

                    <FormItem label="Описание">
                        <Input
                            textArea
                            rows={4}
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Опишите ваш бизнес"
                        />
                    </FormItem>

                    <FormItem label="Адрес">
                        <Input
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="Введите адрес"
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem label="Телефон">
                            <Input
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="+7 (999) 123-45-67"
                            />
                        </FormItem>
                        <FormItem label="Email">
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="email@example.com"
                            />
                        </FormItem>
                    </div>

                    <FormItem label="Веб-сайт">
                        <Input
                            value={formData.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            placeholder="https://example.com"
                        />
                    </FormItem>

                    {/* Ссылка на публичный профиль */}
                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold mb-1">Публичный профиль</p>
                                <p className="text-sm text-gray-500">
                                    Просмотр вашего бизнеса на платформе
                                </p>
                            </div>
                            <Link 
                                href={`/marketplace/${formData.name.toLowerCase().replace(/\s+/g, '-')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button
                                    type="button"
                                    variant="outline"
                                    icon={<PiArrowSquareOut />}
                                >
                                    Открыть профиль
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="plain"
                            onClick={() => {
                                if (profile) {
                                    setFormData({
                                        name: profile.name || '',
                                        description: profile.description || '',
                                        address: profile.address || '',
                                        phone: profile.phone || '',
                                        email: profile.email || '',
                                        website: profile.website || '',
                                    })
                                }
                            }}
                        >
                            Отмена
                        </Button>
                        <Button 
                            type="submit" 
                            variant="solid"
                            loading={updateProfileMutation.isPending}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default ProfileTab

