'use client'

import { useMemo, useState } from 'react'
import Container from './LandingContainer'
import EnterpriseContactDialog from './EnterpriseContactDialog'
import { motion } from 'framer-motion'
import {
    PiCheckCircleFill,
    PiXCircleFill,
    PiUsers,
    PiWrench,
    PiMegaphone,
    PiHeadset,
    PiCode,
    PiArrowUpRight,
    PiMapTrifold,
} from 'react-icons/pi'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import classNames from '@/utils/classNames'
import { useQuery } from '@tanstack/react-query'
import { getPublicSubscriptionPlans } from '@/lib/api/marketplace'
import Loading from '@/components/shared/Loading'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_LIGHT } from '@/constants/theme.constant'

const getCardBgStyles = (mode = 'light') => ({
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3e%3ccircle fill='${mode === 'light' ? 'rgb(0 0 0 / 0.2)' : 'rgb(255 255 255 / 0.2)'}' id='pattern-circle' cx='10' cy='10' r='1.6257413380501518'%3e%3c/circle%3e%3c/svg%3e")`,
})

function isUnlimited(value) {
    return value === -1 || value === '-1'
}

function num(v) {
    if (v === null || v === undefined || v === '') {
        return 0
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

/**
 * @returns {Array<{ Icon: import('react').ComponentType<{ className?: string; size?: number }>, kind: 'capacity' | 'flag', included: boolean, label: string }>}
 */
function buildPlanRows(plan, tFrom) {
    const f = plan.features || {}

    const team = f.max_team_members
    const services = f.max_services
    const ads = f.max_advertisements
    const aiReq = f.ai_max_requests_per_month

    return [
        {
            Icon: PiUsers,
            kind: 'capacity',
            included: true,
            label: isUnlimited(team)
                ? tFrom('teamUnlimited')
                : tFrom('teamUpTo', { n: num(team) }),
        },
        {
            Icon: PiWrench,
            kind: 'capacity',
            included: true,
            label: isUnlimited(services)
                ? tFrom('servicesUnlimited')
                : tFrom('servicesUpTo', { n: num(services) }),
        },
        {
            Icon: PiMegaphone,
            kind: 'capacity',
            included: true,
            label: isUnlimited(ads)
                ? tFrom('listingsUnlimited')
                : tFrom('listingsUpTo', { n: num(ads) }),
        },
        {
            Icon: PiMapTrifold,
            kind: 'flag',
            included: Boolean(f.routes && f.analytics && num(aiReq) > 0),
            label: tFrom('featRoutesAiDispatcherAnalytics'),
        },
        {
            Icon: PiCode,
            kind: 'flag',
            included: !!f.api_access,
            label: tFrom('featApi'),
        },
        {
            Icon: PiHeadset,
            kind: 'flag',
            included: !!f.priority_support,
            label: tFrom('featPriority'),
        },
    ]
}

const PricingCard = ({ plan, index, t, tFrom, highlighted, onContactEnterprise }) => {
    const router = useRouter()

    const isEnterprise = plan.id === 'enterprise'

    const handleClick = () => {
        if (isEnterprise) {
            onContactEnterprise?.()
            return
        }
        router.push('/sign-up')
    }

    const rows = useMemo(() => buildPlanRows(plan, tFrom), [plan, tFrom])

    const priceLabel = `$${Math.round(Number(plan.price_monthly) || 0)}`
    const badgeLabel = plan.badge_text?.trim() || t('popular')

    /** Нейтральные «чипы» без primary — читаются на тёмном фоне; на Pro — тёмный полупрозрачный блок + белая иконка */
    const iconBoxClass = highlighted
        ? 'border border-white/25 bg-slate-950/35 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
        : 'border border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700/90 dark:text-gray-100'

    const statusIcon = (included) => {
        if (included) {
            return (
                <PiCheckCircleFill
                    className={classNames(
                        'h-5 w-5 shrink-0 mt-0.5',
                        highlighted
                            ? 'text-emerald-200 drop-shadow-sm'
                            : 'text-emerald-600 dark:text-emerald-400',
                    )}
                    aria-hidden
                />
            )
        }
        return (
            <PiXCircleFill
                className={classNames(
                    'h-5 w-5 shrink-0 mt-0.5',
                    highlighted ? 'text-white/40' : 'text-gray-400 dark:text-gray-500',
                )}
                aria-hidden
            />
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.1,
                type: 'spring',
                bounce: 0.1,
            }}
            viewport={{ once: true }}
            className={classNames(
                'relative rounded-2xl p-6',
                highlighted
                    ? 'bg-gradient-to-br from-primary to-primary-deep text-white shadow-xl ring-2 ring-primary md:scale-105'
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            )}
        >
            {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-primary text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {badgeLabel}
                </div>
            )}
            <div className="text-center mb-6">
                <h3
                    className={classNames(
                        'text-xl font-bold mb-2',
                        highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100',
                    )}
                >
                    {plan.name}
                </h3>
                <p
                    className={classNames(
                        'text-sm',
                        highlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400',
                    )}
                >
                    {plan.description || '\u00a0'}
                </p>
                <div className="mt-4">
                    <span
                        className={classNames(
                            'text-4xl font-bold',
                            highlighted ? 'text-white' : 'text-gray-900 dark:text-gray-100',
                        )}
                    >
                        {priceLabel}
                    </span>
                    <span className={highlighted ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}>
                        {tFrom('perMonth')}
                    </span>
                </div>
            </div>
            <ul className="space-y-3 mb-6">
                {rows.map((row, i) => (
                    <li key={`${row.label}-${i}`} className="flex items-start gap-3">
                        <span
                            className={classNames(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                iconBoxClass,
                            )}
                            aria-hidden
                        >
                            <row.Icon className="text-lg" />
                        </span>
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                            {row.kind === 'capacity' ? statusIcon(true) : statusIcon(row.included)}
                            <span
                                className={classNames(
                                    'text-sm font-bold leading-snug',
                                    highlighted ? 'text-white/95' : 'text-gray-800 dark:text-gray-100',
                                    row.kind === 'flag' && !row.included && !highlighted && 'text-gray-500 dark:text-gray-400',
                                    row.kind === 'flag' && !row.included && highlighted && 'text-white/55',
                                )}
                            >
                                {row.label}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
            <Button
                className="w-full"
                variant={highlighted ? 'default' : 'solid'}
                onClick={handleClick}
            >
                {isEnterprise ? tFrom('ctaContact') : tFrom('ctaStart')}
            </Button>
        </motion.div>
    )
}

const HeaderCard = ({ delay, visual, title, description }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay, type: 'spring', bounce: 0.1 }}
            viewport={{ once: true }}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-800 p-2.5 md:p-4 flex flex-col"
        >
            {visual}
            <div className="mt-2.5 md:mt-4">
                <h4 className="text-[13px] md:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {title}
                </h4>
                <p className="mt-1 md:mt-1.5 text-[11px] md:text-sm font-bold text-gray-500 dark:text-gray-400 leading-snug">
                    {description}
                </p>
            </div>
        </motion.div>
    )
}

const PLAN_PILLS = ['Free', 'Starter', 'Professional', 'Enterprise']

const PlansVisual = ({ cardStyles }) => (
    <div
        className="rounded-lg md:rounded-xl bg-white dark:bg-gray-900 p-2 md:p-3 h-20 md:h-28 flex flex-wrap items-center justify-center gap-1 md:gap-1.5"
        style={cardStyles}
    >
        {PLAN_PILLS.map((name, i) => (
            <span
                key={name}
                className={classNames(
                    'px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-[11px] font-bold border',
                    i === 2
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700',
                )}
            >
                {name}
            </span>
        ))}
    </div>
)

/** Визуал блока «N дней бесплатно»; тексты — из next-intl (EN: «trial», др. локали — «период» и т.п.). */
const FreePeriodVisual = ({ cardStyles, daysLabel, freeLabel }) => (
    <div
        className="rounded-lg md:rounded-xl bg-white dark:bg-gray-900 p-2 md:p-3 h-20 md:h-28 flex items-center justify-center"
        style={cardStyles}
    >
        <div className="flex items-baseline gap-1 md:gap-1.5">
            <span className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                14
            </span>
            <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] md:tracking-[0.15em] text-gray-500 dark:text-gray-400">
                    {daysLabel}
                </span>
                <span className="text-[10px] md:text-[11px] font-bold text-primary">
                    {freeLabel}
                </span>
            </div>
        </div>
    </div>
)

const FreeVisual = ({ cardStyles, perMonthLabel }) => (
    <div
        className="rounded-lg md:rounded-xl bg-white dark:bg-gray-900 p-2 md:p-3 h-20 md:h-28 flex items-center justify-center"
        style={cardStyles}
    >
        <div className="flex items-baseline">
            <span className="text-base md:text-2xl font-bold text-gray-500 dark:text-gray-400 leading-none">
                $
            </span>
            <span className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                0
            </span>
            <span className="ml-0.5 md:ml-1 text-[11px] md:text-sm font-bold text-gray-500 dark:text-gray-400">
                {perMonthLabel}
            </span>
        </div>
    </div>
)

const UpgradeVisual = ({ cardStyles }) => (
    <div
        className="rounded-lg md:rounded-xl bg-white dark:bg-gray-900 p-2 md:p-3 h-20 md:h-28 flex items-center justify-center"
        style={cardStyles}
    >
        <div className="flex items-end gap-1 md:gap-1.5">
            <span className="h-3 md:h-4 w-1.5 md:w-2.5 rounded-sm bg-gray-200 dark:bg-gray-700" />
            <span className="h-5 md:h-7 w-1.5 md:w-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
            <span className="h-7 md:h-10 w-1.5 md:w-2.5 rounded-sm bg-primary/60" />
            <span className="h-9 md:h-14 w-1.5 md:w-2.5 rounded-sm bg-primary shadow-sm shadow-primary/30" />
            <PiArrowUpRight className="ml-1 md:ml-1.5 text-3xl md:text-3xl text-primary" />
        </div>
    </div>
)

const Pricing = () => {
    const t = useTranslations('landing.pricing')
    const tFrom = useTranslations('landing.pricing.fromPlan')
    const mode = useTheme((state) => state.mode)
    const cardStyles = getCardBgStyles(mode === MODE_LIGHT ? 'light' : 'dark')
    const [contactOpen, setContactOpen] = useState(false)

    const { data: apiPlans = [], isLoading, isError } = useQuery({
        queryKey: ['public-subscription-plans'],
        queryFn: getPublicSubscriptionPlans,
        staleTime: 5 * 60 * 1000,
    })

    const cards = useMemo(() => {
        return apiPlans.map((plan) => ({
            plan,
            highlighted: plan.id === 'professional',
        }))
    }, [apiPlans])

    return (
        <div id="pricing" className="relative z-20 py-10 md:py-20">
            <Container>
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0.1 }}
                    viewport={{ once: true }}
                >
                    <motion.h2 className="my-6 text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
                        {t('sectionTitle')}
                    </motion.h2>
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4 mb-12 max-w-5xl mx-auto">
                    <HeaderCard
                        delay={0.15}
                        visual={<PlansVisual cardStyles={cardStyles} />}
                        title={t('cardTitlePlans')}
                        description={t('chipPlans')}
                    />
                    <HeaderCard
                        delay={0.25}
                        visual={
                            <FreePeriodVisual
                                cardStyles={cardStyles}
                                daysLabel={t('trialDaysLabel')}
                                freeLabel={t('trialFreeLabel')}
                            />
                        }
                        title={t('cardTitleTrial')}
                        description={t('chipTrial')}
                    />
                    <HeaderCard
                        delay={0.35}
                        visual={
                            <FreeVisual
                                cardStyles={cardStyles}
                                perMonthLabel={tFrom('perMonth')}
                            />
                        }
                        title={t('cardTitleFree')}
                        description={t('chipFree')}
                    />
                    <HeaderCard
                        delay={0.45}
                        visual={<UpgradeVisual cardStyles={cardStyles} />}
                        title={t('cardTitleUpgrade')}
                        description={t('chipUpgrade')}
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loading loading />
                    </div>
                ) : isError || cards.length === 0 ? (
                    <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400 py-8">
                        {tFrom('loadError')}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
                        {cards.map(({ plan, highlighted }, index) => (
                            <PricingCard
                                key={plan.id}
                                plan={plan}
                                index={index}
                                t={t}
                                tFrom={tFrom}
                                highlighted={highlighted}
                                onContactEnterprise={() => setContactOpen(true)}
                            />
                        ))}
                    </div>
                )}
            </Container>

            <EnterpriseContactDialog
                isOpen={contactOpen}
                onClose={() => setContactOpen(false)}
            />
        </div>
    )
}

export default Pricing
