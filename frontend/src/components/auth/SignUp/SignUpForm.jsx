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

const getClientValidationSchema = (t) => z.object({
    email: z.string().email({ message: t('validation.emailRequired') }),
    firstName: z.string().min(1, { message: t('validation.firstNameRequired') }),
    lastName: z.string().min(1, { message: t('validation.lastNameRequired') }),
    phone: z.string().optional(),
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
            phone: '',
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
            <Form onSubmit={handleSubmit(handleSignUp)} className="space-y-3 sm:space-y-4">
                <div className="mb-3 sm:mb-4">
                    <label className="block text-xs sm:text-sm font-semibold mb-2">{t('registeringAs')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="solid"
                            size="sm"
                            className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                            disabled
                        >
                            {t('client')}
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
                            size="sm"
                            className="w-full h-8 sm:h-10 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5"
                            onClick={() => router.push('/sign-up/business')}
                        >
                            {t('businessOwner')}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-4">
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
                                    size="sm"
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
                                    size="sm"
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
                                size="sm"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label={t('phone')}
                    invalid={Boolean(errors.phone)}
                    errorMessage={errors.phone?.message}
                    className="[&_.form-label]:mb-1 sm:[&_.form-label]:mb-2"
                >
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="tel"
                                placeholder={t('phonePlaceholder')}
                                autoComplete="off"
                                size="sm"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-4">
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
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="agreeToTerms"
                                    checked={value}
                                    onChange={(e) => onChange(e.target.checked)}
                                    className="mt-0.5 sm:mt-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                />
                                <label htmlFor="agreeToTerms" className="text-[10px] sm:text-sm text-gray-700 dark:text-gray-300 leading-tight sm:leading-relaxed">
                                    {t('agreeTerms')}{' '}
                                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {t('termsOfService')}
                                    </a>
                                    ,{' '}
                                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {t('privacyPolicy')}
                                    </a>
                                    {' '}{t('and')}{' '}
                                    <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {t('cookiePolicy')}
                                    </a>
                                </label>
                            </div>
                        )}
                    />
                </FormItem>

                <Button
                    block
                    loading={isSubmitting}
                    variant="solid"
                    type="submit"
                    size="sm"
                    className="mt-0.5 sm:mt-4 h-8 sm:h-10 text-xs sm:text-sm"
                >
                    {isSubmitting ? t('creatingAccount') : t('signUpButton')}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm
