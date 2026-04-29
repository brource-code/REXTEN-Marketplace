import { NextResponse } from 'next/server'
import {
    buildApiCatalogLinkset,
    getApiCatalogContentType,
    getApiCatalogHeadLinkHeader,
} from '@/lib/seo/agent-discovery'

export const dynamic = 'force-static'

export function GET() {
    const body = buildApiCatalogLinkset()
    return new NextResponse(JSON.stringify(body), {
        status: 200,
        headers: {
            'Content-Type': getApiCatalogContentType(),
            Link: getApiCatalogHeadLinkHeader(),
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
}

export function HEAD() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Content-Type': getApiCatalogContentType(),
            Link: getApiCatalogHeadLinkHeader(),
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
}
