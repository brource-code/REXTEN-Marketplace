import { Suspense } from 'react'
import AuthPageLogo from '@/components/auth/AuthPageLogo'
import GoogleChooseRoleClient from './_components/GoogleChooseRoleClient'

export default function GoogleChooseRolePage() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto w-full max-w-xl px-1">
                    <AuthPageLogo className="mb-6" />
                    <div className="animate-pulse rounded-2xl border border-gray-200 bg-gray-50/80 p-8 dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="mb-4 h-8 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700" />
                        <div className="mb-8 h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-700" />
                            <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                </div>
            }
        >
            <GoogleChooseRoleClient />
        </Suspense>
    )
}
