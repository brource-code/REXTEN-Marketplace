'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PiSparkleFill } from 'react-icons/pi'
import useSubscriptionLimits from '@/hooks/useSubscriptionLimits'

const TONE_CLASSES = {
    pro: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    enterprise: 'bg-gradient-to-r from-amber-400 to-orange-500',
}

const TONE_HOVER_CLASSES = {
    pro: 'hover:from-blue-600 hover:to-indigo-700',
    enterprise: 'hover:from-amber-500 hover:to-orange-600',
}

// Какой план требуется для каждой фичи. Расширять по мере добавления фич.
const FEATURE_TIER = {
    routes: { tone: 'pro', label: 'Pro' },
    analytics: { tone: 'pro', label: 'Pro' },
    api_access: { tone: 'enterprise', label: 'Enterprise' },
    priority_support: { tone: 'pro', label: 'Pro' },
}

/**
 * Оборачивает контент страницы и, если у компании нет нужной фичи в подписке,
 * показывает заблюренный контент с upsell-оверлеем поверх.
 *
 * Тексты берутся из messages.business.featureLock.<feature> (5 локалей):
 *   - title, description, cta
 *
 * Цвет бейджа/кнопки:
 * - 'pro'        — синий (Professional)
 * - 'enterprise' — оранжевый (Enterprise)
 *
 * @param {object} props
 * @param {string} props.feature                   ключ фичи (напр. 'routes', 'analytics', 'api_access')
 * @param {'pro'|'enterprise'} [props.tone]        принудительно задать цветовую гамму
 * @param {string} [props.badgeLabel]              переопределить текст бейджа (по умолчанию из FEATURE_TIER)
 * @param {React.ReactNode} props.children
 */
export default function FeatureLockOverlay({ feature, tone, badgeLabel, children }) {
    const t = useTranslations('business.featureLock')
    const { hasFeature, isLoading } = useSubscriptionLimits()

    if (isLoading) {
        return children
    }

    if (hasFeature(feature)) {
        return children
    }

    const tier = FEATURE_TIER[feature] || { tone: 'pro', label: 'Pro' }
    const resolvedTone = tone || tier.tone
    const resolvedLabel = badgeLabel || tier.label
    const toneClass = TONE_CLASSES[resolvedTone] || TONE_CLASSES.pro
    const toneHover = TONE_HOVER_CLASSES[resolvedTone] || TONE_HOVER_CLASSES.pro

    return (
        <div className="relative">
            <div
                aria-hidden
                className="pointer-events-none select-none filter blur-md grayscale opacity-70"
            >
                {children}
            </div>

            <div className="absolute inset-0 z-20 flex items-start justify-center pt-16 sm:pt-24">
                <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-white ${toneClass}`}>
                            <PiSparkleFill size={18} />
                        </span>
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${toneClass}`}>
                            {resolvedLabel}
                        </span>
                    </div>

                    <h4 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t(`${feature}.title`)}
                    </h4>
                    <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t(`${feature}.description`)}
                    </p>

                    <Link
                        href="/business/subscription"
                        className={`mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm ${toneClass} ${toneHover}`}
                    >
                        {t(`${feature}.cta`)}
                    </Link>
                </div>
            </div>
        </div>
    )
}
