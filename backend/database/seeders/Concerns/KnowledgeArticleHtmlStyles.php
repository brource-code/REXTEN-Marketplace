<?php

namespace Database\Seeders\Concerns;

/**
 * Общие стили kb-* и SVG для HTML-статей базы знаний (сидеры KnowledgeArticle).
 */
trait KnowledgeArticleHtmlStyles
{
    protected function iconsCss(): string
    {
        return <<<'CSS'
<style>
/* База: чёткий текст; html.dark — как в приложении (не только prefers-color-scheme) */
.kb-wrap{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;line-height:1.65;max-width:100%;font-size:0.9375rem;-webkit-font-smoothing:antialiased}
.kb-wrap p{color:#111827;margin:0.7rem 0}
.kb-wrap ol,.kb-wrap ul{color:#111827}
.kb-wrap h2[id]{scroll-margin-top:5.5rem}
.kb-wrap h2{font-size:1.2rem;font-weight:700;margin:1.75rem 0 0.75rem;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:0.5rem;letter-spacing:-0.01em;line-height:1.35}
.kb-wrap h3{font-size:1.02rem;font-weight:700;margin:1.25rem 0 0.5rem;color:#0f172a;letter-spacing:-0.01em}
.kb-hero{background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin:0 0 1rem;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.kb-hero p,.kb-hero .kb-hero-lead{margin:0;font-size:0.95rem;color:#334155;line-height:1.6}
.kb-hero .kb-hero-title{display:block;font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:8px;font-family:inherit}
.kb-quote{font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#475569;border-left:4px solid #cbd5e1;padding:12px 16px;background:#f8fafc;margin:1rem 0;border-radius:0 12px 12px 0}
.kb-tip{font-size:0.875rem;background:#eff6ff;color:#1e3a5f;padding:14px 16px;border-radius:12px;margin:1rem 0;border:1px solid #bfdbfe;line-height:1.55}
.kb-tip strong{color:#0f172a}
.kb-flex{display:flex;flex-wrap:wrap;gap:14px;margin:16px 0;align-items:stretch}
.kb-card{flex:1 1 150px;min-width:140px;border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.05),0 4px 12px rgba(15,23,42,.04);transition:box-shadow .15s ease,border-color .15s ease}
.kb-card:hover{border-color:#cbd5e1;box-shadow:0 2px 4px rgba(15,23,42,.06),0 8px 20px rgba(15,23,42,.06)}
.kb-ic{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;margin-bottom:12px;flex-shrink:0;line-height:0}
.kb-ic svg{display:block;width:22px;height:22px;flex-shrink:0;vertical-align:middle}
.kb-card small{display:block;font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.kb-card span{display:block;font-size:0.875rem;font-weight:600;color:#0f172a;line-height:1.5}
.kb-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:0.75rem;font-weight:700;margin:6px 4px 2px 0;background:#eef2ff;color:#312e81;border:1px solid #c7d2fe}
.kb-pill svg{width:16px;height:16px;flex-shrink:0;display:block}
.kb-callout{border-radius:12px;padding:14px 16px;margin:14px 0;border:1px solid #e2e8f0;background:linear-gradient(180deg,#fafafa 0%,#f4f4f5 100%);color:#475569;line-height:1.55}
.kb-callout strong{color:#0f172a}
.kb-steps{margin:0.65rem 0 0;padding-left:1.25rem}
.kb-steps li{margin:0.4rem 0;color:#111827}
.kb-details{margin:14px 0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.kb-details summary{cursor:pointer;font-weight:700;padding:14px 16px;background:#f8fafc;color:#0f172a;list-style:none;transition:background .12s ease}
.kb-details summary:hover{background:#f1f5f9}
.kb-details summary::-webkit-details-marker{display:none}
.kb-details[open] summary{border-bottom:1px solid #e2e8f0}
.kb-details .kb-inner{padding:16px 18px;color:#111827}
.kb-details .kb-inner p{color:#111827}
.kb-details .kb-inner code{font-size:0.88em;background:#f1f5f9;padding:3px 7px;border-radius:6px;color:#0f172a}
.kb-check li{margin:8px 0;padding-left:2px;color:#111827}
.kb-nav{font-size:0.9rem;color:#475569;margin-bottom:1.1rem;line-height:1.55;padding:12px 14px;background:#fafafa;border:1px solid #e5e7eb;border-radius:12px}
.kb-nav strong{color:#0f172a}
.kb-nav a{color:#2563eb;font-weight:700;text-decoration:none;border-radius:6px;padding:1px 2px}
.kb-nav a:hover{color:#1d4ed8;text-decoration:underline;text-underline-offset:3px}
.kb-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:14px 0}
.kb-footnote{font-size:0.8125rem;color:#64748b;margin-top:1.5rem;line-height:1.5}
html.dark .kb-wrap{color:#e5e7eb}
html.dark .kb-wrap p,html.dark .kb-wrap li,html.dark .kb-wrap ol{color:#e5e7eb}
html.dark .kb-wrap h2{color:#f8fafc;border-bottom-color:#475569}
html.dark .kb-wrap h3{color:#f1f5f9}
html.dark .kb-hero{background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border-color:#374151;box-shadow:none}
html.dark .kb-hero p,html.dark .kb-hero .kb-hero-lead{color:#cbd5e1}
html.dark .kb-hero .kb-hero-title{color:#f9fafb}
html.dark .kb-quote{background:#111827;color:#cbd5e1;border-left-color:#64748b}
html.dark .kb-tip{background:rgba(30,58,138,.35);color:#e0e7ff;border-color:#4338ca}
html.dark .kb-tip strong{color:#f1f5f9}
html.dark .kb-card{background:#1f2937;border-color:#475569;box-shadow:none}
html.dark .kb-card:hover{border-color:#64748b}
html.dark .kb-card small{color:#94a3b8}
html.dark .kb-card span{color:#f8fafc}
html.dark .kb-pill{background:#312e81;color:#e0e7ff;border-color:#6366f1}
html.dark .kb-callout{background:linear-gradient(180deg,#1f2937 0%,#111827 100%);border-color:#334155;color:#cbd5e1}
html.dark .kb-callout strong{color:#f1f5f9}
html.dark .kb-steps li{color:#e5e7eb}
html.dark .kb-details{border-color:#475569;background:#111827;box-shadow:none}
html.dark .kb-details summary{background:#1f2937;color:#f1f5f9}
html.dark .kb-details summary:hover{background:#374151}
html.dark .kb-details[open] summary{border-bottom-color:#475569}
html.dark .kb-details .kb-inner,html.dark .kb-details .kb-inner p{color:#e5e7eb}
html.dark .kb-details .kb-inner code{background:#334155;color:#e2e8f0}
html.dark .kb-nav{color:#94a3b8;background:#111827;border-color:#374151}
html.dark .kb-nav strong{color:#f8fafc}
html.dark .kb-nav a{color:#93c5fd}
html.dark .kb-nav a:hover{color:#bfdbfe}
html.dark .kb-footnote{color:#94a3b8}
@media (prefers-color-scheme:dark){
 html:not(.dark) .kb-wrap{color:#111827}
}
</style>
CSS;
    }

    protected function svgUsers(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.438-3.256m0 0a9.38 9.38 0 002.625-.372"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11.25a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
    }

    protected function svgCurrency(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    }

    protected function svgClock(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg>';
    }

    protected function svgCalendarCheck(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/></svg>';
    }

    protected function svgMegaphone(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.018c2.163 0 3.824-1.065 4.978-2.548.473-.63.71-.945.995-.945.284 0 .522.316.995.945C16.176 5.065 17.837 6 20 6h1.018a4.001 4.001 0 013.564 7.683"/></svg>';
    }

    protected function svgCalendarPlus(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 11v6m-3-3h6"/></svg>';
    }

    protected function svgUserPlus(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-3-5a3 3 0 11-6 0 3 3 0 016 0zM6.75 21v-1.5a4.5 4.5 0 014.5-4.5h.75"/></svg>';
    }

    protected function svgGear(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
    }

    protected function svgClockSimple(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }

    protected function svgArrowOut(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>';
    }

    protected function svgRepeat(): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';
    }
}
