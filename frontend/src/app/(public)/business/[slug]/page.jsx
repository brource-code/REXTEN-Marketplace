import { permanentRedirect } from 'next/navigation'

/**
 * Канонический публичный профиль компании — `/marketplace/company/{slug}`.
 * Старый URL `/business/{slug}` (заглушка) редиректим постоянно, чтобы не плодить дубли в поиске.
 */
export const dynamic = 'force-dynamic'

export default async function LegacyBusinessProfileRedirect({ params }) {
    const p = await params
    const raw = p?.slug
    const slug = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim()
    if (!slug) {
        permanentRedirect('/services')
    }
    permanentRedirect(`/marketplace/company/${encodeURIComponent(slug)}`)
}
