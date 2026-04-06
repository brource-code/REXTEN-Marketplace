'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Container from '@/components/shared/Container'
import NotFound404 from '@/assets/svg/NotFound404'

/**
 * Заглушка «обслуживание» в стиле страницы 404.
 * Вход на /sign-in (суперадмин и др.); обновление — без перехода на /services (избегаем цикла при maintenance).
 */
export default function MaintenanceScreen() {
    const t = useTranslations('maintenance')

    return (
        <div
            data-public-fullscreen
            className="flex min-h-screen min-h-[100dvh] flex-auto flex-col"
        >
            <div className="h-full min-h-[100dvh] bg-white dark:bg-gray-900">
                <Container className="flex flex-col flex-auto items-center justify-center min-w-0 h-full">
                    <div className="min-w-[320px] md:min-w-[500px] max-w-[500px]">
                        <div className="text-center">
                            <div className="mb-10 flex justify-center">
                                <NotFound404 height={350} width={350} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h2>
                            <p className="text-lg mt-6 text-gray-600 dark:text-gray-300">
                                {t('description')}
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
                                <Link
                                    href="/sign-in"
                                    className="button inline-flex items-center justify-center bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-700 ring-primary dark:ring-white hover:border-primary dark:hover:border-white hover:ring-1 hover:text-primary dark:hover:text-white dark:hover:bg-transparent text-gray-600 dark:text-gray-100 h-14 rounded-xl px-8 py-2 text-base button-press-feedback w-full sm:w-auto min-w-[200px]"
                                >
                                    {t('signIn')}
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => typeof window !== 'undefined' && window.location.reload()}
                                    className="button inline-flex items-center justify-center border border-transparent text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-white h-14 rounded-xl px-8 py-2 text-base font-bold underline-offset-2 hover:underline w-full sm:w-auto"
                                >
                                    {t('refresh')}
                                </button>
                            </div>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    )
}
