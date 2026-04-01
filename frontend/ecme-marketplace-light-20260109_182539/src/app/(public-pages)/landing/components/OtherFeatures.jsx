import Container from './LandingContainer'
import { TbCircleCheck } from 'react-icons/tb'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

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
            <TbCircleCheck className="text-xl" />
            <span>{children}</span>
        </div>
    )
}

const OtherFeatures = () => {
    return (
        <div id="otherFeatures" className="relative z-20 py-10 md:py-40">
            <Container>
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-5xl">
                        Для клиентов, мастеров и сетей
                    </motion.h2>
                    <motion.p className="mx-auto max-w-[600px]">
                        REXTEN работает по всей стране: мобильные бронирования,
                        карты городов, многоязычие и готовые сценарии для
                        франшиз.
                    </motion.p>
                </motion.div>
                <div className="mt-20">
                    <motion.div
                        className="bg-gray-100 dark:bg-gray-800 rounded-3xl py-12 px-10 lg:py-24 lg:px-16 overflow-hidden mb-10"
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
                                <h3 className="text-4xl">
                                    Мобильный маркетплейс
                                </h3>
                                <p className="mt-6 max-w-[550px] text-lg">
                                    Лендинги мастеров, каталог и личный кабинет
                                    оптимизированы под мобильные бронирования —
                                    70% трафика приходит со смартфонов.
                                </p>
                                <div className="mt-12 flex flex-col gap-4">
                                    <PointList>
                                        Адаптивные карточки услуг и расписание
                                        на всех экранах.
                                    </PointList>
                                    <PointList>
                                        Push/SMS-напоминания встроены в UI.
                                    </PointList>
                                    <PointList>
                                        Бронирование занимает &lt; 30 секунд,
                                        включая оплату.
                                    </PointList>
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
                                            src="/img/landing/features/mobile.png"
                                            alt="Mobile view"
                                            className="rounded-[24px]"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        className="bg-gray-100 dark:bg-gray-800 rounded-3xl py-12 px-10 lg:py-24 lg:px-16 overflow-hidden mb-10"
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
                            <div className="relative flex justify-center">
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
                            <div>
                                <h3 className="text-4xl">
                                    География и локализация
                                </h3>
                                <p className="mt-6 max-w-[550px] text-lg">
                                    Управляйте филиалами в разных штатах. Карта
                                    показывает активных мастеров, а фильтры
                                    подбирают услуги по ZIP-коду.
                                </p>
                                <div className="mt-12 flex flex-col gap-4">
                                    <PointList>
                                        Статистика по штатам и городам в
                                        реальном времени.
                                    </PointList>
                                    <PointList>
                                        Теги языков и доступных сервисов в
                                        карточке мастера.
                                    </PointList>
                                    <PointList>
                                        Поддержка английского и русского интерфейсов.
                                    </PointList>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div className="bg-gray-100 dark:bg-gray-800 rounded-3xl py-12 px-10 lg:py-24 lg:px-16 overflow-hidden mb-10">
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4">
                            <div>
                                <h3 className="text-4xl">API и автоматизация</h3>
                                <p className="mt-6 max-w-[550px] text-lg">
                                    Laravel API отдает бронирования, клиентов,
                                    платежи и расписание. Подключите CRM,
                                    таргетинг или биллинг через webhooks и
                                    интеграции.
                                </p>
                                <div className="mt-12 flex flex-col gap-4">
                                    <PointList>
                                        JWT + webhooks для синхронизации записей.
                                    </PointList>
                                    <PointList>
                                        Модули подписок, оплаты Stripe и
                                        marketplace fees.
                                    </PointList>
                                    <PointList>
                                        SDK для мобильных приложений и партнеров.
                                    </PointList>
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
                                                src="/img/landing/features/rtl.png"
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
