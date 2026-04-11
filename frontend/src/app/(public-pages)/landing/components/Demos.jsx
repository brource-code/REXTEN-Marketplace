'use client'
import { useState, useEffect, useMemo } from 'react'
import Container from './LandingContainer'
import demoCategoriesIcons from '../utils/demo-categories-icons.config'
import { getServicesList, getCategories } from '@/lib/api/marketplace'
import { buildSlugToDemoTabMap } from '../utils/landing-demo-category-buckets'
import { getCategoryName } from '@/utils/categoryUtils'
import classNames from '@/utils/classNames'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import ServiceCard from '@/components/marketplace/ServiceCard'

const slugToDemoTab = buildSlugToDemoTabMap()

const Tabs = ({ selectedTab, setSelectedTab, tabList, groupedListings }) => {
    return (
        <div className="flex flex-col gap-2">
            {tabList.map((tab) => {
                const count = (groupedListings[tab.id] || []).length
                return (
                    <button
                        key={tab.id}
                        type="button"
                        className={classNames(
                            'font-semibold px-3 rounded-lg flex items-center w-full whitespace-nowrap gap-x-2 transition-colors duration-150 h-12',
                            tab.id === selectedTab
                                ? 'text-primary bg-primary-subtle hover:text-primary hover:bg-primary-subtle'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-gray-700',
                        )}
                        onClick={() => setSelectedTab(tab.id)}
                    >
                        <span className="text-2xl">
                            {demoCategoriesIcons[tab.id]}
                        </span>
                        <span>{tab.name}</span>
                        <span className="ml-auto text-xs text-gray-400">
                            {count}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

const MobileChips = ({
    selectedTab,
    setSelectedTab,
    tabList,
    groupedListings,
}) => {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:hidden no-scrollbar">
            {tabList.map((tab) => {
                const count = (groupedListings[tab.id] || []).length
                return (
                    <button
                        key={tab.id}
                        type="button"
                        className={classNames(
                            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors',
                            tab.id === selectedTab
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                        )}
                        onClick={() => setSelectedTab(tab.id)}
                    >
                        <span className="text-lg">
                            {demoCategoriesIcons[tab.id]}
                        </span>
                        <span>{tab.name}</span>
                        <span className="text-xs opacity-70">({count})</span>
                    </button>
                )
            })}
        </div>
    )
}

const MAX_CARDS = 4

const Demos = () => {
    const [selectedTab, setSelectedTab] = useState('all')
    const [listings, setListings] = useState([])
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const t = useTranslations('landing.demos')
    const tServices = useTranslations('public.services')

    const tabList = [
        { id: 'all', name: t('categories.all') },
        { id: 'beauty', name: t('categories.beauty') },
        { id: 'wellness', name: t('categories.wellness') },
        { id: 'home', name: t('categories.home') },
        { id: 'auto', name: t('categories.auto') },
        { id: 'education', name: t('categories.education') },
        { id: 'events', name: t('categories.events') },
    ]

    useEffect(() => {
        const loadListings = async () => {
            try {
                const [services, categoriesData] = await Promise.all([
                    getServicesList(),
                    getCategories(),
                ])
                setListings(Array.isArray(services) ? services : [])
                setCategories(Array.isArray(categoriesData) ? categoriesData : [])
            } catch (error) {
                console.error('Error loading listings:', error)
            } finally {
                setIsLoading(false)
            }
        }
        loadListings()
    }, [])

    const formattedListings = useMemo(() => {
        return listings.map((service) => {
            const categoryObj = categories.find(
                (cat) => String(cat.id) === String(service.group),
            )
            const baseCategory = categoryObj
                ? getCategoryName(categoryObj, tServices)
                : (service.category ?? '')
            const slug = (categoryObj?.slug || '').toLowerCase()
            const demoTab = slug ? slugToDemoTab[slug] ?? null : null
            return {
                ...service,
                groupLabel: baseCategory,
                category: baseCategory,
                demoTab,
            }
        })
    }, [listings, categories, tServices])

    const groupedListings = useMemo(() => {
        const all = formattedListings
        const pick = (tabId) =>
            tabId === 'all'
                ? all
                : all.filter((item) => item.demoTab === tabId)

        return {
            all: pick('all'),
            beauty: pick('beauty'),
            wellness: pick('wellness'),
            home: pick('home'),
            auto: pick('auto'),
            education: pick('education'),
            events: pick('events'),
        }
    }, [formattedListings])

    const displayedListings = (groupedListings[selectedTab] || []).slice(
        0,
        MAX_CARDS,
    )

    return (
        <div id="demos" className="relative z-20 py-10 md:py-20">
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
            <Container>
                <MobileChips
                    selectedTab={selectedTab}
                    setSelectedTab={setSelectedTab}
                    tabList={tabList}
                    groupedListings={groupedListings}
                />
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mt-4 md:mt-0">
                    <div className="min-w-[220px] shrink-0 hidden md:block">
                        <Tabs
                            selectedTab={selectedTab}
                            setSelectedTab={setSelectedTab}
                            tabList={tabList}
                            groupedListings={groupedListings}
                        />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                        {isLoading ? (
                            <div className="text-center py-8 text-gray-500">
                                {t('loading')}
                            </div>
                        ) : displayedListings.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {t('noResults')}
                            </div>
                        ) : (
                            <>
                                {/* Как /services: мобильный список — compact */}
                                <div className="md:hidden space-y-3">
                                    <AnimatePresence mode="popLayout">
                                        {displayedListings.map((listing, index) => (
                                            <motion.div
                                                key={listing.id}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -12 }}
                                                transition={{
                                                    duration: 0.25,
                                                    delay: index * 0.04,
                                                }}
                                            >
                                                <ServiceCard
                                                    service={listing}
                                                    variant="compact"
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                {/* Как /services: десктопная сетка — default (не catalog) */}
                                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    <AnimatePresence mode="popLayout">
                                        {displayedListings.map((listing, index) => (
                                            <motion.div
                                                key={listing.id}
                                                className="min-w-0"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: index * 0.05,
                                                }}
                                            >
                                                <ServiceCard service={listing} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    )
}

export default Demos
