'use client'
import Switcher from '@/components/ui/Switcher'
import Container from './LandingContainer'
import CardStack from './CardStack'
import InfiniteMovingCards from './InfinteMovingCard'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import classNames from '@/utils/classNames'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
    TbCheck,
    TbChartBar,
    TbMail,
    TbSpeakerphone,
    TbChartPie,
    TbReportAnalytics,
    TbTrendingUp,
    TbUsers,
    TbCalendarStats,
    TbCoin,
    TbBrandGoogle,
    TbMessageCircle,
    TbDiscount,
    TbBell,
    TbTarget,
    TbChartDots,
} from 'react-icons/tb'
import { useLocale, useTranslations } from 'next-intl'
import {
    getLandingLayoutsSrc,
} from '@/app/(public-pages)/landing/utils/landingHeroImages'

const marketingItems1 = [
    { id: 'analytics', name: 'Analytics', icon: TbChartBar },
    { id: 'reports', name: 'Reports', icon: TbReportAnalytics },
    { id: 'trends', name: 'Trends', icon: TbTrendingUp },
    { id: 'clients', name: 'Clients', icon: TbUsers },
    { id: 'calendar', name: 'Calendar', icon: TbCalendarStats },
    { id: 'revenue', name: 'Revenue', icon: TbCoin },
]

const marketingItems2 = [
    { id: 'ads', name: 'Ads', icon: TbBrandGoogle },
    { id: 'chat', name: 'Chat', icon: TbMessageCircle },
    { id: 'discounts', name: 'Discounts', icon: TbDiscount },
    { id: 'notifications', name: 'Notifications', icon: TbBell },
    { id: 'campaigns', name: 'Campaigns', icon: TbTarget },
    { id: 'insights', name: 'Insights', icon: TbChartDots },
]

const getCardBgStyles = (mode = 'light') => {
    const bgStyles = {
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3e%3ccircle fill='${mode === 'light' ? 'rgb(0 0 0 / 0.2)' : 'rgb(255 255 255 / 0.2)'}' id='pattern-circle' cx='10' cy='10' r='1.6257413380501518'%3e%3c/circle%3e%3c/svg%3e")`,
    }
    return bgStyles
}

const Card = ({
    children,
    initial,
    animate,
    transition,
    className,
    viewport,
    whileInView,
}) => {
    return (
        <motion.div
            initial={initial}
            animate={animate}
            transition={transition}
            whileInView={whileInView}
            className={classNames(
                'bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 p-6',
                className,
            )}
            viewport={viewport}
        >
            {children}
        </motion.div>
    )
}

const Features = ({ mode, onModeChange, schema, setSchema }) => {
    const cardStyles = getCardBgStyles(mode)
    const t = useTranslations('landing.features')
    const locale = useLocale()

    const renderMarketingIcon = (item) => {
        const Icon = item.icon
        return (
            <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-16 w-16 flex items-center justify-center rounded-2xl transition-colors">
                <Icon className="text-primary text-3xl" />
            </div>
        )
    }

    const CARDS = [
        {
            id: 0,
            name: 'Schedule',
            content: (
                <Image
                    className="rounded-xl"
                    src={getLandingLayoutsSrc(locale, 'collapsible.png')}
                    width={600}
                    height={340}
                    alt="schedule"
                />
            ),
        },
        {
            id: 1,
            name: 'Shifts',
            content: (
                <Image
                    className="rounded-xl"
                    src={getLandingLayoutsSrc(locale, 'stacked.png')}
                    width={600}
                    height={340}
                    alt="shifts"
                />
            ),
        },
        {
            id: 2,
            name: 'Breaks',
            content: (
                <Image
                    className="rounded-xl"
                    src={getLandingLayoutsSrc(locale, 'topbar.png')}
                    width={600}
                    height={340}
                    alt="breaks"
                />
            ),
        },
        {
            id: 3,
            name: 'Vacations',
            content: (
                <Image
                    className="rounded-xl"
                    src={getLandingLayoutsSrc(locale, 'frameless.png')}
                    width={600}
                    height={340}
                    alt="vacations"
                />
            ),
        },
        {
            id: 4,
            name: 'Workload',
            content: (
                <Image
                    className="rounded-xl"
                    src={getLandingLayoutsSrc(locale, 'overlay.png')}
                    width={600}
                    height={340}
                    alt="load"
                />
            ),
        },
    ]

    return (
        <div id="features" className="relative z-20 py-6 md:py-20">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.3,
                                    type: 'spring',
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                <div
                                    className="rounded-2xl bg-white dark:bg-gray-900 p-4"
                                    style={cardStyles}
                                >
                                    <div className="p-4 flex justify-center items-center rounded-xl gap-2 border border-gray-200 dark:border-white/[0.2] bg-white dark:bg-gray-800">
                                        <Switcher
                                            checked={mode === 'dark'}
                                            onChange={onModeChange}
                                        />
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {mode === 'dark' ? 'Dark' : 'Light'}
                                        </span>
                                    </div>
                                    <div className="p-4 flex justify-center items-center rounded-xl gap-2 border border-gray-200 dark:border-white/[0.2] bg-white dark:bg-gray-800 mt-4">
                                        <div className="inline-flex items-center gap-2">
                                            {Object.entries(
                                                presetThemeSchemaConfig,
                                            ).map(([key, value]) => (
                                                <button
                                                    key={key}
                                                    className={classNames(
                                                        'h-8 w-8 rounded-full flex items-center justify-center border-2 border-white',
                                                        schema === key &&
                                                        'ring-2 ring-primary',
                                                    )}
                                                    style={{
                                                        backgroundColor:
                                                            value[mode]
                                                                ?.primary || '',
                                                    }}
                                                    onClick={() =>
                                                        setSchema(key)
                                                    }
                                                >
                                                    {schema === key ? (
                                                        <TbCheck className="text-neutral text-lg" />
                                                    ) : (
                                                        <></>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('brand.title')}
                                    </h4>
                                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('brand.description')}
                                    </p>
                                </div>
                            </Card>
                            <Card
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.4,
                                    type: 'spring',
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                <div
                                    className="rounded-2xl bg-white dark:bg-gray-900 p-4 overflow-hidden relative h-[172px]"
                                    style={cardStyles}
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                        style={{
                                            transformOrigin:
                                                'bottom right 10px',
                                        }}
                                        className="absolute max-w-[330px] top-7 -right-12"
                                    >
                                        <div className="p-2 border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 rounded-lg relative shadow-2xl dark:shadow-white/40">
                                            {mode === 'light' && (
                                                <Image
                                                    className="rounded-lg"
                                                    src={getLandingLayoutsSrc(
                                                        locale,
                                                        'documentation.png',
                                                    )}
                                                    width={630}
                                                    height={562}
                                                    alt="REXTEN CRM"
                                                />
                                            )}
                                            {mode === 'dark' && (
                                                <Image
                                                    className="rounded-lg"
                                                    src={getLandingLayoutsSrc(
                                                        locale,
                                                        'documentation-dark.png',
                                                    )}
                                                    width={630}
                                                    height={562}
                                                    alt="REXTEN CRM"
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="mt-6">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('crm.title')}
                                    </h4>
                                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('crm.description')}
                                    </p>
                                </div>
                            </Card>
                        </div>
                        <div className="mt-4">
                            <Card
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.6,
                                    type: 'spring',
                                    bounce: 0.1,
                                }}
                                viewport={{ once: true }}
                            >
                                <div
                                    className="rounded-2xl bg-white dark:bg-gray-900 p-4 overflow-hidden relative"
                                    style={cardStyles}
                                >
                                    <div style={{ minHeight: 220 }} className="md:!min-h-[320px] flex items-center justify-center w-full">
                                        <CardStack
                                            className="absolute -bottom-6"
                                            items={CARDS}
                                        />
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('schedule.title')}
                                    </h4>
                                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('schedule.description')}
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                    <div>
                        <Card
                            className="h-full"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            viewport={{ once: true }}
                        >
                            <div className="flex flex-col justify-between h-full">
                                <div
                                    className="flex-1 rounded-2xl bg-white dark:bg-gray-900 p-4 overflow-hidden relative"
                                    style={cardStyles}
                                >
                                    <div className="min-h-[270px] flex items-center justify-center w-full">
                                        <div className="h-[38.5rem] rounded-md flex flex-col antialiased items-center justify-center relative overflow-hidden">
                                            <div className="h-[38.5rem] grid grid-cols-2 gap-x-8">
                                                <InfiniteMovingCards
                                                    items={marketingItems1}
                                                    speed="slow"
                                                    pauseOnHover={false}
                                                    itemCallback={renderMarketingIcon}
                                                />
                                                <InfiniteMovingCards
                                                    items={marketingItems2}
                                                    direction="top"
                                                    speed="slow"
                                                    pauseOnHover={false}
                                                    itemCallback={renderMarketingIcon}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {t('marketing.title')}
                                    </h4>
                                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {t('marketing.description')}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default Features
