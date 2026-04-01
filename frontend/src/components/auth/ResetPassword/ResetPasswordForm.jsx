'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const ResetPasswordForm = (props) => {
    const t = useTranslations('auth.resetPassword')
    const [isSubmitting, setSubmitting] = useState(false)

    const {
        className,
        setMessage,
        setResetComplete,
        resetComplete,
        onResetPasswordSubmit,
        children,
    } = props

    const validationSchema = useMemo(
        () =>
            z
                .object({
                    newPassword: z
                        .string()
                        .min(1, { message: t('validation.passwordRequired') })
                        .min(8, { message: t('validation.passwordMin') }),
                    confirmPassword: z
                        .string()
                        .min(1, { message: t('validation.confirmRequired') }),
                })
                .refine((data) => data.newPassword === data.confirmPassword, {
                    message: t('validation.passwordsMismatch'),
                    path: ['confirmPassword'],
                }),
        [t],
    )

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm({
        resolver: zodResolver(validationSchema),
    })

    const handleResetPassword = async (values) => {
        if (onResetPasswordSubmit) {
            onResetPasswordSubmit({
                values,
                setSubmitting,
                setMessage,
                setResetComplete,
            })
        }
    }

    return (
        <div className={className}>
            {!resetComplete ? (
                <Form onSubmit={handleSubmit(handleResetPassword)}>
                    <FormItem
                        label={t('newPassword')}
                        invalid={Boolean(errors.newPassword)}
                        errorMessage={errors.newPassword?.message}
                    >
                        <Controller
                            name="newPassword"
                            control={control}
                            render={({ field }) => (
                                <PasswordInput
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label={t('confirmPassword')}
                        invalid={Boolean(errors.confirmPassword)}
                        errorMessage={errors.confirmPassword?.message}
                    >
                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field }) => (
                                <PasswordInput
                                    autoComplete="new-password"
                                    placeholder={t('confirmPassword')}
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <Button
                        block
                        loading={isSubmitting}
                        variant="solid"
                        type="submit"
                    >
                        {isSubmitting ? t('submitting') : t('resetButton')}
                    </Button>
                </Form>
            ) : (
                <>{children}</>
            )}
        </div>
    )
}

export default ResetPasswordForm
