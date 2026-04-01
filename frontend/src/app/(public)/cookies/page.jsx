import Container from '@/components/shared/Container'
import { useTranslations, useLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { formatDate } from '@/utils/dateTime'

export async function generateMetadata() {
    const t = await getTranslations('legal.cookies');
    return {
        title: `${t('title')} | REXTEN Marketplace`,
        description: t('section1.content').slice(0, 150) + '...',
    }
}

export default function CookiesPage() {
    const t = useTranslations('legal.cookies');
    const locale = useLocale();

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 py-8 sm:py-12">
            <Container>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                        {t('lastUpdate')}: {formatDate(new Date(), 'America/Los_Angeles', 'long')}
                    </p>

                    <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section1.title')}
                            </h2>
                            <p>{t('section1.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section2.title')}
                            </h2>
                            
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                {t('section2.subsection1.title')}
                            </h3>
                            <p>{t('section2.subsection1.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section2.subsection1.list.item1')}</li>
                                <li>{t('section2.subsection1.list.item2')}</li>
                                <li>{t('section2.subsection1.list.item3')}</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                {t('section2.subsection2.title')}
                            </h3>
                            <p>{t('section2.subsection2.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section2.subsection2.list.item1')}</li>
                                <li>{t('section2.subsection2.list.item2')}</li>
                                <li>{t('section2.subsection2.list.item3')}</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                {t('section2.subsection3.title')}
                            </h3>
                            <p>{t('section2.subsection3.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section2.subsection3.list.item1')}</li>
                                <li>{t('section2.subsection3.list.item2')}</li>
                                <li>{t('section2.subsection3.list.item3')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section3.title')}
                            </h2>
                            <p>{t('section3.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section3.list.item1')}</li>
                                <li>{t('section3.list.item2')}</li>
                                <li>{t('section3.list.item3')}</li>
                                <li>{t('section3.list.item4')}</li>
                                <li>{t('section3.list.item5')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section4.title')}
                            </h2>
                            <p>{t('section4.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section4.list.item1')}</li>
                                <li>{t('section4.list.item2')}</li>
                                <li>{t('section4.list.item3')}</li>
                            </ul>
                            <p className="mt-4">{t('section4.note')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section5.title')}
                            </h2>
                            
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                {t('section5.subsection1.title')}
                            </h3>
                            <p>{t('section5.subsection1.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section5.subsection1.list.item1')}</li>
                                <li>{t('section5.subsection1.list.item2')}</li>
                                <li>{t('section5.subsection1.list.item3')}</li>
                                <li>{t('section5.subsection1.list.item4')}</li>
                            </ul>
                            <p className="mt-4">{t('section5.subsection1.note')}</p>

                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                                {t('section5.subsection2.title')}
                            </h3>
                            <p>{t('section5.subsection2.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section6.title')}
                            </h2>
                            <p>{t('section6.content')}</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li dangerouslySetInnerHTML={{ __html: t.raw('section6.list.item1') }} />
                                <li dangerouslySetInnerHTML={{ __html: t.raw('section6.list.item2') }} />
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section7.title')}
                            </h2>
                            <p>{t('section7.content')}</p>
                            <p className="mt-4">{t('section7.note')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section8.title')}
                            </h2>
                            <p>{t('section8.content')}</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
                                {t('section9.title')}
                            </h2>
                            <p>{t('section9.content')}</p>
                        </section>
                    </div>
                </div>
            </Container>
        </div>
    )
}
