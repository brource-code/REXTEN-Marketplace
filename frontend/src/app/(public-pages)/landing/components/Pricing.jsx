'use client'
import Container from './LandingContainer'
import { motion } from 'framer-motion'
import { TbCheck } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'

const PricingCard = ({ plan, index, t }) => {
    const router = useRouter()

    const handleClick = () => {
        router.push('/sign-up')
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.1,
                type: 'spring',
                bounce: 0.1,
            }}
            viewport={{ once: true }}
            className={classNames(
                'relative rounded-2xl p-6',
                plan.highlighted
                    ? 'bg-gradient-to-br from-primary to-primary-deep text-white shadow-xl ring-2 ring-primary md:scale-105'
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            )}
        >
            {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-primary text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {t('popular')}
                </div>
            )}
            <div className="text-center mb-6">
                <h3 className={classNames(
                    'text-xl font-bold mb-2',
                    plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                )}>
                    {plan.name}
                </h3>
                <p className={classNames(
                    'text-sm',
                    plan.highlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                )}>
                    {plan.description}
                </p>
                <div className="mt-4">
                    <span className={classNames(
                        'text-4xl font-bold',
                        plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    )}>
                        {plan.price}
                    </span>
                    <span className={plan.highlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}>
                        {plan.period}
                    </span>
                </div>
            </div>
            <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <TbCheck className={classNames(
                            'text-lg mt-0.5 flex-shrink-0',
                            plan.highlighted ? 'text-white' : 'text-primary'
                        )} />
                        <span className={classNames(
                            'text-sm',
                            plan.highlighted ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'
                        )}>
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>
            <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'solid'}
                onClick={handleClick}
            >
                {plan.buttonText}
            </Button>
        </motion.div>
    )
}

const Pricing = () => {
    const t = useTranslations('landing.pricing')

    const plans = [
        {
            name: t('starter.name'),
            price: '$29',
            period: t('perMonth'),
            description: t('starter.description'),
            features: [
                t('starter.features.booking'),
                t('starter.features.appointments'),
                t('starter.features.reminders'),
                t('starter.features.analytics'),
                t('starter.features.payments'),
            ],
            highlighted: false,
            buttonText: t('starter.button'),
        },
        {
            name: t('pro.name'),
            price: '$79',
            period: t('perMonth'),
            description: t('pro.description'),
            features: [
                t('pro.features.includesStarter'),
                t('pro.features.staff'),
                t('pro.features.unlimited'),
                t('pro.features.crm'),
                t('pro.features.schedule'),
                t('pro.features.marketing'),
                t('pro.features.support'),
            ],
            highlighted: true,
            buttonText: t('pro.button'),
        },
        {
            name: t('business.name'),
            price: '$199',
            period: t('perMonth'),
            description: t('business.description'),
            features: [
                t('business.features.includesPro'),
                t('business.features.unlimitedStaff'),
                t('business.features.locations'),
                t('business.features.analytics'),
                t('business.features.api'),
                t('business.features.manager'),
                t('business.features.branding'),
            ],
            highlighted: false,
            buttonText: t('business.button'),
        },
    ]

    return (
        <div id="pricing" className="relative z-20 py-10 md:py-20">
            <Container>
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
                        {t('sectionTitle')}
                    </motion.h2>
                    <motion.p className="mx-auto max-w-[600px] text-sm md:text-base text-gray-500 dark:text-gray-400">
                        {t('sectionSubtitle')}
                    </motion.p>
                    <motion.p className="mx-auto max-w-[640px] mt-3 text-sm md:text-base text-gray-500 dark:text-gray-400">
                        {t('freeTierNote')}
                    </motion.p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
                    {plans.map((plan, index) => (
                        <PricingCard key={plan.name} plan={plan} index={index} t={t} />
                    ))}
                </div>
            </Container>
        </div>
    )
}

export default Pricing
