'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PiArrowLeft, PiArrowRight, PiCheck } from 'react-icons/pi'
import { HiOutlineEyeOff, HiOutlineEye } from 'react-icons/hi'
import GooglePlacesAutocomplete from '@/components/shared/GooglePlacesAutocomplete'

const businessValidationSchema = z.object({
    email: z.string().email({ message: 'Введите корректный email' }),
    firstName: z.string().min(1, { message: 'Введите ваше имя' }),
    lastName: z.string().min(1, { message: 'Введите вашу фамилию' }),
    phone: z.string().optional(),
    password: z.string().min(8, { message: 'Пароль должен быть не менее 8 символов' }),
    confirmPassword: z.string().min(1, { message: 'Подтвердите пароль' }),
    businessName: z.string().min(1, { message: 'Введите название бизнеса' }),
    businessAddress: z.string().min(1, { message: 'Введите адрес бизнеса' }),
    businessPhone: z.string().min(1, { message: 'Введите телефон бизнеса' }),
    businessEmail: z.string().email({ message: 'Введите корректный email бизнеса' }).optional().or(z.literal('')),
    businessWebsite: z.string().optional(),
    businessDescription: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
})

const STEPS = [
    {
        id: 1,
        title: 'Личные данные',
        description: 'Основная информация о вас',
    },
    {
        id: 2,
        title: 'Безопасность',
        description: 'Создайте пароль',
    },
    {
        id: 3,
        title: 'Информация о бизнесе',
        description: 'Данные вашего бизнеса',
    },
]

const BusinessSignUpForm = (props) => {
    const { onSignUp, className, setMessage } = props

    const [isSubmitting, setSubmitting] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [touchedSteps, setTouchedSteps] = useState(new Set())
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        handleSubmit,
        formState: { errors },
        control,
        trigger,
    } = useForm({
        resolver: zodResolver(businessValidationSchema),
        mode: 'onSubmit', // Валидация только при отправке, не при изменении
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            businessName: '',
            businessAddress: '',
            businessPhone: '',
            businessEmail: '',
            businessWebsite: '',
            businessDescription: '',
        },
    })

    const handleNext = async () => {
        let fieldsToValidate = []
        
        if (currentStep === 1) {
            fieldsToValidate = ['firstName', 'lastName', 'email']
        } else if (currentStep === 2) {
            fieldsToValidate = ['password', 'confirmPassword']
        } else if (currentStep === 3) {
            fieldsToValidate = ['businessName', 'businessAddress', 'businessPhone']
        }

        // Отмечаем шаг как "тронутый" для показа ошибок
        setTouchedSteps(prev => new Set(prev).add(currentStep))

        const isValid = await trigger(fieldsToValidate)
        if (isValid) {
            if (currentStep === 3) {
                // Последний шаг - отправляем форму
                handleSubmit(handleSignUp)()
            } else {
                setCurrentStep(currentStep + 1)
            }
        }
    }

    const handlePrev = () => {
        setCurrentStep(currentStep - 1)
    }

    const handleSignUp = async (values) => {
        if (onSignUp) {
            onSignUp({ values, setSubmitting, setMessage })
        }
    }

    const renderStep1 = () => {
        const isStepTouched = touchedSteps.has(1)
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem
                        label="Имя *"
                        invalid={isStepTouched && Boolean(errors.firstName)}
                        errorMessage={isStepTouched ? errors.firstName?.message : ''}
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
                        label="Фамилия *"
                        invalid={isStepTouched && Boolean(errors.lastName)}
                        errorMessage={isStepTouched ? errors.lastName?.message : ''}
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
                    label="Email *"
                    invalid={isStepTouched && Boolean(errors.email)}
                    errorMessage={isStepTouched ? errors.email?.message : ''}
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
                    invalid={isStepTouched && Boolean(errors.phone)}
                    errorMessage={isStepTouched ? errors.phone?.message : ''}
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
            </div>
        )
    }

    const renderStep2 = () => {
        const isStepTouched = touchedSteps.has(2)
        return (
            <div className="space-y-4">
                <FormItem
                    label="Пароль *"
                    invalid={isStepTouched && Boolean(errors.password)}
                    errorMessage={isStepTouched ? errors.password?.message : ''}
                >
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="off"
                                placeholder="Пароль (минимум 8 символов)"
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
                    label="Подтвердите пароль *"
                    invalid={isStepTouched && Boolean(errors.confirmPassword)}
                    errorMessage={isStepTouched ? errors.confirmPassword?.message : ''}
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
        )
    }

    const renderStep3 = () => {
        const isStepTouched = touchedSteps.has(3)
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem
                        label="Название бизнеса *"
                        invalid={isStepTouched && Boolean(errors.businessName)}
                        errorMessage={isStepTouched ? errors.businessName?.message : ''}
                    >
                        <Controller
                            name="businessName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    placeholder="Название бизнеса"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                <FormItem
                    label="Описание"
                    invalid={isStepTouched && Boolean(errors.businessDescription)}
                    errorMessage={isStepTouched ? errors.businessDescription?.message : ''}
                >
                    <Controller
                        name="businessDescription"
                        control={control}
                        render={({ field }) => (
                            <Input
                                textArea
                                rows={3}
                                placeholder="Краткое описание вашего бизнеса"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Адрес *"
                    invalid={isStepTouched && Boolean(errors.businessAddress)}
                    errorMessage={isStepTouched ? errors.businessAddress?.message : ''}
                >
                    <Controller
                        name="businessAddress"
                        control={control}
                        render={({ field }) => (
                            <GooglePlacesAutocomplete
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Полный адрес бизнеса"
                            />
                        )}
                    />
                </FormItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem
                        label="Телефон бизнеса *"
                        invalid={isStepTouched && Boolean(errors.businessPhone)}
                        errorMessage={isStepTouched ? errors.businessPhone?.message : ''}
                    >
                        <Controller
                            name="businessPhone"
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
                    <FormItem
                        label="Email бизнеса"
                        invalid={isStepTouched && Boolean(errors.businessEmail)}
                        errorMessage={isStepTouched ? errors.businessEmail?.message : ''}
                    >
                        <Controller
                            name="businessEmail"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="email"
                                    placeholder="business@example.com"
                                    autoComplete="off"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                </div>
                <FormItem
                    label="Веб-сайт"
                    invalid={isStepTouched && Boolean(errors.businessWebsite)}
                    errorMessage={isStepTouched ? errors.businessWebsite?.message : ''}
                >
                    <Controller
                        name="businessWebsite"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="url"
                                placeholder="https://example.com"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
            </div>
        )
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(handleSignUp)}>
                {/* Индикатор шагов */}
                <div className="mb-8">
                    <div className="flex items-start justify-between mb-4">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1 min-w-0">
                                <div className="flex flex-col items-center flex-1 min-w-0">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all shrink-0 ${
                                            currentStep > step.id
                                                ? 'bg-primary text-white'
                                                : currentStep === step.id
                                                ? 'bg-primary text-white ring-4 ring-primary/20'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {currentStep > step.id ? (
                                            <PiCheck className="text-lg" />
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <div className="mt-2 text-center w-full">
                                        <div
                                            className={`text-xs md:text-sm font-semibold truncate ${
                                                currentStep >= step.id
                                                    ? 'text-gray-900 dark:text-white'
                                                    : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                        >
                                            {step.title}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block">
                                            {step.description}
                                        </div>
                                    </div>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`h-0.5 flex-1 mx-1 md:mx-2 transition-all shrink-0 ${
                                            currentStep > step.id
                                                ? 'bg-primary'
                                                : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Контент шага */}
                <div className="min-h-[400px] mb-6">
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </div>

                {/* Кнопки навигации */}
                <div className="flex gap-3">
                    {currentStep > 1 && (
                        <Button
                            type="button"
                            variant="plain"
                            onClick={handlePrev}
                            className="flex-1 flex items-center justify-center"
                        >
                            <PiArrowLeft className="mr-2 shrink-0" />
                            <span>Назад</span>
                        </Button>
                    )}
                    {currentStep < 3 ? (
                        <Button
                            type="button"
                            variant="solid"
                            onClick={handleNext}
                            className="flex-1 flex items-center justify-center"
                        >
                            <span>Далее</span>
                            <PiArrowRight className="ml-2 shrink-0" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="solid"
                            loading={isSubmitting}
                            className={currentStep > 1 ? "flex-1" : "w-full"}
                        >
                            {isSubmitting ? 'Создание аккаунта...' : 'Зарегистрироваться'}
                        </Button>
                    )}
                </div>
            </Form>
        </div>
    )
}

export default BusinessSignUpForm

