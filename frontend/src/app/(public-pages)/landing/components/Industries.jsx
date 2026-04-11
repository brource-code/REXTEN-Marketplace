'use client'
import Container from './LandingContainer'
import Dropdown from '@/components/ui/Dropdown'
import Button from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
    TbSparkles,
    TbHome,
    TbAirConditioning,
    TbCar,
    TbSchool,
    TbCalendarEvent,
    TbChevronDown,
} from 'react-icons/tb'

const industries = [
    { id: 'beauty', icon: TbSparkles, color: 'bg-pink-500/10', iconColor: 'text-pink-500', hoverColor: 'hover:border-pink-500/50' },
    { id: 'cleaning', icon: TbHome, color: 'bg-emerald-500/10', iconColor: 'text-emerald-500', hoverColor: 'hover:border-emerald-500/50' },
    { id: 'hvac', icon: TbAirConditioning, color: 'bg-blue-500/10', iconColor: 'text-blue-500', hoverColor: 'hover:border-blue-500/50' },
    { id: 'auto', icon: TbCar, color: 'bg-amber-500/10', iconColor: 'text-amber-500', hoverColor: 'hover:border-amber-500/50' },
    { id: 'education', icon: TbSchool, color: 'bg-purple-500/10', iconColor: 'text-purple-500', hoverColor: 'hover:border-purple-500/50' },
    { id: 'events', icon: TbCalendarEvent, color: 'bg-red-500/10', iconColor: 'text-red-500', hoverColor: 'hover:border-red-500/50' },
]

const Industries = () => {
    const t = useTranslations('landing.industries')
    const router = useRouter()
    const [selectedDemo, setSelectedDemo] = useState(null)

    const handleDemoClick = (industryId) => {
        setSelectedDemo(industryId)
        router.push('/services')
    }

    return (
        <div id="industries" className="relative z-20 py-10 md:py-20">
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
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {industries.map((industry, index) => {
                        const Icon = industry.icon
                        return (
                            <motion.div
                                key={industry.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.05 * index,
                                }}
                                viewport={{ once: true }}
                                className={`bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 ${industry.hoverColor} transition-colors cursor-pointer md:hover:scale-[1.02] md:hover:-translate-y-1 md:transition-transform`}
                            >
                                <div className={`h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl ${industry.color} flex items-center justify-center mb-3 md:mb-4`}>
                                    <Icon className={`text-2xl md:text-4xl ${industry.iconColor}`} />
                                </div>
                                <h4 className="text-sm md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 md:mb-2">
                                    {t(`${industry.id}.title`)}
                                </h4>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                    {t(`${industry.id}.description`)}
                                </p>
                            </motion.div>
                        )
                    })}
                </div>

                <motion.div
                    className="flex justify-center mt-10"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                    viewport={{ once: true }}
                >
                    <Dropdown
                        placement="top"
                        renderTitle={
                            <Button variant="solid" className="flex items-center gap-2">
                                {t('demoButton')}
                                <TbChevronDown className="text-lg" />
                            </Button>
                        }
                    >
                        {industries.map((industry) => {
                            const Icon = industry.icon
                            return (
                                <Dropdown.Item
                                    key={industry.id}
                                    eventKey={industry.id}
                                    onClick={() => handleDemoClick(industry.id)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon className={`text-lg ${industry.iconColor}`} />
                                        <span>{t(`${industry.id}.title`)}</span>
                                    </span>
                                </Dropdown.Item>
                            )
                        })}
                    </Dropdown>
                </motion.div>
            </Container>
        </div>
    )
}

export default Industries
