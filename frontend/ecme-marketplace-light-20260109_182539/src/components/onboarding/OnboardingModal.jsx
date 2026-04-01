'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Steps from '@/components/ui/Steps'
import useOnboarding from '@/hooks/useOnboarding'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'
import {
    PiSparkle,
    PiChartLine,
    PiMegaphone,
    PiCalendar,
    PiUsers,
    PiStar,
    PiGear,
    PiRocket,
} from 'react-icons/pi'

// Импортируем компоненты шагов
import WelcomeStep from './steps/WelcomeStep'
import DashboardStep from './steps/DashboardStep'
import AdvertisementsStep from './steps/AdvertisementsStep'
import ScheduleStep from './steps/ScheduleStep'
import ClientsStep from './steps/ClientsStep'
import ReviewsStep from './steps/ReviewsStep'
import SettingsStep from './steps/SettingsStep'
import AdvertisingStep from './steps/AdvertisingStep'

const TOTAL_STEPS = 8

const OnboardingModal = () => {
    const { isOpen, handleComplete, handleSkip, handleClose, isCompleting } = useOnboarding()
    const t = useTranslations('onboarding')
    const [currentStep, setCurrentStep] = useState(0)

    const steps = [
        {
            key: 'welcome',
            title: t('steps.welcome.title'),
            icon: <PiSparkle />,
            component: WelcomeStep,
        },
        {
            key: 'dashboard',
            title: t('steps.dashboard.title'),
            icon: <PiChartLine />,
            component: DashboardStep,
        },
        {
            key: 'advertisements',
            title: t('steps.advertisements.title'),
            icon: <PiMegaphone />,
            component: AdvertisementsStep,
        },
        {
            key: 'schedule',
            title: t('steps.schedule.title'),
            icon: <PiCalendar />,
            component: ScheduleStep,
        },
        {
            key: 'clients',
            title: t('steps.clients.title'),
            icon: <PiUsers />,
            component: ClientsStep,
        },
        {
            key: 'reviews',
            title: t('steps.reviews.title'),
            icon: <PiStar />,
            component: ReviewsStep,
        },
        {
            key: 'settings',
            title: t('steps.settings.title'),
            icon: <PiGear />,
            component: SettingsStep,
        },
        {
            key: 'advertising',
            title: t('steps.advertising.title'),
            icon: <PiRocket />,
            component: AdvertisingStep,
        },
    ]

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleComplete()
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleSkipClick = () => {
        handleSkip()
    }

    const handleStepClick = (index) => {
        if (index < 0 || index >= TOTAL_STEPS) return
        setCurrentStep(index)
    }

    const CurrentStepComponent = steps[currentStep]?.component

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            width={900}
            closable={false}
            className="onboarding-dialog"
            style={{
                content: {
                    width: '100%',
                    maxWidth: '900px',
                }
            }}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 border-b border-gray-200/70 dark:border-gray-700/70 onboarding-header">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 min-w-0 pr-2"
                        >
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent truncate">
                                {t('title')}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 hidden sm:block">
                                {t('subtitle')}
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="flex-shrink-0"
                        >
                            <Button
                                variant="plain"
                                size="sm"
                                onClick={handleSkipClick}
                                disabled={isCompleting}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
                            >
                                {t('skip')}
                            </Button>
                        </motion.div>
                    </div>

                    {/* Steps indicator - compact grid, no horizontal scroll */}
                    <div className="onboarding-steps-grid" role="tablist" aria-label={t('title')}>
                        {steps.map((step, index) => {
                            const isActive = index === currentStep
                            const isCompleted = index < currentStep
                            return (
                                <button
                                    key={step.key}
                                    type="button"
                                    onClick={() => handleStepClick(index)}
                                    className={classNames(
                                        'onboarding-step-tab',
                                        isActive && 'is-active',
                                        isCompleted && 'is-completed',
                                    )}
                                    aria-current={isActive ? 'step' : undefined}
                                >
                                    <span className="onboarding-step-icon" aria-hidden="true">
                                        {step.icon}
                                    </span>
                                    <span className="onboarding-step-label">
                                        {step.title}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 30, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -30, scale: 0.95 }}
                            transition={{ 
                                duration: 0.25,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                            className="min-h-full"
                        >
                            {CurrentStepComponent && <CurrentStepComponent />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-4 sm:pt-6 border-t border-gray-200/70 dark:border-gray-700/70 onboarding-footer">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Button
                                variant="plain"
                                onClick={handlePrevious}
                                disabled={currentStep === 0 || isCompleting}
                                size="sm"
                                className={classNames(
                                    'transition-all duration-300 text-xs sm:text-sm',
                                    currentStep === 0 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105'
                                )}
                            >
                                {t('back')}
                            </Button>
                        </motion.div>

                        <motion.div 
                            className="hidden sm:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/80"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                        >
                            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                {currentStep + 1} / {TOTAL_STEPS}
                            </span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 sm:flex-initial"
                        >
                            <Button
                                variant="solid"
                                onClick={handleNext}
                                disabled={isCompleting}
                                loading={isCompleting && currentStep === TOTAL_STEPS - 1}
                                size="sm"
                                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30 text-xs sm:text-sm"
                            >
                                {currentStep === TOTAL_STEPS - 1
                                    ? t('complete')
                                    : t('next')}
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export default OnboardingModal

