'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import Radio from '@/components/ui/Radio'
import DatePicker from '@/components/ui/DatePicker'
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

    useEffect(() => {
        if (!isOpen) {
            // Сброс формы при закрытии
            setPaymentType('percent')
            setPercentRate('')
            setFixedAmount('')
            setHourlyRate('')
            setEffectiveFrom(new Date())
            setEffectiveTo(null)
            setIsActive(true)
        }
    }, [isOpen])

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

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={600}>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h3 className="text-lg">{t('title')}</h3>
                        {specialistName && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {specialistName}
                            </p>
                        )}
                    </div>

                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {isLoadingSettings && (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                {t('loading')}
                            </div>
                        )}
                        <FormItem label={t('labels.paymentType')} required>
                            <div className="space-y-2">
                                {paymentTypeOptions.map((option) => (
                                    <Radio
                                        key={option.value}
                                        checked={paymentType === option.value}
                                        onChange={() => setPaymentType(option.value)}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </Radio>
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
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setPercentRate(value === '' ? '' : value)
                                    }}
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
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setFixedAmount(value === '' ? '' : value)
                                    }}
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
                                    onChange={(e) => {
                                        const value = e.target.value
                                        setHourlyRate(value === '' ? '' : value)
                                    }}
                                    placeholder={t('placeholders.hourly')}
                                    required
                                />
                            </FormItem>
                        )}

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
                            />
                        </FormItem>

                        <FormItem label={t('labels.active')}>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    {t('labels.settingActive')}
                                </span>
                            </div>
                        </FormItem>
                    </div>

                    {/* Футер */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                        <Button variant="plain" onClick={onClose}>
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
                </div>
            </form>
        </Dialog>
    )
}

export default SalarySettingsModal
