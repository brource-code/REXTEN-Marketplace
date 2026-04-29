import { NextResponse } from 'next/server'
import { buildPublicOpenApiDocument } from '@/lib/seo/public-api-openapi'

export const dynamic = 'force-static'

const OPENAPI_MEDIA =
    'application/vnd.oai.openapi+json; charset=utf-8; version=3.0'

export function GET() {
    const doc = buildPublicOpenApiDocument()
    return new NextResponse(JSON.stringify(doc), {
        status: 200,
        headers: {
            'Content-Type': OPENAPI_MEDIA,
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
}
