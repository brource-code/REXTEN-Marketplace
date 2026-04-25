'use client'

import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AmountInput from '@/components/ui/AmountInput/AmountInput'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { PiPlus, PiTrash } from 'react-icons/pi'
import { ServiceAdditionalServicesManager } from './ServiceAdditionalServicesManager'

export function AdvertisementCreateServicesSection({
    formData,
    setFormData,
    companyServices,
    addService,
    removeService,
    updateService,
    handleSelectServiceFromTable,
    handleClearServiceSelection,
}) {
    const t = useTranslations('business.advertisements.create')
    /** Порядок в массиве: новее сверху (prepend + сортировка при загрузке). Номер в UI — по порядку добавления: #1 первая, сверху последняя = #N. */
    const services = Array.isArray(formData.services) ? formData.services : []
    const serviceCount = services.length

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('services.title')}</h4>
                <Button size="sm" icon={<PiPlus />} onClick={addService} type="button">
                    {t('services.addService')}
                </Button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700 sm:space-y-4 sm:divide-y-0">
                {services.map((service, index) => (
                    <div
                        key={service.id}
                        className="space-y-3 py-4 sm:space-y-3 sm:rounded-xl sm:border sm:border-gray-200 sm:p-4 sm:py-4 dark:sm:border-gray-700"
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {t('services.serviceNumber', {
                                    number: serviceCount - index,
                                })}
                            </h5>
                            <Button
                                size="sm"
                                variant="plain"
                                icon={<PiTrash />}
                                onClick={() => removeService(service.id)}
                                type="button"
                            />
                        </div>
                        <div className="space-y-3">
                            <FormItem label={t('services.selectTemplate')}>
                                <Select
                                    size="sm"
                                    isSearchable={false}
                                    options={[
                                        { value: null, label: t('services.manualEntry') },
                                        ...(companyServices.length > 0
                                            ? companyServices.map((s) => ({
                                                  value: s.id,
                                                  label: `${s.name} ($${s.price})`,
                                              }))
                                            : []),
                                    ]}
                                    value={
                                        service.service_id
                                            ? {
                                                  value: service.service_id,
                                                  label:
                                                      companyServices.find((s) => s.id === service.service_id)
                                                          ?.name || t('services.title'),
                                              }
                                            : { value: null, label: t('services.manualEntry') }
                                    }
                                    onChange={(option) => {
                                        if (option && option.value) {
                                            handleSelectServiceFromTable(option.value, index)
                                        } else {
                                            handleClearServiceSelection(index)
                                        }
                                    }}
                                    isClearable
                                    placeholder={
                                        companyServices.length > 0
                                            ? t('services.selectOrManual')
                                            : t('services.createTemplates')
                                    }
                                />
                                {companyServices.length === 0 ? (
                                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {t('services.templateHint')}{' '}
                                        <a
                                            href="/business/settings?tab=services"
                                            className="text-primary hover:underline"
                                        >
                                            {t('services.templateHintLink')}
                                        </a>
                                        {t('services.templateHintSuffix')}
                                    </p>
                                ) : null}
                            </FormItem>

                            <FormItem label={t('services.serviceName')} required>
                                <Input
                                    size="sm"
                                    value={service.name || ''}
                                    onChange={(e) => updateService(service.id, 'name', e.target.value)}
                                    placeholder={t('services.serviceNamePlaceholder')}
                                    disabled={false}
                                />
                            </FormItem>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FormItem label={t('services.price')}>
                                    <AmountInput
                                        size="sm"
                                        value={
                                            service.price === '' || service.price == null
                                                ? null
                                                : Number(service.price)
                                        }
                                        onValueChange={(n) =>
                                            updateService(service.id, 'price', n == null ? '' : n)
                                        }
                                        min={0}
                                        placeholder="0"
                                    />
                                </FormItem>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                                    <FormItem label={t('services.duration')}>
                                        <Input
                                            size="sm"
                                            type="number"
                                            min="0"
                                            value={service.duration || ''}
                                            onChange={(e) =>
                                                updateService(service.id, 'duration', e.target.value)
                                            }
                                            placeholder={t('services.durationPlaceholder')}
                                            disabled={false}
                                        />
                                    </FormItem>
                                    <FormItem label={t('services.durationUnit')}>
                                        <Select
                                            size="sm"
                                            value={
                                                service.duration_unit
                                                    ? {
                                                          value: service.duration_unit,
                                                          label:
                                                              service.duration_unit === 'hours'
                                                                  ? t('services.hours')
                                                                  : t('services.days'),
                                                      }
                                                    : { value: 'hours', label: t('services.hours') }
                                            }
                                            onChange={(option) => {
                                                const newValue = option?.value || 'hours'
                                                updateService(service.id, 'duration_unit', newValue)
                                            }}
                                            options={[
                                                { value: 'hours', label: t('services.hours') },
                                                { value: 'days', label: t('services.days') },
                                            ]}
                                            isSearchable={false}
                                        />
                                    </FormItem>
                                </div>
                            </div>
                            <FormItem label={t('services.serviceDescription')}>
                                <Input
                                    value={service.description || ''}
                                    onChange={(e) =>
                                        updateService(service.id, 'description', e.target.value)
                                    }
                                    placeholder={t('services.serviceDescriptionPlaceholder')}
                                    textArea
                                    rows={2}
                                    disabled={false}
                                />
                            </FormItem>

                            <ServiceAdditionalServicesManager
                                serviceId={service.service_id || service.id}
                                serviceName={
                                    service.name ||
                                    companyServices.find((s) => s.id === service.service_id)?.name
                                }
                                isNewService={!service.service_id}
                                serviceData={service}
                                onUpdateService={(updatedService) => {
                                    updateService(
                                        service.id,
                                        'additional_services',
                                        updatedService.additional_services || [],
                                    )
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {serviceCount === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                    {t('services.noServices')}
                </div>
            ) : null}
        </div>
    )
}
