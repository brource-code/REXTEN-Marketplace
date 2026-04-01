'use client'
import Container from './LandingContainer'
import { motion } from 'framer-motion'
import { TbCheck } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

const plans = [
    {
        name: 'Старт',
        price: '$29',
        period: '/мес',
        description: 'Для индивидуальных мастеров',
        features: [
            'Персональная страница бронирования',
            'До 100 записей в месяц',
            'Напоминания клиентам (SMS/Email)',
            'Базовая аналитика',
            'Прием онлайн-платежей',
        ],
        highlighted: false,
        buttonText: 'Начать бесплатно',
    },
    {
        name: 'Про',
        price: '$79',
        period: '/мес',
        description: 'Для салонов до 5 сотрудников',
        features: [
            'Все из тарифа Старт',
            'До 5 сотрудников',
            'Неограниченные записи',
            'CRM и база клиентов',
            'Управление расписанием команды',
            'Маркетинговые рассылки',
            'Приоритетная поддержка',
        ],
        highlighted: true,
        buttonText: 'Попробовать бесплатно',
    },
    {
        name: 'Бизнес',
        price: '$199',
        period: '/мес',
        description: 'Для сетей и франшиз',
        features: [
            'Все из тарифа Про',
            'Неограниченные сотрудники',
            'Управление филиалами',
            'Расширенная аналитика',
            'API интеграции',
            'Персональный менеджер',
            'Брендирование платформы',
        ],
        highlighted: false,
        buttonText: 'Связаться с нами',
    },
]

const PricingCard = ({ plan, index }) => {
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
            className={`relative rounded-2xl p-6 ${plan.highlighted
                    ? 'bg-gradient-to-br from-primary to-primary-deep text-white shadow-xl scale-105'
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
        >
            {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-primary text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    Популярный
                </div>
            )}
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className={`text-sm ${plan.highlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                    {plan.description}
                </p>
                <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className={`${plan.highlighted ? 'text-white/80' : 'text-gray-500'}`}>
                        {plan.period}
                    </span>
                </div>
            </div>
            <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <TbCheck className={`text-lg mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-white' : 'text-primary'}`} />
                        <span className={`text-sm ${plan.highlighted ? 'text-white/90' : ''}`}>{feature}</span>
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
    return (
        <div id="pricing" className="relative z-20 py-10 md:py-40">
            <Container>
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-5xl">
                        Простые и понятные тарифы
                    </motion.h2>
                    <motion.p className="mx-auto max-w-[600px]">
                        Выберите план, который подходит вашему бизнесу.
                        Первые 14 дней бесплатно на любом тарифе.
                    </motion.p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
                    {plans.map((plan, index) => (
                        <PricingCard key={plan.name} plan={plan} index={index} />
                    ))}
                </div>
            </Container>
        </div>
    )
}

export default Pricing
