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

const clientValidationSchema = z.object({
    email: z.string().email({ message: 'Введите корректный email' }),
    firstName: z.string().min(1, { message: 'Введите ваше имя' }),
    lastName: z.string().min(1, { message: 'Введите вашу фамилию' }),
    phone: z.string().optional(),
    password: z.string().min(8, { message: 'Пароль должен быть не менее 8 символов' }),
    confirmPassword: z.string().min(1, { message: 'Подтвердите пароль' }),
    role: z.literal('CLIENT'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
        message: 'Необходимо согласиться с условиями использования',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
})

const SignUpForm = (props) => {
    const { onSignUp, className, setMessage } = props
    const router = useRouter()
    const [isSubmitting, setSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm({
        resolver: zodResolver(clientValidationSchema),
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
            <Form onSubmit={handleSubmit(handleSignUp)}>
                <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">Я регистрируюсь как</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="solid"
                            size="sm"
                            className="w-full h-10 text-sm"
                            disabled
                        >
                            Клиент
                        </Button>
                        <Button
                            type="button"
                            variant="plain"
                            size="sm"
                            className="w-full h-10 text-sm border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5"
                            onClick={() => router.push('/sign-up/business')}
                        >
                            Владелец бизнеса
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem
                        label="Имя"
                        invalid={Boolean(errors.firstName)}
                        errorMessage={errors.firstName?.message}
                    >
                        <Controller
                            name="firstName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Имя"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Фамилия"
                        invalid={Boolean(errors.lastName)}
                        errorMessage={errors.lastName?.message}
                    >
                        <Controller
                            name="lastName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Фамилия"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                <FormItem
                    label="Email"
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email?.message}
                >
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="email"
                                placeholder="Email"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Телефон"
                    invalid={Boolean(errors.phone)}
                    errorMessage={errors.phone?.message}
                >
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem
                        label="Пароль"
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
                                    placeholder="Пароль (мин. 8 символов)"
                                    suffix={
                                        <span
                                            className="cursor-pointer select-none text-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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
                        label="Подтвердите пароль"
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
                                    placeholder="Подтвердите пароль"
                                    suffix={
                                        <span
                                            className="cursor-pointer select-none text-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="agreeToTerms" className="text-sm text-gray-700 dark:text-gray-300">
                                    Я согласен с{' '}
                                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        условиями использования
                                    </a>
                                    ,{' '}
                                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        политикой конфиденциальности
                                    </a>
                                    {' '}и{' '}
                                    <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                        политикой использования Cookie
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
                >
                    {isSubmitting ? 'Создание аккаунта...' : 'Зарегистрироваться'}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm
