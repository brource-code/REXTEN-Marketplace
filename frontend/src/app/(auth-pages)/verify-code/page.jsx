import { Suspense } from 'react'
import VerifyCodeClient from './_components/VerifyCodeClient'
import AuthPageLogo from '@/components/auth/AuthPageLogo'

export default function VerifyCodePage() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto w-full max-w-xl px-1">
                    <AuthPageLogo className="mb-6" />
                    <div className="animate-pulse rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="mb-4 h-8 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="mb-8 h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mb-6 h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="mb-2 grid w-full grid-cols-6 gap-1.5 sm:gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="aspect-square w-full min-w-0 rounded-lg bg-gray-200 dark:bg-gray-700 sm:rounded-xl"
                            />
                        ))}
                    </div>
                    </div>
                </div>
            }
        >
            <VerifyCodeClient />
        </Suspense>
    )
}
