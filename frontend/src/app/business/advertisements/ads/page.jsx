'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RedirectInner() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const next = new URLSearchParams(searchParams.toString())
        next.set('tab', 'ads')
        next.set('pageIndex', '1')
        router.replace(`/business/advertisements?${next.toString()}`)
    }, [router, searchParams])

    return null
}

/** Старый URL: редирект на `/business/advertisements?tab=ads`. */
export default function BusinessAdvertisementsAdsRedirectPage() {
    return (
        <Suspense fallback={null}>
            <RedirectInner />
        </Suspense>
    )
}
