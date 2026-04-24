'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getLaravelApiUrl } from '@/lib/api/marketplace'

const SECTION_IDS = {
    base: 'api-docs-base',
    auth: 'api-docs-auth',
    zapier: 'api-docs-zapier',
    endpoints: 'api-docs-endpoints',
    query: 'api-docs-query',
    response: 'api-docs-response',
    limits: 'api-docs-limits',
    errors: 'api-docs-errors',
    example: 'api-docs-example',
}

/** Production v1 base URL for docs copy-paste (same host as public API). */
const DOCS_V1_PUBLIC_BASE = 'https://api.rexten.live/api/v1'

const RESPONSE_PAGINATED_EXAMPLE = `{
  "data": [
    { "id": 1 }
  ],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 120,
    "last_page": 5
  }
}`

const RESPONSE_SINGLE_EXAMPLE = `{
  "data": {
    "id": 42
  }
}`

function CodePanel({ title, children, action }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-[#0f1419] shadow-sm dark:shadow-none dark:ring-1 dark:ring-inset dark:ring-white/5">
            {(title || action) && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/20 dark:bg-black/35">
                    {title ? (
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                            {title}
                        </span>
                    ) : (
                        <span />
                    )}
                    {action}
                </div>
            )}
            <pre className="p-4 text-xs font-mono leading-relaxed text-slate-100 overflow-x-auto">{children}</pre>
        </div>
    )
}

function MethodRow({ path, description, method = 'GET' }) {
    const methodBadgeClass =
        method === 'POST'
            ? 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/50'
            : 'bg-primary-subtle text-primary-deep ring-1 ring-primary/15 dark:text-primary-mild dark:ring-primary/25'
    return (
        <div className="flex flex-col gap-2 py-3 border-b border-gray-100 dark:border-gray-700/90 last:border-0 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${methodBadgeClass}`}
                >
                    {method}
                </span>
                <code className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">{path}</code>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 sm:flex-1 sm:min-w-0">{description}</p>
        </div>
    )
}

export default function DocsTab() {
    const t = useTranslations('business.api.docs')
    const base = getLaravelApiUrl().replace(/\/$/, '')
    const resolvedV1 = `${base}/v1`
    const resolvedZapier = `${base}/zapier`
    const sameV1AsPublicDocs = resolvedV1 === DOCS_V1_PUBLIC_BASE

    const [copied, setCopied] = useState(null) // 'v1' | 'zapier' | null
    const curlOneLine = `curl -sS -H "Authorization: Bearer YOUR_TOKEN" ${DOCS_V1_PUBLIC_BASE}/me`
    const curlExample = `curl -sS -H "Authorization: Bearer YOUR_TOKEN" \\\n  ${DOCS_V1_PUBLIC_BASE}/me`

    const copyCurl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(curlOneLine)
            setCopied('v1')
            window.setTimeout(() => setCopied(null), 2000)
        } catch {
            setCopied(null)
        }
    }, [curlOneLine])

    const zapierCurlOne = `curl -sS -H "Authorization: Bearer YOUR_TOKEN" ${resolvedZapier}/me`
    const copyZapierCurl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(zapierCurlOne)
            setCopied('zapier')
            window.setTimeout(() => setCopied(null), 2000)
        } catch {
            setCopied(null)
        }
    }, [zapierCurlOne])

    const navItems = useMemo(
        () => [
            { id: SECTION_IDS.base, label: t('nav.base') },
            { id: SECTION_IDS.auth, label: t('nav.auth') },
            { id: SECTION_IDS.endpoints, label: t('nav.restV1') },
            { id: SECTION_IDS.query, label: t('nav.query') },
            { id: SECTION_IDS.response, label: t('nav.response') },
            { id: SECTION_IDS.limits, label: t('nav.limits') },
            { id: SECTION_IDS.errors, label: t('nav.errors') },
            { id: SECTION_IDS.example, label: t('nav.example') },
            { id: SECTION_IDS.zapier, label: t('nav.zapier') },
        ],
        [t],
    )

    const lines = useMemo(
        () => [
            `GET ${DOCS_V1_PUBLIC_BASE}/me`,
            `GET ${DOCS_V1_PUBLIC_BASE}/services`,
            `GET ${DOCS_V1_PUBLIC_BASE}/services/{id}`,
            `GET ${DOCS_V1_PUBLIC_BASE}/clients`,
            `GET ${DOCS_V1_PUBLIC_BASE}/clients/{id}`,
            `GET ${DOCS_V1_PUBLIC_BASE}/bookings`,
            `GET ${DOCS_V1_PUBLIC_BASE}/bookings/{id}`,
            `GET ${DOCS_V1_PUBLIC_BASE}/team-members`,
            `GET ${DOCS_V1_PUBLIC_BASE}/reviews`,
            `GET ${DOCS_V1_PUBLIC_BASE}/schedule`,
        ],
        [],
    )

    const navLinkClass =
        'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:w-full lg:whitespace-normal lg:text-left'

    return (
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
            <div className="lg:w-52 shrink-0">
                <div className="lg:sticky lg:top-4">
                    <p className="mb-2 hidden text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 lg:block">
                        {t('onThisPage')}
                    </p>
                    <nav
                        className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
                        aria-label={t('onThisPage')}
                    >
                        {navItems.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className={navLinkClass}
                                onClick={(e) => {
                                    e.preventDefault()
                                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="min-w-0 flex-1 space-y-8">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/50 p-3">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('heroBlockRestTitle')}</p>
                        <p className="mt-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">{t('heroBlockRestLine')}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/50 p-3">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('heroBlockZapierTitle')}</p>
                        <p className="mt-1.5 text-sm font-bold text-gray-500 dark:text-gray-400">{t('heroBlockZapierLine')}</p>
                    </div>
                </div>

                <section id={SECTION_IDS.base} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('baseUrl')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('baseUrlIntro')}</p>
                    <CodePanel title={t('baseUrlPatternTitle')}>
                        <code className="text-primary-mild">{'{BASE_URL}/v1'}</code>
                    </CodePanel>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('baseUrlPatternHint')}</p>
                    <CodePanel title={t('baseUrlProductionTitle')}>
                        <code className="text-primary-mild">{DOCS_V1_PUBLIC_BASE}</code>
                    </CodePanel>
                    {!sameV1AsPublicDocs && (
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('baseUrlThisAppTitle')}</p>
                            <CodePanel>
                                <code className="text-primary-mild">{resolvedV1}</code>
                            </CodePanel>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('baseUrlThisAppHint')}</p>
                        </div>
                    )}
                </section>

                <section id={SECTION_IDS.auth} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('auth')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('authHint')}</p>
                    <CodePanel>
                        <code>Authorization: Bearer YOUR_TOKEN</code>
                    </CodePanel>
                </section>

                <section id={SECTION_IDS.endpoints} className="scroll-mt-24 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('endpointsTitle')}</h5>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/70 px-4">
                        <MethodRow path="/v1/me" description={t('endpointMe')} />
                        <MethodRow path="/v1/services" description={t('endpointServices')} />
                        <MethodRow path="/v1/services/{id}" description={t('endpointServiceById')} />
                        <MethodRow path="/v1/clients" description={t('endpointClients')} />
                        <MethodRow path="/v1/clients/{id}" description={t('endpointClientById')} />
                        <MethodRow path="/v1/bookings" description={t('endpointBookings')} />
                        <MethodRow path="/v1/bookings/{id}" description={t('endpointBookingById')} />
                        <div className="border-t border-gray-100 dark:border-gray-700/90 pt-3 mt-1">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                {t('endpointsR11Title')}
                            </p>
                            <MethodRow path="/v1/team-members" description={t('endpointTeamMembers')} />
                            <MethodRow path="/v1/reviews" description={t('endpointReviews')} />
                            <MethodRow path="/v1/schedule" description={t('endpointSchedule')} />
                        </div>
                    </div>
                    <CodePanel title={t('pathsBlockTitle')}>
                        <code className="text-slate-200">{lines.join('\n')}</code>
                    </CodePanel>
                </section>

                <section id={SECTION_IDS.query} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('querySectionTitle')}</h5>
                    <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/60 p-4">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('pagination')}</p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('filtersBookings')}</p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('filtersClients')}</p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('filtersTeamMembers')}</p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('filtersReviews')}</p>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('filtersSchedule')}</p>
                    </div>
                </section>

                <section id={SECTION_IDS.response} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('responseSectionTitle')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('responseListIntro')}</p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('responseSingleIntro')}</p>
                    <CodePanel title={t('responsePaginatedExampleTitle')}>
                        <code className="whitespace-pre text-slate-200">{RESPONSE_PAGINATED_EXAMPLE}</code>
                    </CodePanel>
                    <CodePanel title={t('responseSingleExampleTitle')}>
                        <code className="whitespace-pre text-slate-200">{RESPONSE_SINGLE_EXAMPLE}</code>
                    </CodePanel>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('responseMeNote')}</p>
                </section>

                <section id={SECTION_IDS.limits} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('limitsSectionTitle')}</h5>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/15">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{t('rateLimits')}</p>
                    </div>
                </section>

                <section id={SECTION_IDS.errors} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('errorsTitle')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('errorExample')}</p>
                    <CodePanel title={t('errorBodyTitle')}>
                        <code className="whitespace-pre text-slate-200">{`{
  "error": "forbidden",
  "message": "..."
}`}</code>
                    </CodePanel>
                </section>

                <section id={SECTION_IDS.example} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('exampleTitle')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('exampleHint')}</p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('exampleTokenHint')}</p>
                    <CodePanel
                        title="cURL"
                        action={
                            <button
                                type="button"
                                onClick={copyCurl}
                                className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                            >
                                {copied === 'v1' ? t('copied') : t('copy')}
                            </button>
                        }
                    >
                        <code className="whitespace-pre-wrap text-slate-200">{curlExample}</code>
                    </CodePanel>
                </section>

                <section id={SECTION_IDS.zapier} className="scroll-mt-24 space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('zapierSectionTitle')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('zapierIntro')}</p>
                    <CodePanel title={t('zapierPathTitle')}>
                        <code className="text-primary-mild">{resolvedZapier}</code>
                    </CodePanel>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/70 px-4">
                        <MethodRow path="/zapier/me" description={t('zapierEndpointMe')} method="GET" />
                        <MethodRow path="/zapier/bookings" description={t('zapierBookingsList')} method="GET" />
                        <MethodRow path="/zapier/clients" description={t('zapierClientsList')} method="GET" />
                        <MethodRow path="/zapier/clients" description={t('zapierClientsCreate')} method="POST" />
                        <MethodRow path="/zapier/bookings" description={t('zapierBookingsCreate')} method="POST" />
                    </div>
                    <CodePanel
                        title={t('zapierCurlTitle')}
                        action={
                            <button
                                type="button"
                                onClick={copyZapierCurl}
                                className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                            >
                                {copied === 'zapier' ? t('copied') : t('copy')}
                            </button>
                        }
                    >
                        <code className="whitespace-pre-wrap text-slate-200">{zapierCurlOne}</code>
                    </CodePanel>
                </section>
            </div>
        </div>
    )
}
