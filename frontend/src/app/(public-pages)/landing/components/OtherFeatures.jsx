'use client'
import Container from './LandingContainer'
import { TbCircleCheck } from 'react-icons/tb'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { getLandingFeaturesSrc } from '@/app/(public-pages)/landing/utils/landingHeroImages'

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
                                    whileHover={{ y: -20 }}
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
                                                    ({
                                                        name,
                                                        coordinates,
                                                        id,
                                                    }) => (
                                                        <Marker
                                                            key={name}
                                                            coordinates={
                                                                coordinates
                                                            }
                                                            className="cursor-pointer group"
                                                        >
                                                            <motion.image
                                                                className="shadow-lg"
                                                                href={
                                                                    mapMeta[id]
                                                                        .img
                                                                }
                                                                height="80"
                                                                width="80"
                                                                whileHover={{
                                                                    scale: 1.1,
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
                            <div className="relative flex justify-center">
                                <motion.div
                                    whileHover={{ y: -20 }}
                                    className="relative flex justify-center w-full"
                                >
                                    <div className="p-4 border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 rounded-[32px] max-w-[550px] lg:absolute ">
                                        <div className="absolute inset-x-0 bottom-0 h-20 w-full bg-gradient-to-b from-transparent via-gray-100 to-gray-100 dark:via-zinc-800/50 dark:to-gray-800 scale-[1.1] pointer-events-none" />
                                        <div className="bg-white dark:border-gray-700 border border-gray-200 rounded-[24px] overflow-hidden p-2">
                                            <img
                                                src={getLandingFeaturesSrc(
                                                    locale,
                                                    'rtl.png',
                                                )}
                                                alt="App screenshot"
                                            />
                                        </div>
                                    </div>
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
