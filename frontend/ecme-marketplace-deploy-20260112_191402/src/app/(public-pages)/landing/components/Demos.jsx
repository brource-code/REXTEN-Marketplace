'use client'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Container from './LandingContainer'
import demoCategoriesIcons from '../utils/demo-categories-icons.config'
import { getServicesList } from '@/lib/api/marketplace'
import classNames from '@/utils/classNames'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const tabList = [
    {
        id: 'all',
        name: 'Все',
    },
    {
        id: 'beauty',
        name: 'Красота',
    },
    {
        id: 'wellness',
        name: 'Здоровье',
    },
    {
        id: 'home',
        name: 'Дом и сервис',
    },
    {
        id: 'auto',
        name: 'Авто',
    },
    {
        id: 'education',
        name: 'Обучение',
    },
    {
        id: 'events',
        name: 'События',
    },
]


const DemoCard = ({ listing, mode }) => {
    const {
        id,
        name,
        path,
        imageUrl,
        category,
        location,
        priceLabel,
        rating,
    } = listing

    return (
        <Link href={path}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 h-max"
                rel="noreferrer"
            >
                <div className="rounded-xl overflow-hidden relative">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="rounded-xl w-full h-48 relative overflow-hidden bg-gray-200 dark:bg-gray-800"
                    >
                        <Image
                            src={imageUrl}
                            alt={name}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            unoptimized
                        />
                    </motion.div>
                    <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full bg-white/90 text-gray-900 text-xs font-semibold">
                        {category}
                    </span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold">{name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {location}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-500">
                            {rating} ★
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {priceLabel}
                        </p>
                    </div>
                </div>
            </motion.div>
        </Link>
    )
}

const Tabs = ({ selectedTab, setSelectedTab }) => {
    return (
        <div className="flex flex-col gap-2">
            {tabList.map((tab) => (
                <button
                    key={tab.id}
                    className={classNames(
                        'font-semibold px-3 rounded-lg flex items-center w-full whitespace-nowrap gap-x-2 transition-colors duration-150 h-12 ',
                        tab.id === selectedTab
                            ? 'text-primary bg-primary-subtle hover:texy-primary hover:bg-primary-subtle'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-700',
                    )}
                    onClick={() => setSelectedTab(tab.id)}
                >
                    <span className="text-2xl">
                        {demoCategoriesIcons[tab.id]}
                    </span>
                    <span>{tab.name}</span>
                </button>
            ))}
        </div>
    )
}

const Demos = ({ mode }) => {
    const [selectedTab, setSelectedTab] = useState('all')
    const [listings, setListings] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const router = useRouter()

    useEffect(() => {
        const loadListings = async () => {
            try {
                const services = await getServicesList()
                setListings(services)
            } catch (error) {
                console.error('Error loading listings:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadListings()
    }, [])

    const handleViewAllDemos = () => {
        router.push('/services')
    }
    
    // Группируем listings по категориям
    const groupedListings = listings.reduce(
        (acc, listing) => {
            acc[listing.group] = [...(acc[listing.group] || []), listing]
            return acc
        },
        { all: listings },
    )

    return (
        <div id="demos" className="relative z-20 py-10 md:py-40">
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                viewport={{ once: true }}
            >
                <motion.h2 className="my-6 text-5xl">
                    Категории и мастера REXTEN
                </motion.h2>
                <motion.p className="mx-auto max-w-[600px]">
                    Подберите мастера по городу и категории или посмотрите
                    профили с лучшими отзывами. Каждая карточка — готовая
                    витрина, подключенная к бронированиям и оплате.
                </motion.p>
            </motion.div>
            <Container>
                <div className="flex gap-12">
                    <div className="min-w-[250px] hidden md:block">
                        <Tabs
                            selectedTab={selectedTab}
                            setSelectedTab={setSelectedTab}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            <div className="col-span-2 text-center py-8 text-gray-500">
                                Загрузка...
                            </div>
                        ) : (
                            <AnimatePresence>
                                {(groupedListings[selectedTab] || []).map(
                                    (listing) => (
                                    <DemoCard
                                        key={listing.id}
                                        listing={listing}
                                            mode={mode}
                                    />
                                    ),
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
                <div className="mt-20 text-center">
                    <Button
                        className="inline-flex items-center"
                        onClick={handleViewAllDemos}
                    >
                        Смотреть все услуги
                    </Button>
                </div>
            </Container>
        </div>
    )
}

export default Demos
