import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

/**
 * Семантика и ссылки для SEO/ботов: блок не показывается на экране (sr-only),
 * но полностью присутствует в HTML первого ответа (view-source).
 */
export default async function ServicesCatalogSsr({ services = [] }) {
    const t = await getTranslations('public.services')
    const list = Array.isArray(services) ? services.slice(0, 48) : []

    return (
        <div className="sr-only">
            <section aria-labelledby="services-ssr-h1">
                <h1 id="services-ssr-h1">{t('seoTitle')}</h1>
                <p>{t('seoDescription')}</p>
                <p>{t('description')}</p>
                {list.length > 0 ? (
                    <>
                        <p>{t('foundOffers', { count: list.length })}</p>
                        <nav aria-label="Marketplace listings">
                            <ul>
                                {list.map((s, idx) => {
                                    const href =
                                        typeof s.path === 'string' && s.path.startsWith('/')
                                            ? s.path
                                            : `/marketplace/${encodeURIComponent(String(s.slug ?? s.id ?? idx))}`
                                    const name =
                                        typeof s.name === 'string' && s.name.trim()
                                            ? s.name
                                            : 'Service'
                                    const loc =
                                        typeof s.location === 'string' && s.location.trim()
                                            ? s.location.trim()
                                            : [s.city, s.state].filter(Boolean).join(', ')
                                    const price =
                                        typeof s.priceLabel === 'string' ? s.priceLabel : ''
                                    const rating =
                                        typeof s.rating === 'number'
                                            ? s.rating
                                            : Number(s.rating) || null
                                    const reviews =
                                        typeof s.reviewsCount === 'number'
                                            ? s.reviewsCount
                                            : Number(s.reviews) || null
                                    return (
                                        <li key={String(s.id ?? href)}>
                                            <Link href={href}>
                                                {name}
                                                {loc ? ` — ${loc}` : ''}
                                                {price ? ` — ${price}` : ''}
                                                {rating != null && rating > 0
                                                    ? ` — ${rating.toFixed(1)}★`
                                                    : ''}
                                                {reviews != null && reviews > 0 ? ` (${reviews})` : ''}
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </nav>
                    </>
                ) : null}
            </section>
        </div>
    )
}
