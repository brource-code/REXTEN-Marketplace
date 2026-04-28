'use client'

import Container from '@/components/shared/Container'
import Link from 'next/link'
import ServiceCard from '@/components/marketplace/ServiceCard'
import { useTranslations } from 'next-intl'
import { PiArrowLeft } from 'react-icons/pi'

/**
 * @param {{
 *   level: 'category' | 'state' | 'city'
 *   categorySlug: string
 *   categoryLabel: string
 *   stateCode?: string
 *   stateName?: string
 *   cityLabel?: string
 *   services: unknown[]
 * }} props
 */
export default function ServicesSeoLandingClient({
    level,
    categorySlug,
    categoryLabel,
    stateCode,
    stateName,
    cityLabel,
    services,
}) {
    const t = useTranslations('public.seoLanding')
    const tServices = useTranslations('public.services')

    const heading =
        level === 'category'
            ? t('categoryHeading', { category: categoryLabel })
            : level === 'state'
              ? t('stateHeading', {
                    category: categoryLabel,
                    state: stateName || stateCode || '',
                })
              : t('cityHeading', {
                    category: categoryLabel,
                    city: cityLabel || '',
                    state: stateName || stateCode || '',
                })

    const intro =
        level === 'category'
            ? t('introCategory', { category: categoryLabel })
            : level === 'state'
              ? t('introState', {
                    category: categoryLabel,
                    state: stateName || stateCode || '',
                })
              : t('introCity', {
                    category: categoryLabel,
                    city: cityLabel || '',
                })

    const faq =
        level === 'category'
            ? [
                  { q: t('faqCategoryQ1'), a: t('faqCategoryA1') },
                  { q: t('faqCategoryQ2'), a: t('faqCategoryA2') },
                  { q: t('faqCategoryQ3'), a: t('faqCategoryA3') },
              ]
            : level === 'state'
              ? [
                    {
                        q: t('faqStateQ1', {
                            state: stateName || stateCode || '',
                        }),
                        a: t('faqStateA1'),
                    },
                    { q: t('faqCategoryQ1'), a: t('faqCategoryA1') },
                    { q: t('faqCategoryQ2'), a: t('faqCategoryA2') },
                ]
              : [
                    {
                        q: t('faqCityQ1', { city: cityLabel || '' }),
                        a: t('faqCityA1'),
                    },
                    { q: t('faqCategoryQ1'), a: t('faqCategoryA1') },
                    { q: t('faqCategoryQ3'), a: t('faqCategoryA3') },
                ]

    return (
        <main className="text-base bg-white dark:bg-gray-900 min-h-screen pt-20 md:pt-24 pb-16">
            <Container className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="pb-6">
                    <Link
                        href="/services"
                        className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-2"
                    >
                        <PiArrowLeft className="text-base" />
                        <span>{tServices('title')}</span>
                    </Link>
                </div>

                <header className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        {heading}
                    </h1>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-3xl">
                        {intro}
                    </p>
                </header>

                <section className="mb-10 flex flex-wrap gap-3 text-sm font-bold">
                    {level !== 'category' && (
                        <Link
                            href={`/services/${encodeURIComponent(categorySlug)}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            {categoryLabel}
                        </Link>
                    )}
                    {level === 'city' && stateCode && (
                        <Link
                            href={`/services/${encodeURIComponent(categorySlug)}/${encodeURIComponent(stateCode)}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            {t('moreCategoryInCity', {
                                category: categoryLabel,
                                city: cityLabel || '',
                            })}
                        </Link>
                    )}
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
                    {services.map((service) => (
                        <ServiceCard key={service.id || service.path} service={service} />
                    ))}
                </section>

                <section className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        FAQ
                    </h2>
                    <dl className="space-y-4">
                        {faq.map((item, idx) => (
                            <div key={idx}>
                                <dt className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {item.q}
                                </dt>
                                <dd className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                                    {item.a}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            </Container>
        </main>
    )
}
