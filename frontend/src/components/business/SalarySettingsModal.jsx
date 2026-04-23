'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Radio from '@/components/ui/Radio'
import DatePicker from '@/components/ui/DatePicker'
import Switcher from '@/components/ui/Switcher'
import { useUpdateSalarySettings, useSalarySettings } from '@/hooks/api/useBusinessSalary'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'

const SalarySettingsModal = ({ isOpen, onClose, specialistId, specialistName }) => {
    const t = useTranslations('business.salarySettings')
    const tCommon = useTranslations('business.common')
    const [paymentType, setPaymentType] = useState('percent')
    const [percentRate, setPercentRate] = useState('')
    const [fixedAmount, setFixedAmount] = useState('')
    const [hourlyRate, setHourlyRate] = useState('')
    const [effectiveFrom, setEffectiveFrom] = useState(new Date())
    const [effectiveTo, setEffectiveTo] = useState(null)
    const [isActive, setIsActive] = useState(true)

    const updateSettingsMutation = useUpdateSalarySettings()
    
    // Загружаем существующие настройки
    const { data: settingsData, isLoading: isLoadingSettings } = useSalarySettings(
        specialistId && isOpen ? specialistId : 0
    )

    // Заполняем форму существующими настройками при открытии
    useEffect(() => {
        if (isOpen && settingsData) {
            // settingsData - это массив настроек, возвращаемый из API
            const settings = Array.isArray(settingsData) ? settingsData : (settingsData?.data || [])
            
            if (settings.length > 0) {
                // Берем последнюю настройку (самую свежую по дате начала действия)
                const latestSetting = settings[0]
                
                setPaymentType(latestSetting.payment_type || 'percent')
                setPercentRate(latestSetting.percent_rate ? String(latestSetting.percent_rate) : '')
                setFixedAmount(latestSetting.fixed_amount ? String(latestSetting.fixed_amount) : '')
                setHourlyRate(latestSetting.hourly_rate ? String(latestSetting.hourly_rate) : '')
                setEffectiveFrom(latestSetting.effective_from ? new Date(latestSetting.effective_from) : new Date())
                setEffectiveTo(latestSetting.effective_to ? new Date(latestSetting.effective_to) : null)
                setIsActive(latestSetting.is_active !== undefined ? latestSetting.is_active : true)
            } else {
                // Если настройки отсутствуют, сбрасываем форму к значениям по умолчанию
                setPaymentType('percent')
                setPercentRate('')
                setFixedAmount('')
                setHourlyRate('')
                setEffectiveFrom(new Date())
                setEffectiveTo(null)
                setIsActive(true)
            }
        }
    }, [isOpen, settingsData])

    const handleSubmit = (e) => {
        e.preventDefault()

        // Проверяем, что specialistId валиден
        if (!specialistId || typeof specialistId !== 'number') {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('errors.invalidSpecialist')}
                </Notification>,
            )
            return
        }

        // Валидация в зависимости от типа оплаты
        if (paymentType === 'percent' && !percentRate) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('errors.percentRequired')}
                </Notification>,
            )
            return
        }

        if (paymentType === 'fixed' && !fixedAmount) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('errors.fixedRequired')}
                </Notification>,
            )
            return
        }

        if (paymentType === 'fixed_plus_percent') {
            if (!fixedAmount || !percentRate) {
                toast.push(
                    <Notification title={tCommon('error')} type="danger">
                        {t('errors.fixedAndPercentRequired')}
                    </Notification>,
                )
                return
            }
        }

        if (paymentType === 'hourly' && !hourlyRate) {
            toast.push(
                <Notification title={tCommon('error')} type="danger">
                    {t('errors.hourlyRequired')}
                </Notification>,
            )
            return
        }

        const data = {
            payment_type: paymentType,
            percent_rate: paymentType === 'percent' || paymentType === 'fixed_plus_percent' ? parseFloat(percentRate) : null,
            fixed_amount: paymentType === 'fixed' || paymentType === 'fixed_plus_percent' ? parseFloat(fixedAmount) : null,
            hourly_rate: paymentType === 'hourly' ? parseFloat(hourlyRate) : null,
            is_active: isActive,
            effective_from: effectiveFrom.toISOString().split('T')[0],
            effective_to: effectiveTo ? effectiveTo.toISOString().split('T')[0] : null,
        }

        updateSettingsMutation.mutate(
            { specialistId, data },
            {
                onSuccess: () => {
                    toast.push(
                        <Notification title={tCommon('success')} type="success">
                            {t('saveSuccess')}
                        </Notification>,
                    )
                    onClose()
                },
                onError: (error) => {
                    const errorMessage = error?.response?.data?.message || t('saveError')
                    toast.push(
                        <Notification title={tCommon('error')} type="danger">
                            {errorMessage}
                        </Notification>,
                    )
                },
            }
        )
    }

    const paymentTypeOptions = [
        { value: 'percent', label: t('paymentTypes.percent') },
        { value: 'fixed', label: t('paymentTypes.fixed') },
        { value: 'fixed_plus_percent', label: t('paymentTypes.fixedPlusPercent') },
        { value: 'hourly', label: t('paymentTypes.hourly') },
    ]

    const dialogStyle = {
        content: { overflow: 'visible' },
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            width={500}
            style={dialogStyle}
            shouldFocusAfterRender={false}
        >
            <form onSubmit={handleSubmit}>
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('title')}</h3>
                    {specialistName && (
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                            {specialistName}
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 space-y-4">
                    {isLoadingSettings && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            {t('loading')}
                        </div>
                    )}

                    <FormItem label={t('labels.paymentType')} required>
                        <div className="grid grid-cols-2 gap-2">
                            {paymentTypeOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                                        paymentType === option.value
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <Radio
                                        checked={paymentType === option.value}
                                        onChange={() => setPaymentType(option.value)}
                                        value={option.value}
                                        className="!m-0"
                                    />
                                    <span className="leading-tight">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </FormItem>

                    {(paymentType === 'percent' || paymentType === 'fixed_plus_percent') && (
                        <FormItem label={t('labels.percentRate')} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={percentRate}
                                onChange={(e) => setPercentRate(e.target.value)}
                                placeholder={t('placeholders.percent')}
                                required
                            />
                        </FormItem>
                    )}

                    {(paymentType === 'fixed' || paymentType === 'fixed_plus_percent') && (
                        <FormItem label={t('labels.fixedAmount')} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={fixedAmount}
                                onChange={(e) => setFixedAmount(e.target.value)}
                                placeholder={t('placeholders.fixed')}
                                required
                            />
                        </FormItem>
                    )}

                    {paymentType === 'hourly' && (
                        <FormItem label={t('labels.hourlyRate')} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                placeholder={t('placeholders.hourly')}
                                required
                            />
                        </FormItem>
                    )}

                    <div className="grid grid-cols-2 gap-4 items-end">
                        <FormItem label={t('labels.effectiveFrom')} required>
                            <DatePicker
                                value={effectiveFrom}
                                onChange={setEffectiveFrom}
                                inputtable
                                inputtableBlur={false}
                            />
                        </FormItem>

                        <FormItem label={t('labels.effectiveTo')}>
                            <DatePicker
                                value={effectiveTo}
                                onChange={setEffectiveTo}
                                inputtable
                                inputtableBlur={false}
                                clearable
                            />
                        </FormItem>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('labels.settingActive')}
                        </span>
                        <Switcher
                            checked={isActive}
                            onChange={(val) => setIsActive(val)}
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        variant="solid"
                        type="submit"
                        loading={updateSettingsMutation.isPending}
                    >
                        {tCommon('save')}
                    </Button>
                </div>
            </form>
        </Dialog>
    )
}

export default SalarySettingsModal
