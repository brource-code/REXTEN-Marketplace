'use client'
import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Form, FormItem } from '@/components/ui/Form'
import classNames from '@/utils/classNames'
import { useChangePassword } from '@/hooks/api/useClient'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import isLastChild from '@/utils/isLastChild'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'

const getAuthenticatorList = (t) => [
    {
        label: t('googleAuthenticator'),
        value: 'googleAuthenticator',
        img: '/img/others/google.png',
        desc: t('googleAuthenticatorDesc'),
    },
    {
        label: t('oktaVerify'),
        value: 'oktaVerify',
        img: '/img/others/okta.png',
        desc: t('oktaVerifyDesc'),
    },
    {
        label: t('emailVerification'),
        value: 'emailVerification',
        img: '/img/others/email.png',
        desc: t('emailVerificationDesc'),
    },
]

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
    const [selected2FaType, setSelected2FaType] = useState(
        'googleAuthenticator',
    )
    const [confirmationOpen, setConfirmationOpen] = useState(false)

    const formRef = useRef(null)
    const authenticatorList = getAuthenticatorList(t)
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
            <div className="mb-8">
                <h4>{t('twoStepVerification')}</h4>
                <p>
                    {t('twoStepVerificationDesc')}
                </p>
                <div className="mt-8">
                    {authenticatorList.map((authOption, index) => (
                        <div
                            key={authOption.value}
                            className={classNames(
                                'py-6 border-gray-200 dark:border-gray-600',
                                !isLastChild(authenticatorList, index) &&
                                    'border-b',
                            )}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        size={35}
                                        className="bg-transparent"
                                        src={authOption.img}
                                    />
                                    <div>
                                        <h6>{authOption.label}</h6>
                                        <span>{authOption.desc}</span>
                                    </div>
                                </div>
                                <div>
                                    {selected2FaType === authOption.value ? (
                                        <Button
                                            size="sm"
                                            customColorClass={() =>
                                                'border-success ring-1 ring-success text-success hover:border-success hover:ring-success hover:text-success bg-transparent'
                                            }
                                            onClick={() =>
                                                setSelected2FaType('')
                                            }
                                        >
                                            {t('activated')}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                setSelected2FaType(
                                                    authOption.value,
                                                )
                                            }
                                        >
                                            {t('enable')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SettingsSecurity
