'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getLaravelApiUrl } from '@/lib/api/marketplace'

const SECTION_IDS = {
    base: 'api-docs-base',
    auth: 'api-docs-auth',
    endpoints: 'api-docs-endpoints',
    query: 'api-docs-query',
    limits: 'api-docs-limits',
    errors: 'api-docs-errors',
    example: 'api-docs-example',
}

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

function MethodRow({ path, description }) {
    return (
        <div className="flex flex-col gap-2 py-3 border-b border-gray-100 dark:border-gray-700/90 last:border-0 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide bg-primary-subtle text-primary-deep ring-1 ring-primary/15 dark:text-primary-mild dark:ring-primary/25">
                    GET
                </span>
                <code className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">{path}</code>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 sm:flex-1 sm:min-w-0">{description}</p>
        </div>
    )
}

export default function DocsTab() {
    const t = useTranslations('business.api.docs')
    const tPh = useTranslations('business.api.placeholders')
    const base = getLaravelApiUrl().replace(/\/$/, '')
    const v1 = `${base}/v1`

    const [copied, setCopied] = useState(false)
    const curlExample = `curl -sS -H "Authorization: Bearer ${tPh('token')}" \\\n  "${base}/v1/me"`

    const copyCurl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(
                `curl -sS -H "Authorization: Bearer ${tPh('token')}" "${base}/v1/me"`,
            )
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }, [base, tPh])

    const navItems = useMemo(
        () => [
            { id: SECTION_IDS.base, label: t('nav.base') },
            { id: SECTION_IDS.auth, label: t('nav.auth') },
            { id: SECTION_IDS.endpoints, label: t('nav.endpoints') },
            { id: SECTION_IDS.query, label: t('nav.query') },
            { id: SECTION_IDS.limits, label: t('nav.limits') },
            { id: SECTION_IDS.errors, label: t('nav.errors') },
            { id: SECTION_IDS.example, label: t('nav.example') },
        ],
        [t],
    )

    const lines = useMemo(
        () => [
            `GET ${base}/v1/me`,
            `GET ${base}/v1/services`,
            `GET ${base}/v1/services/{id}`,
            `GET ${base}/v1/clients`,
            `GET ${base}/v1/clients/{id}`,
            `GET ${base}/v1/bookings`,
            `GET ${base}/v1/bookings/{id}`,
        ],
        [base],
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
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/70 dark:to-gray-950 p-6 shadow-sm">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
                    <div className="relative flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary dark:text-primary-mild">
                                {t('releaseBadge')}
                            </span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('tagline')}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-2xl">{t('intro')}</p>
                    </div>
                </div>

                <section id={SECTION_IDS.base} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('baseUrl')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('baseUrlHint')}</p>
                    <CodePanel>
                        <code className="text-primary-mild">{v1}</code>
                    </CodePanel>
                </section>

                <section id={SECTION_IDS.auth} className="scroll-mt-24 space-y-3">
                    <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('auth')}</h5>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('authHint')}</p>
                    <CodePanel>
                        <code>{`Authorization: Bearer ${tPh('token')}`}</code>
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
                    </div>
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
                    <CodePanel
                        title="cURL"
                        action={
                            <button
                                type="button"
                                onClick={copyCurl}
                                className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                            >
                                {copied ? t('copied') : t('copy')}
                            </button>
                        }
                    >
                        <code className="whitespace-pre-wrap text-slate-200">{curlExample}</code>
                    </CodePanel>
                </section>
            </div>
        </div>
    )
}
