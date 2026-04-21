import { Suspense } from 'react'
import AuthPageLogo from '@/components/auth/AuthPageLogo'
import GoogleChooseRoleBusinessClient from './_components/GoogleChooseRoleBusinessClient'

export default function GoogleChooseRoleBusinessPage() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto w-full max-w-2xl px-1">
                    <AuthPageLogo className="mb-6" />
                    <div className="animate-pulse rounded-2xl border border-gray-200 bg-gray-50/80 p-8 dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="mb-4 h-8 w-2/3 rounded-lg bg-gray-200 dark:bg-gray-700" />
                        <div className="mb-6 h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-3">
                            <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                            <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                            <div className="h-24 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                </div>
            }
        >
            <GoogleChooseRoleBusinessClient />
        </Suspense>
    )
}
