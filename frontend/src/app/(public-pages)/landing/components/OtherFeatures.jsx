'use client'
import Container from './LandingContainer'
import { TbCircleCheck } from 'react-icons/tb'
import { PiArrowUpRight, PiShieldCheckFill } from 'react-icons/pi'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
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

const RegionMap = dynamic(() => import('@/components/shared/RegionMap'), {
    ssr: false,
})

const mapMeta = {
    ny: { img: '/img/countries/US.png' },
    ca: { img: '/img/countries/US.png' },
    tx: { img: '/img/countries/US.png' },
    fl: { img: '/img/countries/US.png' },
}

const data = [
    {
        id: 'ny',
        name: 'New York',
        value: 28.4,
        coordinates: [-74.0059, 40.7128],
    },
    {
        id: 'ca',
        name: 'California',
        value: 35.2,
        coordinates: [-118.2437, 34.0522],
    },
    {
        id: 'tx',
        name: 'Texas',
        value: 22.1,
        coordinates: [-96.797, 32.7767],
    },
    {
        id: 'fl',
        name: 'Florida',
        value: 14.7,
        coordinates: [-80.1918, 25.7617],
    },
]

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
                            <div className="relative flex justify-center order-2 lg:order-1">
                                <div className="lg:absolute h-full w-full left-0 md:left-[-50px] scale-[1.1]">
                                    <RegionMap
                                        data={data}
                                        valueSuffix="%"
                                        hoverable={false}
                                        marker={(Marker) => (
                                            <>
                                                {data.map(
                                                    (
                                                        {
                                                            name,
                                                            coordinates,
                                                            id,
                                                        },
                                                        markerIndex,
                                                    ) => (
                                                        <Marker
                                                            key={name}
                                                            coordinates={
                                                                coordinates
                                                            }
                                                            className="cursor-default group"
                                                        >
                                                            <motion.image
                                                                className="shadow-lg"
                                                                href={
                                                                    mapMeta[id]
                                                                        .img
                                                                }
                                                                height="80"
                                                                width="80"
                                                                animate={{
                                                                    scale: [
                                                                        1,
                                                                        1.1,
                                                                        1,
                                                                    ],
                                                                }}
                                                                transition={{
                                                                    duration: 2.8,
                                                                    repeat: Infinity,
                                                                    ease: 'easeInOut',
                                                                    delay:
                                                                        markerIndex *
                                                                        0.45,
                                                                }}
                                                            />
                                                        </Marker>
                                                    ),
                                                )}
                                            </>
                                        )}
                                    />
                                </div>
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
