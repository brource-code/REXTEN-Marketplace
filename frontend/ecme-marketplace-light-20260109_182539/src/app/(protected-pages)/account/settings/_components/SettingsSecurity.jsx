'use client'
import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form, FormItem } from '@/components/ui/Form'
import { useChangePassword } from '@/hooks/api/useClient'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'

const getValidationSchema = (t) => z
    .object({
        currentPassword: z
            .string()
            .min(1, { message: t('currentPasswordRequired') }),
        newPassword: z
            .string()
            .min(1, { message: t('newPasswordRequired') }),
        confirmNewPassword: z
            .string()
            .min(1, { message: t('confirmNewPasswordRequired') }),
    })
    .refine((data) => data.confirmNewPassword === data.newPassword, {
        message: t('passwordNotMatch'),
        path: ['confirmNewPassword'],
    })

const SettingsSecurity = () => {
    const t = useTranslations('accountSettings')
    const [confirmationOpen, setConfirmationOpen] = useState(false)

    const formRef = useRef(null)
    const changePasswordMutation = useChangePassword()

    const {
        getValues,
        handleSubmit,
        reset,
        formState: { errors },
        control,
    } = useForm({
        resolver: zodResolver(getValidationSchema(t)),
    })

    const handlePostSubmit = async () => {
        try {
            const values = getValues()
            await changePasswordMutation.mutateAsync({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                confirmNewPassword: values.confirmNewPassword,
            })
            
            setConfirmationOpen(false)
            reset()
            
            toast.push(
                <Notification title={t('updatePassword')} type="success">
                    {t('updatePassword')} {t('save')}
                </Notification>,
                {
                    placement: 'top-center',
                },
            )
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error?.response?.data?.errors?.currentPassword?.[0] || 'Failed to change password'
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,
                {
                    placement: 'top-center',
                },
            )
        }
    }

    const onSubmit = async () => {
        setConfirmationOpen(true)
    }

    return (
        <div>
            <div className="mb-8">
                <h4>{t('password')}</h4>
                <p>
                    {t('passwordDesc')}
                </p>
            </div>
            <Form
                ref={formRef}
                className="mb-8"
                onSubmit={handleSubmit(onSubmit)}
            >
                <FormItem
                    label={t('currentPassword')}
                    invalid={Boolean(errors.currentPassword)}
                    errorMessage={errors.currentPassword?.message}
                >
                    <Controller
                        name="currentPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder={t('currentPasswordPlaceholder')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('newPassword')}
                    invalid={Boolean(errors.newPassword)}
                    errorMessage={errors.newPassword?.message}
                >
                    <Controller
                        name="newPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder={t('newPasswordPlaceholder')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('confirmNewPassword')}
                    invalid={Boolean(errors.confirmNewPassword)}
                    errorMessage={errors.confirmNewPassword?.message}
                >
                    <Controller
                        name="confirmNewPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder={t('confirmNewPasswordPlaceholder')}
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <div className="flex justify-end">
                    <Button variant="solid" type="submit">
                        {t('update')}
                    </Button>
                </div>
            </Form>
            <ConfirmDialog
                isOpen={confirmationOpen}
                type="warning"
                title={t('updatePassword')}
                confirmButtonProps={{
                    loading: changePasswordMutation.isPending,
                    onClick: handlePostSubmit,
                }}
                onClose={() => setConfirmationOpen(false)}
                onRequestClose={() => setConfirmationOpen(false)}
                onCancel={() => setConfirmationOpen(false)}
            >
                <p>{t('updatePasswordConfirm')}</p>
            </ConfirmDialog>
        </div>
    )
}

export default SettingsSecurity
