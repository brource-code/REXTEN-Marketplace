'use client'

import { useState, useEffect, useMemo } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { FormItem, FormContainer } from '@/components/ui/Form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/api/superadmin'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import Card from '@/components/ui/Card'
import Logo from '@/components/template/Logo'
import useTheme from '@/utils/hooks/useTheme'
import { REXTEN_MARK_COLOR } from '@/constants/rexten-brand.constant'

const GeneralTab = () => {
    const mode = useTheme((state) => state.mode)
    const queryClient = useQueryClient()

    const timezoneOptions = useMemo(
        () => [
            { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
            { value: 'America/New_York', label: 'America/New_York (EST)' },
            { value: 'Europe/Moscow', label: 'Europe/Moscow' },
            { value: 'UTC', label: 'UTC' },
        ],
        [],
    )

    const currencyOptions = useMemo(
        () => [
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'RUB', label: 'RUB' },
        ],
        [],
    )

    const languageOptions = useMemo(
        () => [
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
            { value: 'es-MX', label: 'Español (México)' },
            { value: 'hy-AM', label: 'Հայերեն' },
            { value: 'uk-UA', label: 'Українська' },
        ],
        [],
    )

    const { data: settings, isLoading } = useQuery({
        queryKey: ['platform-settings'],
        queryFn: getPlatformSettings,
    })

    const [formData, setFormData] = useState({
        siteName: '',
        siteDescription: '',
        contactEmail: '',
        contactPhone: '',
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        defaultLanguage: 'ru',
        companyName: '',
        companyAddress: '',
        companyTaxId: '',
        instagramUrl: '',
        facebookUrl: '',
        twitterUrl: '',
        logoText: 'REXTEN',
        logoColorLight: '#0F172A',
        logoColorDark: '#FFFFFF',
        logoSize: 26,
        logoIconColorLight: REXTEN_MARK_COLOR,
        logoIconColorDark: REXTEN_MARK_COLOR,
    })

    useEffect(() => {
        if (settings) {
            setFormData((prev) => ({
                ...prev,
                siteName: settings.siteName || '',
                siteDescription: settings.siteDescription || '',
                contactEmail: settings.contactEmail || '',
                contactPhone: settings.contactPhone || '',
                timezone: settings.timezone || 'America/Los_Angeles',
                currency: settings.currency || 'USD',
                defaultLanguage: settings.defaultLanguage || 'ru',
                companyName: settings.companyName || '',
                companyAddress: settings.companyAddress || '',
                companyTaxId: settings.companyTaxId || '',
                instagramUrl: settings.instagramUrl || '',
                facebookUrl: settings.facebookUrl || '',
                twitterUrl: settings.twitterUrl || '',
                logoText: settings.logoText || 'REXTEN',
                logoColorLight: settings.logoColorLight || '#0F172A',
                logoColorDark: settings.logoColorDark || '#FFFFFF',
                logoSize: settings.logoSize || 26,
                logoIconColorLight: settings.logoIconColorLight || REXTEN_MARK_COLOR,
                logoIconColorDark: settings.logoIconColorDark || REXTEN_MARK_COLOR,
            }))
        }
    }, [settings])

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const updateMutation = useMutation({
        mutationFn: updatePlatformSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Настройки сохранены
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось сохранить настройки
                </Notification>,
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
                    <Card className="p-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            Основное
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem label="Название платформы">
                                <Input
                                    value={formData.siteName}
                                    onChange={(e) => handleChange('siteName', e.target.value)}
                                    placeholder="Введите название"
                                />
                            </FormItem>
                            <FormItem label="Описание платформы">
                                <Input
                                    value={formData.siteDescription}
                                    onChange={(e) => handleChange('siteDescription', e.target.value)}
                                    placeholder="Введите описание"
                                />
                            </FormItem>
                            <FormItem label="Email поддержки">
                                <Input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                                    placeholder="support@example.com"
                                />
                            </FormItem>
                            <FormItem label="Телефон поддержки">
                                <Input
                                    value={formData.contactPhone}
                                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                                    placeholder="+1 555 000 00 00"
                                />
                            </FormItem>
                            <FormItem label="Часовой пояс платформы">
                                <Select
                                    value={timezoneOptions.find((o) => o.value === formData.timezone)}
                                    options={timezoneOptions}
                                    onChange={(opt) => handleChange('timezone', opt?.value || 'America/Los_Angeles')}
                                    isSearchable={false}
                                />
                            </FormItem>
                            <FormItem label="Валюта по умолчанию">
                                <Select
                                    value={currencyOptions.find((o) => o.value === formData.currency)}
                                    options={currencyOptions}
                                    onChange={(opt) => handleChange('currency', opt?.value || 'USD')}
                                    isSearchable={false}
                                />
                            </FormItem>
                            <FormItem label="Язык по умолчанию">
                                <Select
                                    value={languageOptions.find((o) => o.value === formData.defaultLanguage)}
                                    options={languageOptions}
                                    onChange={(opt) => handleChange('defaultLanguage', opt?.value || 'ru')}
                                    isSearchable={false}
                                />
                            </FormItem>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            Юридическая информация
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem label="Название компании">
                                <Input
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    placeholder="REXTEN Marketplace LLC"
                                />
                            </FormItem>
                            <FormItem label="ИНН / Tax ID">
                                <Input
                                    value={formData.companyTaxId}
                                    onChange={(e) => handleChange('companyTaxId', e.target.value)}
                                    placeholder="123456789"
                                />
                            </FormItem>
                            <FormItem label="Юридический адрес">
                                <Input
                                    value={formData.companyAddress}
                                    onChange={(e) => handleChange('companyAddress', e.target.value)}
                                    placeholder="Street, city, country"
                                />
                            </FormItem>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            Социальные сети
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormItem label="Instagram URL">
                                <Input
                                    value={formData.instagramUrl}
                                    onChange={(e) => handleChange('instagramUrl', e.target.value)}
                                    placeholder="https://instagram.com/rexten"
                                />
                            </FormItem>
                            <FormItem label="Facebook URL">
                                <Input
                                    value={formData.facebookUrl}
                                    onChange={(e) => handleChange('facebookUrl', e.target.value)}
                                    placeholder="https://facebook.com/rexten"
                                />
                            </FormItem>
                            <FormItem label="Twitter/X URL">
                                <Input
                                    value={formData.twitterUrl}
                                    onChange={(e) => handleChange('twitterUrl', e.target.value)}
                                    placeholder="https://x.com/rexten"
                                />
                            </FormItem>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Кастомизация логотипа</h4>
                        <div className="flex flex-col gap-6">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormItem label="Текст логотипа">
                                    <Input
                                        value={formData.logoText}
                                        onChange={(e) => handleChange('logoText', e.target.value.toUpperCase())}
                                        placeholder="REXTEN"
                                        maxLength={50}
                                    />
                                </FormItem>
                                <FormItem label="Размер текста (px)">
                                    <Input
                                        type="number"
                                        value={formData.logoSize}
                                        onChange={(e) => handleChange('logoSize', parseInt(e.target.value, 10) || 26)}
                                        min={12}
                                        max={48}
                                    />
                                </FormItem>
                                <FormItem label="Цвет текста (светлая тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoColorLight}
                                            onChange={(e) => handleChange('logoColorLight', e.target.value)}
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoColorLight}
                                            onChange={(e) => handleChange('logoColorLight', e.target.value)}
                                        />
                                    </div>
                                </FormItem>
                                <FormItem label="Цвет текста (темная тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoColorDark}
                                            onChange={(e) => handleChange('logoColorDark', e.target.value)}
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoColorDark}
                                            onChange={(e) => handleChange('logoColorDark', e.target.value)}
                                        />
                                    </div>
                                </FormItem>
                                <FormItem label="Цвет иконки (светлая тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoIconColorLight}
                                            onChange={(e) => handleChange('logoIconColorLight', e.target.value)}
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoIconColorLight}
                                            onChange={(e) => handleChange('logoIconColorLight', e.target.value)}
                                        />
                                    </div>
                                </FormItem>
                                <FormItem label="Цвет иконки (темная тема)">
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.logoIconColorDark}
                                            onChange={(e) => handleChange('logoIconColorDark', e.target.value)}
                                            className="w-16 h-10"
                                        />
                                        <Input
                                            value={formData.logoIconColorDark}
                                            onChange={(e) => handleChange('logoIconColorDark', e.target.value)}
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
                        <Button type="submit" variant="solid" loading={updateMutation.isPending}>
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default GeneralTab
