import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import DemoMagicLoginClient from './DemoMagicLoginClient'

export const metadata = {
    title: 'REXTEN — Business demo sign-in',
    robots: { index: false, follow: false },
}

export default async function BusinessDemoLoginPage() {
    const t = await getTranslations('auth.magicDemoLink')

    return (
        <Suspense
            fallback={
                <div className="mx-auto max-w-md px-4 py-16">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h4>
                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">{t('loading')}</p>
                </div>
            }
        >
            <DemoMagicLoginClient />
        </Suspense>
    )
}
