'use client'
import Container from './LandingContainer'
import { TbCircleCheck } from 'react-icons/tb'
import {
    PiArrowUpRight,
    PiShieldCheckFill,
    PiSparkle,
    PiMapPin,
    PiClock,
    PiPath,
} from 'react-icons/pi'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { getLandingFeaturesSrc } from '@/app/(public-pages)/landing/utils/landingHeroImages'
import classNames from '@/utils/classNames'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_LIGHT } from '@/constants/theme.constant'

const getCardBgStyles = (mode = 'light') => ({
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3e%3ccircle fill='${mode === 'light' ? 'rgb(0 0 0 / 0.2)' : 'rgb(255 255 255 / 0.2)'}' id='pattern-circle' cx='10' cy='10' r='1.6257413380501518'%3e%3c/circle%3e%3c/svg%3e")`,
})

const PaymentVisual = ({ cardStyles, t }) => {
    const methods = [
        { label: t('integrations.paymentVisual.cardLabel'), accent: true },
        { label: 'Apple Pay', accent: false },
        { label: 'Google Pay', accent: false },
    ]

    return (
        <div
            className="w-full max-w-[420px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 md:p-5 shadow-sm"
            style={cardStyles}
        >
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap items-center gap-1.5">
                    {methods.map((m) => (
                        <span
                            key={m.label}
                            className={classNames(
                                'px-2.5 py-1 rounded-full text-[11px] font-bold border',
                                m.accent
                                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700',
                            )}
                        >
                            {m.label}
                        </span>
                    ))}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-[10px] font-bold text-gray-700 dark:text-gray-200">
                    <PiShieldCheckFill className="text-emerald-500" />
                    Stripe
                </span>
            </div>

            <div className="mt-5 md:mt-6 text-center">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
                    {t('integrations.paymentVisual.amountCaption')}
                </div>
                <div className="mt-1 flex items-baseline justify-center">
                    <span className="text-2xl md:text-3xl font-bold text-gray-500 dark:text-gray-400 leading-none">
                        $
                    </span>
                    <span className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                        120
                    </span>
                    <span className="ml-1 text-xl md:text-2xl font-bold text-gray-500 dark:text-gray-400 leading-none">
                        .00
                    </span>
                </div>
            </div>

            <div className="my-5 border-t border-dashed border-gray-300 dark:border-gray-600" />

            <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2.5 border border-primary/20">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                            <PiArrowUpRight className="text-base" />
                        </span>
                        <span className="text-[12px] md:text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            {t('integrations.paymentVisual.toBusiness')}
                        </span>
                    </div>
                    <span className="text-sm md:text-base font-bold text-primary whitespace-nowrap">
                        $108.00
                    </span>
                </div>

                <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                        <span className="text-[12px] md:text-sm font-bold text-gray-500 dark:text-gray-400 leading-tight">
                            {t('integrations.paymentVisual.platformFee')}
                        </span>
                    </div>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        $12.00
                    </span>
                </div>
            </div>

            <div className="mt-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-[11px] md:text-xs font-bold text-gray-600 dark:text-gray-300 leading-snug">
                {t('integrations.paymentVisual.footer')}
            </div>
        </div>
    )
}

const ROUTE_PATH_D =
    'M40 210 C 110 180, 130 90, 220 90 S 330 200, 360 60'

const ROUTE_STOPS = [
    { n: 1, top: '75%', left: '10%', time: '08:30' },
    { n: 2, top: '43%', left: '40%', time: '10:15' },
    { n: 3, top: '54%', left: '65%', time: '13:40' },
    { n: 4, top: '21%', left: '90%', time: '16:40' },
]

const RoutesAiVisual = ({ t }) => {
    return (
        <div className="relative w-full max-w-[480px] aspect-[5/4] rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Header chip */}
            <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-gray-900/90 dark:bg-gray-50/90 text-white dark:text-gray-900 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                <PiPath className="text-sm" />
                {t('growth.visual.headerChip')}
            </div>

            {/* AI badge */}
            <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2.5 py-1 text-[11px] font-bold shadow-lg shadow-indigo-500/30">
                <PiSparkle className="text-sm" />
                {t('growth.visual.aiBadge')}
            </div>

            {/* Map background */}
            <svg
                viewBox="0 0 400 280"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                aria-hidden
            >
                <defs>
                    <pattern
                        id="routesGrid"
                        x="0"
                        y="0"
                        width="24"
                        height="24"
                        patternUnits="userSpaceOnUse"
                    >
                        <circle
                            cx="1"
                            cy="1"
                            r="1"
                            className="fill-gray-200 dark:fill-gray-700"
                        />
                    </pattern>
                    <linearGradient
                        id="routeStroke"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                    >
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                </defs>

                <rect width="400" height="280" fill="url(#routesGrid)" />

                {/* Decorative road network */}
                <path
                    d="M-10 220 C 80 200, 140 230, 220 200 S 360 240, 410 210"
                    fill="none"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="stroke-gray-200 dark:stroke-gray-700"
                />
                <path
                    d="M-10 80 C 90 110, 160 60, 240 80 S 350 40, 410 70"
                    fill="none"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="stroke-gray-200 dark:stroke-gray-700"
                />
                <path
                    d="M70 -10 C 90 80, 60 160, 100 280"
                    fill="none"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="stroke-gray-200 dark:stroke-gray-700"
                />
                <path
                    d="M300 -10 C 280 100, 320 180, 280 280"
                    fill="none"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="stroke-gray-200 dark:stroke-gray-700"
                />

                {/* Glow layer of the route */}
                <motion.path
                    d={ROUTE_PATH_D}
                    fill="none"
                    stroke="url(#routeStroke)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeOpacity="0.18"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    viewport={{ once: true }}
                />

                {/* Main route */}
                <motion.path
                    d={ROUTE_PATH_D}
                    fill="none"
                    stroke="url(#routeStroke)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    viewport={{ once: true }}
                />

                {/* Travelling pulse */}
                <motion.circle
                    r="4"
                    fill="#fff"
                    stroke="#6366f1"
                    strokeWidth="2"
                    initial={{ offsetDistance: '0%' }}
                    animate={{ offsetDistance: '100%' }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    style={{
                        offsetPath: `path('${ROUTE_PATH_D}')`,
                    }}
                />
            </svg>

            {/* Stops overlay */}
            {ROUTE_STOPS.map((stop, idx) => (
                <motion.div
                    key={stop.n}
                    className="absolute z-10"
                    style={{
                        top: stop.top,
                        left: stop.left,
                        transform: 'translate(-50%, -50%)',
                    }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{
                        delay: 0.4 + idx * 0.15,
                        type: 'spring',
                        stiffness: 220,
                        damping: 16,
                    }}
                    viewport={{ once: true }}
                >
                    <div className="relative">
                        <span className="absolute -inset-2 rounded-full bg-indigo-500/20 animate-ping" />
                        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 border-indigo-500 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 shadow-md">
                            {stop.n}
                        </span>
                    </div>
                    <div className="mt-1 hidden sm:flex items-center gap-1 rounded-full bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:text-gray-200 shadow-sm whitespace-nowrap -translate-x-1/2 absolute left-1/2 top-full">
                        <PiClock className="text-[10px]" />
                        {stop.time}
                    </div>
                </motion.div>
            ))}

            {/* AI suggestion */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                viewport={{ once: true }}
                className="absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur p-2.5 sm:p-3 shadow-xl"
            >
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                        <PiSparkle className="text-base" />
                    </span>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t('growth.visual.aiBadge')}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {t('growth.visual.aiTip', { minutes: 18 })}
                        </div>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                        <PiMapPin className="text-xs" />
                        {t('growth.visual.savedBadge', { minutes: 18 })}
                    </span>
                </div>
            </motion.div>
        </div>
    )
}

const PointList = ({ children }) => {
    return (
        <div className="flex items-center gap-2">
            <TbCircleCheck className="text-xl text-primary flex-shrink-0" />
            <span className="text-sm md:text-base text-gray-700 dark:text-gray-300">{children}</span>
        </div>
    )
}

const OtherFeatures = () => {
    const t = useTranslations('landing.otherFeatures')
    const locale = useLocale()
    const mode = useTheme((state) => state.mode)
    const cardStyles = getCardBgStyles(mode === MODE_LIGHT ? 'light' : 'dark')

    return (
        <div id="otherFeatures" className="relative z-20 py-10 md:py-20">
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
                <div className="mt-10 md:mt-20">
                    <motion.div
                        className="bg-gray-100 dark:bg-gray-800 rounded-3xl py-8 px-6 lg:py-24 lg:px-16 overflow-hidden mb-6 md:mb-10"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.3,
                            type: 'spring',
                            bounce: 0.1,
                        }}
                        viewport={{ once: true }}
                    >
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4">
                            <div>
                                <h3 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                                    {t('mobile.title')}
                                </h3>
                                <p className="mt-4 md:mt-6 max-w-[550px] text-sm md:text-lg text-gray-600 dark:text-gray-400">
                                    {t('mobile.description')}
                                </p>
                                <div className="mt-8 md:mt-12 flex flex-col gap-4">
                                    <PointList>{t('mobile.points.schedule')}</PointList>
                                    <PointList>{t('mobile.points.chat')}</PointList>
                                    <PointList>{t('mobile.points.stats')}</PointList>
                                </div>
                            </div>
                            <div className="relative flex justify-center">
                                <motion.div
                                    className="p-2 border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 rounded-[32px] max-w-[300px] lg:absolute lg:top-[-50px]"
                                    animate={{ y: [0, -14, 0] }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                >
                                    <div className="absolute inset-x-0 bottom-0 h-20 w-full bg-gradient-to-b from-transparent via-gray-100 to-gray-100 dark:via-zinc-800/70 dark:to-gray-800 scale-[1.1] pointer-events-none" />
                                    <div className="bg-white dark:bg-black dark:border-gray-700 border border-gray-200 rounded-[24px] overflow-hidden max-h-[450px]">
                                        <img
                                            src={getLandingFeaturesSrc(
                                                locale,
                                                'mobile.png',
                                            )}
                                            alt="Mobile view"
                                            className="rounded-[24px]"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        className="bg-gray-100 dark:bg-gray-800 rounded-3xl py-8 px-6 lg:py-24 lg:px-16 overflow-hidden mb-6 md:mb-10"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.3,
                            type: 'spring',
                            bounce: 0.1,
                        }}
                        viewport={{ once: true }}
                    >
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4">
                            <div className="relative flex justify-center items-center order-2 lg:order-1">
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{
                                        duration: 6,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                    className="flex w-full justify-center"
                                >
                                    <RoutesAiVisual t={t} />
                                </motion.div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <h3 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                                    {t('growth.title')}
                                </h3>
                                <p className="mt-4 md:mt-6 max-w-[550px] text-sm md:text-lg text-gray-600 dark:text-gray-400">
                                    {t('growth.description')}
                                </p>
                                <div className="mt-8 md:mt-12 flex flex-col gap-4">
                                    <PointList>{t('growth.points.access')}</PointList>
                                    <PointList>{t('growth.points.compare')}</PointList>
                                    <PointList>{t('growth.points.languages')}</PointList>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        className="bg-gray-100 dark:bg-gray-800 rounded-3xl py-8 px-6 lg:py-24 lg:px-16 overflow-hidden mb-6 md:mb-10"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.3,
                            type: 'spring',
                            bounce: 0.1,
                        }}
                        viewport={{ once: true }}
                    >
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4">
                            <div>
                                <h3 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                                    {t('integrations.title')}
                                </h3>
                                <p className="mt-4 md:mt-6 max-w-[550px] text-sm md:text-lg text-gray-600 dark:text-gray-400">
                                    {t('integrations.description')}
                                </p>
                                <div className="mt-8 md:mt-12 flex flex-col gap-4">
                                    <PointList>{t('integrations.points.stripe')}</PointList>
                                    <PointList>{t('integrations.points.salary')}</PointList>
                                    <PointList>{t('integrations.points.export')}</PointList>
                                </div>
                            </div>
                            <div className="relative flex justify-center items-center">
                                <motion.div
                                    animate={{ y: [0, -14, 0] }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                        delay: 0.6,
                                    }}
                                    className="flex w-full justify-center"
                                >
                                    <PaymentVisual
                                        cardStyles={cardStyles}
                                        t={t}
                                    />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Container>
        </div>
    )
}

export default OtherFeatures
