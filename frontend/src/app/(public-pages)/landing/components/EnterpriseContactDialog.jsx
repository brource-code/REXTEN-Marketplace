'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale, useTranslations } from 'next-intl'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { submitEnterpriseLead } from '@/lib/api/contact'

const TEAM_SIZES = ['1-10', '11-50', '51-200', '200+']

const buildSchema = (t) =>
    z.object({
        name: z
            .string()
            .trim()
            .min(2, t('validation.name'))
            .max(150, t('validation.name')),
        email: z.string().trim().email(t('validation.email')).max(190),
        phone: z
            .string()
            .trim()
            .max(50, t('validation.phone'))
            .optional()
            .or(z.literal('')),
        company: z
            .string()
            .trim()
            .max(190, t('validation.company'))
            .optional()
            .or(z.literal('')),
        team_size: z
            .string()
            .optional()
            .or(z.literal(''))
            .refine(
                (v) => !v || TEAM_SIZES.includes(v),
                t('validation.team_size'),
            ),
        message: z
            .string()
            .trim()
            .min(10, t('validation.message_min'))
            .max(2000, t('validation.message_max')),
        consent: z
            .boolean()
            .refine((v) => v === true, { message: t('validation.consent') }),
        website: z.string().optional().or(z.literal('')),
    })

const EnterpriseContactDialog = ({ isOpen, onClose }) => {
    const t = useTranslations('landing.pricing.enterpriseDialog')
    const locale = useLocale()
    const [submitting, setSubmitting] = useState(false)

    const teamSizeOptions = TEAM_SIZES.map((value) => ({
        value,
        label: t(`teamSizes.${value}`, { defaultValue: value }),
    }))

    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setError,
    } = useForm({
        resolver: zodResolver(buildSchema(t)),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            company: '',
            team_size: '',
            message: '',
            consent: false,
            website: '',
        },
        mode: 'onTouched',
    })

    const handleClose = () => {
        if (submitting) return
        reset()
        onClose?.()
    }

    const onSubmit = async (values) => {
        setSubmitting(true)
        const payload = {
            name: values.name,
            email: values.email,
            phone: values.phone || undefined,
            company: values.company || undefined,
            team_size: values.team_size || undefined,
            message: values.message,
            consent: values.consent,
            locale,
            source: 'landing_pricing_enterprise',
            website: values.website || undefined,
        }
        const result = await submitEnterpriseLead(payload)
        setSubmitting(false)

        if (result.success) {
            toast.push(
                <Notification title={t('success.title')} type="success">
                    {t('success.body')}
                </Notification>,
            )
            reset()
            onClose?.()
            return
        }

        if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]) => {
                if (Array.isArray(messages) && messages[0]) {
                    setError(field, { type: 'server', message: messages[0] })
                }
            })
        }

        toast.push(
            <Notification title={t('error.title')} type="danger">
                {t('error.body')}
            </Notification>,
        )
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            width={600}
            closable={!submitting}
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="flex flex-col h-full max-h-[85vh]">
                    {/* Заголовок */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 pr-8">
                            {t('title')}
                        </h4>
                        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {t('subtitle')}
                        </p>
                    </div>

                    {/* Скроллируемый контент */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <input
                            type="text"
                            autoComplete="off"
                            tabIndex={-1}
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: '-9999px',
                                opacity: 0,
                                height: 0,
                                width: 0,
                            }}
                            {...register('website')}
                        />

                        <FormItem
                            label={t('fields.name')}
                            asterisk
                            invalid={!!errors.name}
                            errorMessage={errors.name?.message}
                        >
                            <Input
                                type="text"
                                autoComplete="name"
                                disabled={submitting}
                                {...register('name')}
                            />
                        </FormItem>

                        <FormItem
                            label={t('fields.email')}
                            asterisk
                            invalid={!!errors.email}
                            errorMessage={errors.email?.message}
                        >
                            <Input
                                type="email"
                                autoComplete="email"
                                disabled={submitting}
                                {...register('email')}
                            />
                        </FormItem>

                        <FormItem
                            label={t('fields.phone')}
                            invalid={!!errors.phone}
                            errorMessage={errors.phone?.message}
                        >
                            <Input
                                type="tel"
                                autoComplete="tel"
                                disabled={submitting}
                                {...register('phone')}
                            />
                        </FormItem>

                        <FormItem
                            label={t('fields.company')}
                            invalid={!!errors.company}
                            errorMessage={errors.company?.message}
                        >
                            <Input
                                type="text"
                                autoComplete="organization"
                                disabled={submitting}
                                {...register('company')}
                            />
                        </FormItem>

                        <FormItem
                            label={t('fields.team_size')}
                            invalid={!!errors.team_size}
                            errorMessage={errors.team_size?.message}
                        >
                            <Controller
                                name="team_size"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        isSearchable={false}
                                        isClearable
                                        isDisabled={submitting}
                                        placeholder={t('teamSizePlaceholder')}
                                        options={teamSizeOptions}
                                        value={
                                            teamSizeOptions.find(
                                                (o) => o.value === field.value,
                                            ) || null
                                        }
                                        onChange={(opt) =>
                                            field.onChange(opt?.value || '')
                                        }
                                    />
                                )}
                            />
                        </FormItem>

                        <FormItem
                            label={t('fields.message')}
                            asterisk
                            invalid={!!errors.message}
                            errorMessage={errors.message?.message}
                        >
                            <Input
                                textArea
                                rows={4}
                                disabled={submitting}
                                placeholder={t('messagePlaceholder')}
                                {...register('message')}
                            />
                        </FormItem>

                        <FormItem
                            invalid={!!errors.consent}
                            errorMessage={errors.consent?.message}
                        >
                            <label className="flex items-start gap-2 cursor-pointer text-sm font-bold text-gray-600 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    disabled={submitting}
                                    {...register('consent')}
                                />
                                <span>{t('consent')}</span>
                            </label>
                        </FormItem>
                    </div>

                    {/* Футер */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="plain"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="solid"
                            loading={submitting}
                        >
                            {t('submit')}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default EnterpriseContactDialog
