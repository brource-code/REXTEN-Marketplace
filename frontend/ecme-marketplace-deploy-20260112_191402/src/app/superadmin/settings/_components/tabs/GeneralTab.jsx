'use client'
import { useState, useEffect } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Card from '@/components/ui/Card'
import Logo from '@/components/template/Logo'
import useTheme from '@/utils/hooks/useTheme'

const GeneralTab = () => {
    const mode = useTheme((state) => state.mode)
    const queryClient = useQueryClient()
    
    // Загружаем настройки из API
    const { data: settings, isLoading } = useQuery({
        queryKey: ['platform-settings'],
        queryFn: getPlatformSettings,
    })

    const [formData, setFormData] = useState({
        siteName: '',
        siteDescription: '',
        contactEmail: '',
        contactPhone: '',
        logoText: 'REXTEN',
        logoColorLight: '#0F172A',
        logoColorDark: '#FFFFFF',
        logoSize: 26,
        logoIconColorLight: '#2563EB',
        logoIconColorDark: '#696cff',
    })

    // Обновляем форму при загрузке данных
    useEffect(() => {
        if (settings) {
            setFormData({
                siteName: settings.siteName || '',
                siteDescription: settings.siteDescription || '',
                contactEmail: settings.contactEmail || '',
                contactPhone: settings.contactPhone || '',
                logoText: settings.logoText || 'REXTEN',
                logoColorLight: settings.logoColorLight || '#0F172A',
                logoColorDark: settings.logoColorDark || '#FFFFFF',
                logoSize: settings.logoSize || 26,
                logoIconColorLight: settings.logoIconColorLight || '#2563EB',
                logoIconColorDark: settings.logoIconColorDark || '#696cff',
            })
        }
    }, [settings])

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const updateMutation = useMutation({
        mutationFn: updatePlatformSettings,
        onSuccess: () => {
            // Инвалидируем кэш для всех компонентов, использующих настройки
            queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
            // Также обновляем кэш немедленно для мгновенного отображения
            queryClient.refetchQueries({ queryKey: ['platform-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки сохранены
                </Notification>
            )
        },
        onError: (error) => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить настройки
                </Notification>
            )
        },
    })


    const handleSubmit = (e) => {
        e.preventDefault()
        updateMutation.mutate(formData)
    }

    if (isLoading) {
        return (
            <FormContainer>
                <div className="flex items-center justify-center py-12">
                    <Loading loading />
                </div>
            </FormContainer>
        )
    }

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    <FormItem label="Название платформы">
                        <Input
                            value={formData.siteName}
                            onChange={(e) =>
                                handleChange('siteName', e.target.value)
                            }
                            placeholder="Введите название"
                        />
                    </FormItem>

                    <FormItem label="Описание платформы">
                        <Input
                            value={formData.siteDescription}
                            onChange={(e) =>
                                handleChange('siteDescription', e.target.value)
                            }
                            placeholder="Введите описание"
                        />
                    </FormItem>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormItem label="Email поддержки">
                            <Input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) =>
                                    handleChange('contactEmail', e.target.value)
                                }
                                placeholder="support@example.com"
                            />
                        </FormItem>
                        <FormItem label="Телефон поддержки">
                            <Input
                                value={formData.contactPhone}
                                onChange={(e) =>
                                    handleChange('contactPhone', e.target.value)
                                }
                                placeholder="+7 (999) 123-45-67"
                            />
                        </FormItem>
                    </div>

                    {/* Кастомизация логотипа */}
                    <Card className="p-6">
                        <h4 className="mb-4">Кастомизация логотипа</h4>
                        <div className="flex flex-col gap-6">
                            {/* Превью логотипа */}
                            <div>
                                <FormItem label="Превью">
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 flex items-center justify-center">
                                        <Logo
                                            type="full"
                                            mode={mode}
                                            forceSvg={true}
                                            imgClass="max-h-16"
                                            customText={formData.logoText}
                                            customColorLight={formData.logoColorLight}
                                            customColorDark={formData.logoColorDark}
                                            customSize={formData.logoSize}
                                            customIconColorLight={formData.logoIconColorLight}
                                            customIconColorDark={formData.logoIconColorDark}
                                        />
                                    </div>
                                </FormItem>
                            </div>

                            {/* Настройки */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormItem label="Текст логотипа">
                                    <Input
                                        value={formData.logoText}
                                        onChange={(e) =>
                                            handleChange('logoText', e.target.value.toUpperCase())
                                        }
                                        placeholder="REXTEN"
                                        maxLength={50}
                                    />
                                </FormItem>

                                <FormItem label="Размер текста (px)">
                                    <Input
                                        type="number"
                                        value={formData.logoSize}
                                        onChange={(e) =>
                                            handleChange('logoSize', parseInt(e.target.value) || 26)
                                        }
                                        min={12}
                                        max={48}
                                        placeholder="26"
                                    />
                                </FormItem>

                                <FormItem label="Цвет текста (светлая тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoColorLight}
                                            onChange={(e) =>
                                                handleChange('logoColorLight', e.target.value)
                                            }
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoColorLight}
                                            onChange={(e) =>
                                                handleChange('logoColorLight', e.target.value)
                                            }
                                            placeholder="#0F172A"
                                        />
                                    </div>
                                </FormItem>

                                <FormItem label="Цвет текста (темная тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoColorDark}
                                            onChange={(e) =>
                                                handleChange('logoColorDark', e.target.value)
                                            }
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoColorDark}
                                            onChange={(e) =>
                                                handleChange('logoColorDark', e.target.value)
                                            }
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                </FormItem>

                                <FormItem label="Цвет иконки (светлая тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoIconColorLight}
                                            onChange={(e) =>
                                                handleChange('logoIconColorLight', e.target.value)
                                            }
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoIconColorLight}
                                            onChange={(e) =>
                                                handleChange('logoIconColorLight', e.target.value)
                                            }
                                            placeholder="#2563EB"
                                        />
                                    </div>
                                </FormItem>

                                <FormItem label="Цвет иконки (темная тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoIconColorDark}
                                            onChange={(e) =>
                                                handleChange('logoIconColorDark', e.target.value)
                                            }
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoIconColorDark}
                                            onChange={(e) =>
                                                handleChange('logoIconColorDark', e.target.value)
                                            }
                                            placeholder="#696cff"
                                        />
                                    </div>
                                </FormItem>
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="plain">
                            Отмена
                        </Button>
                        <Button 
                            type="submit" 
                            variant="solid"
                            loading={updateMutation.isPending}
                        >
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default GeneralTab

