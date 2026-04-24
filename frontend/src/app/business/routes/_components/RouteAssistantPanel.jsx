'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import Spinner from '@/components/ui/Spinner'
import toast from '@/components/ui/toast'
import { getSubscriptionUsage } from '@/lib/api/stripe'
import { assistRouteRequest, applyAssistActionsRequest } from '@/lib/api/routeAssistant'
import { keepProposedAction, keepRecommendation } from '@/lib/routeAssistantQuality'
import { formatDate } from '@/utils/dateTime'
import { PiArrowsOutCardinal, PiChatCircle, PiCheck, PiX } from 'react-icons/pi'
import useBusinessStore from '@/store/businessStore'

/** Макс. сообщений user+assistant в одном запросе к API (короткая память). */
const MEMORY_TRANSPORT_MAX = 8
/** Макс. элементов в ленте чата (user / assistant / system). */
const MAX_UI_CHAT_ITEMS = 36

/**
 * @param {string} s
 * @param {number} max
 */
function clampStr(s, max) {
    const t = String(s ?? '').trim()
    if (t.length <= max) {
        return t
    }
    return `${t.slice(0, Math.max(0, max - 1))}…`
}

/**
 * Компактный текст прошлого ответа для повторной отправки в модель (не полный JSON).
 *
 * @param {import('@/lib/api/routeAssistant').RouteAssistSuccessPayload} turn
 */
function buildAssistantMemo(turn) {
    const parts = []
    if (turn.summary) {
        parts.push(String(turn.summary))
    }
    const issues = Array.isArray(turn.issues) ? turn.issues.slice(0, 4) : []
    for (const is of issues) {
        let line = is.human || ''
        if (is.booking_id != null) {
            line += ` #${is.booking_id}`
        }
        if (line.trim()) {
            parts.push(`Issue: ${line}`)
        }
    }
    const recs = Array.isArray(turn.recommendations)
        ? turn.recommendations.filter(keepRecommendation).slice(0, 3)
        : []
    for (const r of recs) {
        parts.push(`Rec: ${r.title || ''}${r.detail ? ` — ${r.detail}` : ''}`)
    }
    const raw = turn.proposed_actions
    if (Array.isArray(raw)) {
        let n = 0
        for (let i = 0; i < raw.length; i++) {
            if (!keepProposedAction(raw[i])) {
                continue
            }
            const ac = raw[i]
            const ex = ac.explain || ''
            const exp = ac.expected
            const d = exp
                ? ` Δlate~${exp.late_min} idle~${exp.idle_min} ~${exp.miles}mi`
                : ''
            parts.push(`Action[${ac.kind}]: ${ex}${d}`)
            n++
            if (n >= 3) {
                break
            }
        }
    }
    return clampStr(parts.join('\n'), 1000)
}

/**
 * @param {Array<{ kind: string, text: string, memoText?: string, payload?: unknown }>} items
 * @returns {Array<{ role: string, content: string }>}
 */
function transportFromChatItems(items) {
    const out = []
    for (const it of items) {
        if (it.kind === 'user') {
            out.push({ role: 'user', content: clampStr(it.text, 800) })
        } else if (it.kind === 'assistant' && it.memoText) {
            out.push({ role: 'assistant', content: clampStr(it.memoText, 1000) })
        } else if (it.kind === 'system' && it.text) {
            out.push({ role: 'assistant', content: clampStr(`(Dispatcher update) ${it.text}`, 700) })
        }
    }
    while (out.length > MEMORY_TRANSPORT_MAX) {
        out.shift()
    }
    while (out.length > 0 && out[0].role === 'assistant') {
        out.shift()
    }
    return out
}

/**
 * @param {Array<{ kind: string, text: string, memoText?: string, payload?: unknown }>} items
 */
function trimChatItems(items) {
    if (items.length <= MAX_UI_CHAT_ITEMS) {
        return items
    }
    return items.slice(-MAX_UI_CHAT_ITEMS)
}

/**
 * До трёх действий с сырого ответа (как на бэке), с индексом в `proposed_actions` для стабильного ключа UI.
 *
 * @param {import('@/lib/api/routeAssistant').RouteAssistSuccessPayload} turn
 */
function visibleProposedActionsForTurn(turn) {
    const raw = turn.proposed_actions
    if (!Array.isArray(raw)) {
        return []
    }
    const out = []
    for (let i = 0; i < raw.length; i++) {
        if (keepProposedAction(raw[i])) {
            out.push({ ac: raw[i], index: i })
        }
        if (out.length >= 3) {
            break
        }
    }
    return out
}

/**
 * Ключи вида `{bubbleId}-pa-{index}` пишем в сам элемент assistant в chatItems,
 * чтобы «Применено» не терялось при батчинге с setQueryData / invalidateQueries.
 *
 * @param {ChatItem[]} prev
 * @param {string[]|undefined} appliedKeys
 * @returns {ChatItem[]}
 */
function mergeAppliedProposalKeysIntoChatItems(prev, appliedKeys) {
    if (!Array.isArray(appliedKeys) || appliedKeys.length === 0) {
        return prev
    }
    return prev.map((it) => {
        if (it.kind !== 'assistant' || !it.id) {
            return it
        }
        const hits = appliedKeys.filter((k) => typeof k === 'string' && k.startsWith(`${it.id}-`))
        if (hits.length === 0) {
            return it
        }
        const next = new Set([...(it.appliedProposalKeys ?? []), ...hits])
        return { ...it, appliedProposalKeys: [...next] }
    })
}

/**
 * @typedef {{
 *   id: string
 *   kind: 'user' | 'assistant' | 'system'
 *   text: string
 *   memoText?: string
 *   payload?: import('@/lib/api/routeAssistant').RouteAssistSuccessPayload
 *   appliedProposalKeys?: string[]
 * }} ChatItem
 */

/**
 * REXTEN AI Dispatcher: советы и применение действий по дню маршрута.
 */
export default function RouteAssistantPanel({
    specialistId,
    date,
    onOpenBooking,
    canManageRoutes = true,
    /** IANA таймзона ответа маршрута (как на карте); иначе из настроек бизнеса */
    displayTimezone = null,
}) {
    const t = useTranslations('business.routes.assistant')
    const locale = useLocale()
    const { settings } = useBusinessStore()
    const displayTz = displayTimezone || settings?.timezone || 'America/Los_Angeles'
    const queryClient = useQueryClient()
    const scrollRef = useRef(null)
    const chatItemsRef = useRef(/** @type {ChatItem[]} */ ([]))

    const { data: usage } = useQuery({
        queryKey: ['subscription-usage'],
        queryFn: getSubscriptionUsage,
        staleTime: 30 * 1000,
    })

    const ai = usage?.ai

    const [freeText, setFreeText] = useState('')
    const [coolUntil, setCoolUntil] = useState(0)
    const [chatItems, setChatItems] = useState(/** @type {ChatItem[]} */ ([]))
    const [dismissed, setDismissed] = useState(() => new Set())
    const [removeConfirm, setRemoveConfirm] = useState(
        /** @type {{ actions: Array<{ kind: string, params: Record<string, unknown> }>, expectedVersion?: number, removeIds: number[], appliedKeys?: string[] } | null} */
        null,
    )

    useEffect(() => {
        chatItemsRef.current = chatItems
    }, [chatItems])

    const isCooling = Date.now() < coolUntil
    const quotaOk =
        ai?.allowed &&
        (ai?.requests_limit ?? 0) > 0 &&
        (ai?.requests_used ?? 0) < (ai?.requests_limit ?? 0)
    const tokenBlock =
        (ai?.tokens_limit ?? 0) > 0 && (ai?.tokens_used ?? 0) >= (ai?.tokens_limit ?? 0)

    const canUse = Boolean(specialistId) && (quotaOk && !tokenBlock)

    const assistMut = useMutation({
        mutationFn: async (payload) => {
            if (!specialistId) {
                return { ok: false, status: 0, error: 'no specialist' }
            }
            const messages = Array.isArray(payload) ? payload : payload.messages
            const intent = Array.isArray(payload) ? undefined : payload.intent
            return assistRouteRequest({ specialistId, date, messages, locale, intent })
        },
        onSuccess: (res) => {
            if (!res?.ok) {
                if (res?.status === 429) {
                    queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
                    toast.push(
                        <Notification title={t('quotaErrorTitle')} type="danger">
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                {t('quotaErrorBody')}{' '}
                                <Link
                                    href="/business/subscription"
                                    className="text-primary font-bold hover:underline"
                                >
                                    {t('quotaErrorLink')}
                                </Link>
                            </p>
                        </Notification>,
                    )
                } else {
                    toast.push(
                        <Notification title={t('errorTitle')} type="danger">
                            {res?.error || t('genericError')}
                        </Notification>,
                    )
                }
                return
            }
            if (res.data) {
                const memo = buildAssistantMemo(res.data)
                const assistantItem = {
                    id: crypto.randomUUID(),
                    kind: /** @type {const} */ ('assistant'),
                    text: memo,
                    memoText: memo,
                    payload: res.data,
                }
                setChatItems((prev) => {
                    const next = trimChatItems([...prev, assistantItem])
                    chatItemsRef.current = next
                    return next
                })
            }
            queryClient.invalidateQueries({ queryKey: ['subscription-usage'] })
        },
    })

    const appendRouteUpdatedMemory = useCallback(() => {
            const text = t('routeUpdatedMemoryGeneric')
            const sys = {
                id: crypto.randomUUID(),
                kind: /** @type {const} */ ('system'),
                text,
            }
            setChatItems((prev) => {
                const next = trimChatItems([...prev, sys])
                chatItemsRef.current = next
                return next
            })
    }, [t])

    const applyMut = useMutation({
        mutationFn: async (vars) => {
            if (!specialistId) {
                return { ok: false, error: 'no specialist' }
            }
            const { actions, confirmRemoveBookings, expectedVersion: evIn } = vars
            const cachedRoute = queryClient.getQueryData(['business-route', specialistId, date])
            const rawCv = cachedRoute?.cache_version
            const fromCache =
                rawCv != null && Number.isFinite(Number(rawCv)) ? Number(rawCv) : undefined
            const fromExplicit =
                evIn != null && Number.isFinite(Number(evIn)) ? Number(evIn) : undefined
            const expectedVersion = fromExplicit !== undefined ? fromExplicit : fromCache
            const res = await applyAssistActionsRequest({
                specialistId,
                date,
                actions,
                expectedVersion,
                confirmRemoveBookings,
            })
            return { ...res, attemptExpectedVersion: expectedVersion }
        },
        onSuccess: (res, variables) => {
            if (!res?.ok) {
                if (res.error === 'remove_requires_confirm' && (res.remove_booking_ids?.length ?? 0) > 0) {
                    setRemoveConfirm({
                        actions: variables?.actions || [],
                        expectedVersion:
                            variables?.expectedVersion !== undefined
                                ? variables.expectedVersion
                                : res.attemptExpectedVersion,
                        removeIds: res.remove_booking_ids || [],
                        appliedKeys: Array.isArray(variables?.appliedKeys) ? variables.appliedKeys : undefined,
                    })
                    return
                }
                if (res.error === 'route_outdated') {
                    const cv = res.current_version
                    if (typeof cv === 'number' && Number.isFinite(cv)) {
                        queryClient.setQueryData(['business-route', specialistId, date], (old) =>
                            old && typeof old === 'object'
                                ? { ...old, cache_version: cv }
                                : old,
                        )
                    }
                    queryClient.invalidateQueries({ queryKey: ['business-route'] })
                    queryClient.invalidateQueries({ queryKey: ['business-bookings'] })
                    toast.push(
                        <Notification title={t('errorTitle')} type="warning">
                            {t('outdatedData')}
                        </Notification>,
                    )
                    return
                }
                if (res.error === 'bookings_invalid') {
                    queryClient.invalidateQueries({ queryKey: ['business-route'] })
                    queryClient.invalidateQueries({ queryKey: ['business-bookings'] })
                    const ids = Array.isArray(res.invalid_booking_ids)
                        ? res.invalid_booking_ids.join(', ')
                        : ''
                    toast.push(
                        <Notification title={t('errorTitle')} type="warning">
                            {ids ? t('applyBookingsInvalid', { ids }) : t('outdatedData')}
                        </Notification>,
                    )
                    return
                }
                toast.push(
                    <Notification title={t('errorTitle')} type="danger">
                        {res.message || res.error || t('applyFailed')}
                    </Notification>,
                )
                return
            }
            setRemoveConfirm(null)
            if (res.route) {
                queryClient.setQueryData(['business-route', specialistId, date], res.route)
            } else {
                queryClient.invalidateQueries({ queryKey: ['business-route'] })
            }
            queryClient.invalidateQueries({ queryKey: ['business-schedule-slots'] })
            queryClient.invalidateQueries({ queryKey: ['business-bookings', date] })
            queryClient.invalidateQueries({ queryKey: ['business-bookings'] })
            if (Array.isArray(variables?.appliedKeys) && variables.appliedKeys.length > 0) {
                setChatItems((prev) => mergeAppliedProposalKeysIntoChatItems(prev, variables.appliedKeys))
            }
            toast.push(t('applySuccess'))
            if (Array.isArray(variables?.actions) && variables.actions.length > 0) {
                appendRouteUpdatedMemory()
            }
        },
    })

    const onAudit = useCallback(() => {
        if (!canUse || assistMut.isPending) {
            return
        }
        setCoolUntil(Date.now() + 3000)
        // Инструкции для аудита задаёт бэкенд (intent: audit + system); в чат не пишем длинный промпт.
        assistMut.mutate({
            messages: [{ role: 'user', content: t('checkDay') }],
            intent: 'audit',
        })
    }, [canUse, assistMut, t])

    const onSendFree = useCallback(() => {
        const raw = freeText.trim()
        if (!raw || !canUse || assistMut.isPending) {
            return
        }
        const v = clampStr(raw, 800)
        setFreeText('')
        setCoolUntil(Date.now() + 3000)
        const userItem = {
            id: crypto.randomUUID(),
            kind: /** @type {const} */ ('user'),
            text: v,
        }
        const nextItems = trimChatItems([...chatItemsRef.current, userItem])
        chatItemsRef.current = nextItems
        setChatItems(nextItems)
        assistMut.mutate({ messages: transportFromChatItems(nextItems), intent: 'free' })
    }, [canUse, freeText, assistMut])

    useLayoutEffect(() => {
        const el = scrollRef.current
        if (el) {
            el.scrollTop = el.scrollHeight
        }
    }, [chatItems, assistMut.isPending])

    const periodEndText = useMemo(() => {
        if (!ai?.period_end_iso) {
            return ''
        }
        try {
            return formatDate(ai.period_end_iso, displayTz, 'long')
        } catch {
            return ''
        }
    }, [ai?.period_end_iso, displayTz])

    if (!specialistId) {
        return (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3">
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t('title')}
                </h4>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {t('pickSpecialist')}
                </p>
            </div>
        )
    }

    if (ai && !ai.allowed) {
        return (
            <div className="rounded-lg border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/90 dark:bg-amber-900/20 p-3">
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t('title')}
                </h4>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-1">{t('upsell')}</p>
                <Link
                    href="/business/subscription"
                    className="mt-2 inline-block text-sm font-bold text-primary hover:underline"
                >
                    {t('upsellLink')}
                </Link>
            </div>
        )
    }

    const atQuota =
        (ai && ai.requests_used >= ai.requests_limit && (ai.requests_limit ?? 0) > 0) || tokenBlock

    const assistPending = assistMut.isPending
    const assistIntent = assistMut.variables?.intent

    const hasConversation = chatItems.length > 0

    /**
     * @param {import('@/lib/api/routeAssistant').RouteAssistSuccessPayload} turn
     * @param {string} bubbleId
     * @param {string[]|undefined} appliedProposalKeys
     */
    const renderAssistantCard = (turn, bubbleId, appliedProposalKeys) => {
        const appliedSet = new Set(appliedProposalKeys ?? [])
        const recs = (turn.recommendations || []).filter(keepRecommendation)
        const visible = visibleProposedActionsForTurn(turn)
        return (
            <div className="min-w-0 max-w-full space-y-2 rounded-md border border-gray-200 dark:border-gray-700/90 bg-gray-50/80 p-2 dark:bg-gray-800/40">
                {turn.summary ? (
                    <p className="break-words text-sm font-bold text-gray-900 dark:text-gray-100">{turn.summary}</p>
                ) : null}
                {Array.isArray(turn.issues) && turn.issues.length > 0 ? (
                    <ul className="list-disc space-y-1 break-words pl-4 text-xs text-gray-700 dark:text-gray-200">
                        {turn.issues.slice(0, 5).map((is, j) => (
                            <li key={j} className="font-bold">
                                {is.human}
                                {is.booking_id != null ? (
                                    <>
                                        {' '}
                                        <button
                                            type="button"
                                            className="text-primary font-bold hover:underline"
                                            onClick={() => onOpenBooking?.(Number(is.booking_id))}
                                        >
                                            {t('openBooking', { id: is.booking_id })}
                                        </button>
                                    </>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                ) : null}
                {recs.length
                    ? recs.slice(0, 3).map((rec, j) => (
                          <p key={j} className="text-sm font-bold text-gray-500 dark:text-gray-400">
                              <span className="text-gray-900 dark:text-gray-100">{rec.title}</span>
                              {rec.detail ? ` — ${rec.detail}` : ''}
                          </p>
                      ))
                    : null}
                {visible.length > 0 ? (
                    <>
                        {visible.map(({ ac, index }) => {
                            const dKey = `${bubbleId}-pa-${index}`
                            if (dismissed.has(dKey)) {
                                return null
                            }
                            if (appliedSet.has(dKey)) {
                                return (
                                    <div
                                        key={dKey}
                                        className="pt-1 border-t border-dashed border-gray-200 dark:border-gray-600 space-y-1.5"
                                    >
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {ac.explain}
                                        </p>
                                        {ac.expected ? (
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                Δ late ~{ac.expected.late_min ?? 0} min, idle ~
                                                {ac.expected.idle_min ?? 0} min, ~{ac.expected.miles ?? 0}{' '}
                                                {t('miShort')}
                                            </p>
                                        ) : null}
                                        {ac.kind === 'set_included' ? (
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                {t('actionSetIncludedHint')}
                                            </p>
                                        ) : null}
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                                            <PiCheck className="h-4 w-4 shrink-0" aria-hidden />
                                            {t('actionApplied')}
                                        </p>
                                    </div>
                                )
                            }
                            return (
                                <div
                                    key={dKey}
                                    className="pt-1 border-t border-dashed border-gray-200 dark:border-gray-600 space-y-1.5"
                                >
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{ac.explain}</p>
                                    {ac.expected ? (
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                            Δ late ~{ac.expected.late_min ?? 0} min, idle ~
                                            {ac.expected.idle_min ?? 0} min, ~{ac.expected.miles ?? 0} {t('miShort')}
                                        </p>
                                    ) : null}
                                    {ac.kind === 'set_included' ? (
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {t('actionSetIncludedHint')}
                                        </p>
                                    ) : null}
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button
                                            type="button"
                                            size="xs"
                                            variant="solid"
                                            className="shrink-0"
                                            disabled={!canManageRoutes || applyMut.isPending}
                                            onClick={() =>
                                                applyMut.mutate({
                                                    actions: [
                                                        {
                                                            kind: ac.kind,
                                                            params: ac.params || {},
                                                        },
                                                    ],
                                                    appliedKeys: [dKey],
                                                })
                                            }
                                        >
                                            {t('applyOne')}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="xs"
                                            variant="plain"
                                            onClick={() =>
                                                setDismissed((prev) => {
                                                    const s = new Set(prev)
                                                    s.add(dKey)
                                                    return s
                                                })
                                            }
                                        >
                                            <span className="inline-flex items-center gap-0.5">
                                                <PiX className="h-4 w-4" aria-hidden />
                                                {t('dismiss')}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                        {canManageRoutes && visible.length > 1 ? (
                            <div className="pt-1">
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="default"
                                    disabled={applyMut.isPending}
                                    onClick={() => {
                                        const keys = visible.map(({ index: idx }) => `${bubbleId}-pa-${idx}`)
                                        applyMut.mutate({
                                            actions: visible.map(({ ac }) => ({
                                                kind: ac.kind,
                                                params: ac.params || {},
                                            })),
                                            appliedKeys: keys,
                                        })
                                    }}
                                >
                                    <span className="inline-flex items-center gap-0.5">
                                        <PiArrowsOutCardinal className="h-4 w-4" aria-hidden />
                                        {t('applyAll')}
                                    </span>
                                </Button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>
        )
    }

    return (
        <div className="flex min-h-0 min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40 xl:h-full xl:flex-1">
            <div className="flex shrink-0 items-start justify-between gap-2">
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <PiChatCircle className="h-5 w-5 text-primary shrink-0" aria-hidden />
                    {t('title')}
                </h4>
                <div className="text-right text-sm max-w-[11rem]">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-tight">
                        {t('usageLabel')}
                    </div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                        {ai ? `${ai.requests_used} / ${ai.requests_limit}` : '—'}
                    </div>
                </div>
            </div>

            {atQuota && (
                <p className="shrink-0 text-sm font-bold text-amber-700 dark:text-amber-300/90">
                    {t('limitReached', { date: periodEndText || t('limitUnknown') })}
                </p>
            )}

            {removeConfirm && (
                <div
                    className="shrink-0 rounded-md border border-amber-200 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-900/20 p-2 space-y-2"
                    role="alert"
                >
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('removeConfirmTitle')}
                    </p>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {t('removeConfirmBody', { ids: removeConfirm.removeIds.join(', ') })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="solid"
                            onClick={() => {
                                applyMut.mutate({
                                    actions: removeConfirm.actions,
                                    expectedVersion: removeConfirm.expectedVersion,
                                    confirmRemoveBookings: true,
                                    appliedKeys: removeConfirm.appliedKeys ?? [],
                                })
                            }}
                        >
                            {t('removeConfirmApply')}
                        </Button>
                        <Button type="button" size="sm" variant="default" onClick={() => setRemoveConfirm(null)}>
                            {t('removeConfirmCancel')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="solid"
                    className="shrink-0"
                    disabled={!canUse || isCooling || atQuota || assistPending}
                    onClick={onAudit}
                >
                    {assistPending && assistIntent === 'audit' ? t('checkingDay') : t('checkDay')}
                </Button>
            </div>

            <div
                ref={scrollRef}
                className="min-h-[112px] max-h-[min(300px,44vh)] overflow-y-auto space-y-3 pr-0.5 xl:min-h-0 xl:max-h-none xl:flex-1 xl:overflow-y-auto"
                aria-live="polite"
                aria-busy={assistPending ? 'true' : 'false'}
            >
                {!hasConversation && !assistPending ? (
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('emptyHint')}</p>
                ) : null}

                {chatItems.map((item) => {
                    if (item.kind === 'user') {
                        return (
                            <div key={item.id} className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">
                                    {t('youLabel')}
                                </span>
                                <div className="max-w-full rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 dark:bg-primary/15">
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                                        {item.text}
                                    </p>
                                </div>
                            </div>
                        )
                    }
                    if (item.kind === 'system') {
                        return (
                            <div
                                key={item.id}
                                className="rounded-md border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-900/25 px-2 py-1.5 text-center"
                            >
                                <p className="text-xs font-bold text-amber-900 dark:text-amber-200/90">{item.text}</p>
                            </div>
                        )
                    }
                    if (item.kind === 'assistant' && item.payload) {
                        return (
                            <div key={item.id} className="flex flex-col items-start gap-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">
                                    {t('aiLabel')}
                                </span>
                                {renderAssistantCard(item.payload, item.id, item.appliedProposalKeys)}
                            </div>
                        )
                    }
                    return null
                })}

                {assistPending ? (
                    <div className="flex items-center gap-2 py-2" role="status">
                        <Spinner size={22} />
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('thinking')}</p>
                    </div>
                ) : null}
            </div>

            <div className="shrink-0 pt-1 space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('askLabel')}</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <Input
                        className="flex-1"
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                onSendFree()
                            }
                        }}
                        placeholder={t('askPlaceholder')}
                        disabled={!canUse || assistPending || atQuota}
                    />
                    <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        disabled={!canUse || isCooling || atQuota || !freeText.trim() || assistPending}
                        onClick={onSendFree}
                    >
                        {assistPending && assistIntent === 'free' ? t('sending') : t('send')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
