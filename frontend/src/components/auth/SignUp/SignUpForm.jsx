'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { HiOutlineEyeOff, HiOutlineEye } from 'react-icons/hi'
import { useTranslations } from 'next-intl'
import Checkbox from '@/components/ui/Checkbox'
import { formatUsPhoneDisplay, stripToNanpDigits } from '@/utils/usPhone'

const getClientValidationSchema = (t) => z.object({
    email: z.string().email({ message: t('validation.emailRequired') }),
    firstName: z.string().min(1, { message: t('validation.firstNameRequired') }),
    lastName: z.string().min(1, { message: t('validation.lastNameRequired') }),
    phone: z
        .string()
        .optional()
        .refine((val) => {
            const d = stripToNanpDigits(val || '')
            return d.length === 0 || d.length === 10
        }, { message: t('validation.phoneUsInvalid') }),
    password: z.string().min(8, { message: t('validation.passwordMinLength') }),
    confirmPassword: z.string().min(1, { message: t('validation.confirmPasswordRequired') }),
    role: z.literal('CLIENT'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
        message: t('validation.agreeTermsRequired'),
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwordsNotMatch'),
    path: ['confirmPassword'],
})

const SignUpForm = (props) => {
    const { onSignUp, className, setMessage } = props
    const router = useRouter()
    const t = useTranslations('auth.signUp')
    const [isSubmitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm({
        resolver: zodResolver(getClientValidationSchema(t)),
        defaultValues: {
            role: 'CLIENT',
            firstName: '',
            lastName: '',
            email: '',
            phone: '+1',
            password: '',
            confirmPassword: '',
            agreeToTerms: false,
        },
    })

    const handleSignUp = async (values) => {
        if (onSignUp) {
            onSignUp({ values, setSubmitting, setMessage })
        }
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(handleSignUp)} className="space-y-4">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                        {t('registeringAs')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="solid"
                            className="w-full h-11 text-sm font-bold"
                            disabled
                        >
                            {t('client')}
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
                            className="w-full h-11 text-sm font-bold border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5"
                            onClick={() => router.push('/sign-up/business')}
                        >
                            {t('businessOwner')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormItem
                        label={t('firstName')}
                        invalid={Boolean(errors.firstName)}
                        errorMessage={errors.firstName?.message}
                    >
                        <Controller
                            name="firstName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder={t('firstName')}
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label={t('lastName')}
                        invalid={Boolean(errors.lastName)}
                        errorMessage={errors.lastName?.message}
                    >
                        <Controller
                            name="lastName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder={t('lastName')}
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
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
                                placeholder={t('email')}
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('phone')}
                    invalid={Boolean(errors.phone)}
                    errorMessage={errors.phone?.message}
                    className="[&_.form-label]:mb-2"
                >
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="tel"
                                inputMode="tel"
                                placeholder={t('phonePlaceholder')}
                                autoComplete="tel-national"
                                value={field.value}
                                onChange={(e) =>
                                    field.onChange(formatUsPhoneDisplay(e.target.value))
                                }
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                            />
                        )}
                    />
                </FormItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormItem
                        label={t('password')}
                        invalid={Boolean(errors.password)}
                        errorMessage={errors.password?.message}
                    >
                        <Controller
                            name="password"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="off"
                                    placeholder={t('passwordPlaceholder')}
                                    suffix={
                                        <span
                                            className="cursor-pointer select-none text-lg sm:text-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                            role="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <HiOutlineEyeOff />
                                            ) : (
                                                <HiOutlineEye />
                                            )}
                                        </span>
                                    }
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
                                <Input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    autoComplete="off"
                                    placeholder={t('confirmPasswordPlaceholder')}
                                    suffix={
                                        <span
                                            className="cursor-pointer select-none text-lg sm:text-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                            role="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <HiOutlineEyeOff />
                                            ) : (
                                                <HiOutlineEye />
                                            )}
                                        </span>
                                    }
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>

                <FormItem
                    invalid={Boolean(errors.agreeToTerms)}
                    errorMessage={errors.agreeToTerms?.message}
                    className="[&_.form-label]:mb-0"
                >
                    <Controller
                        name="agreeToTerms"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                            <Checkbox
                                variant="card"
                                id="agreeToTerms"
                                checked={value}
                                onChange={(checked) => onChange(checked)}
                                checkboxClass="shrink-0 !m-0 mt-0.5"
                                className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 leading-snug sm:leading-relaxed"
                            >
                                <span className="leading-snug sm:leading-relaxed">
                                    {t('agreeTerms')}{' '}
                                    <a
                                        href="/terms"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {t('termsOfService')}
                                    </a>
                                    ,{' '}
                                    <a
                                        href="/privacy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {t('privacyPolicy')}
                                    </a>
                                    {' '}
                                    {t('and')}{' '}
                                    <a
                                        href="/cookies"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {t('cookiePolicy')}
                                    </a>
                                </span>
                            </Checkbox>
                        )}
                    />
                </FormItem>

                <Button
                    block
                    loading={isSubmitting}
                    variant="solid"
                    type="submit"
                    className="mt-2 h-12 text-sm font-bold"
                >
                    {isSubmitting ? t('creatingAccount') : t('signUpButton')}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm
