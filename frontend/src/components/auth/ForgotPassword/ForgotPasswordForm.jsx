'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const ForgotPasswordForm = (props) => {
    const t = useTranslations('auth.forgotPassword')
    const [isSubmitting, setSubmitting] = useState(false)

    const {
        className,
        onForgotPasswordSubmit,
        setMessage,
        setEmailSent,
        emailSent,
        children,
    } = props

    const validationSchema = useMemo(
        () =>
            z.object({
                email: z
                    .string()
                    .min(1, { message: t('emailRequired') })
                    .email({ message: t('errors.invalidEmail') }),
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

    const onForgotPassword = async (values) => {
        if (onForgotPasswordSubmit) {
            onForgotPasswordSubmit({
                values,
                setSubmitting,
                setMessage,
                setEmailSent,
            })
        }
    }

    return (
        <div className={className}>
            {!emailSent ? (
                <Form onSubmit={handleSubmit(onForgotPassword)}>
                    <FormItem
                        label={t('email')}
                        invalid={Boolean(errors.email)}
                        errorMessage={errors.email?.message}
                    >
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="email"
                                    placeholder={t('emailPlaceholder')}
                                    autoComplete="email"
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
                        {isSubmitting ? t('submitting') : t('sendButton')}
                    </Button>
                </Form>
            ) : (
                <>{children}</>
            )}
        </div>
    )
}

export default ForgotPasswordForm
