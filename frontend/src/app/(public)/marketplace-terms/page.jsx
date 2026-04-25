import Container from '@/components/shared/Container'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { formatDate } from '@/utils/dateTime'
import { CLIENT_DEFAULT_TIMEZONE } from '@/constants/client-datetime.constant'
import Link from 'next/link'

export async function generateMetadata() {
    const t = await getTranslations('legal.marketplaceTerms')
    return {
        title: `${t('title')} | REXTEN Marketplace`,
        description: t('intro').slice(0, 150) + '...',
    }
}

export default function MarketplaceTermsPage() {
    const t = useTranslations('legal.marketplaceTerms')

    return (
        <div className="min-h-screen min-h-[100dvh] bg-white dark:bg-gray-900 py-8 sm:py-12">
            <Container className="px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        {t('lastUpdate')}: {formatDate(new Date(), CLIENT_DEFAULT_TIMEZONE, 'long')}
                    </p>

                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 sm:p-5 mb-8">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                            {t('intro')}
                        </p>
                    </div>

                    <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section1.title')}
                            </h2>
                            <p>{t('section1.content')}</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>{t('section1.list.item1')}</li>
                                <li>{t('section1.list.item2')}</li>
                                <li>{t('section1.list.item3')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section2.title')}
                            </h2>
                            <p>{t('section2.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section3.title')}
                            </h2>
                            <p>{t('section3.content')}</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>{t('section3.list.item1')}</li>
                                <li>{t('section3.list.item2')}</li>
                                <li>{t('section3.list.item3')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section4.title')}
                            </h2>
                            <p>{t('section4.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section5.title')}
                            </h2>
                            <p>{t('section5.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section6.title')}
                            </h2>
                            <p>{t('section6.content')}</p>
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                {t('section6.relatedPrefix')}{' '}
                                <Link
                                    href="/terms"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                >
                                    {t('section6.relatedTerms')}
                                </Link>
                                {', '}
                                <Link
                                    href="/privacy"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                >
                                    {t('section6.relatedPrivacy')}
                                </Link>
                                .
                            </p>
                        </section>
                    </div>
                </div>
            </Container>
        </div>
    )
}
