'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PiPaperclip, PiTrash, PiX, PiArrowDownBold } from 'react-icons/pi'
import Container from '@/components/shared/Container'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { REDIRECT_URL_KEY } from '@/constants/app.constant'
import useAuthStore from '@/store/authStore'
import { useUserStore } from '@/store'
import {
    fetchManualTestChecklist,
    saveManualTestChecklist,
    fetchManualTestReports,
    createManualTestReport,
    deleteManualTestReport,
    isV2State,
} from '@/lib/api/manualTestChecklist'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { SCOPE_OPTIONS, STEP_LIST, getStepIdsForScope } from './simpleConfig'

function normalizeScope(v) {
    if (v === 'dashboard' || v === 'schedule') return v
    // Старые сохранения с объединённым scope — в UI только два варианта
    if (v === 'both') return 'dashboard'
    return 'dashboard'
}

function trimToNull(s) {
    if (s == null || typeof s !== 'string') return null
    const t = s.trim()
    return t.length ? t : null
}

function buildEmptyStepRecord(scope) {
    const o = {}
    for (const id of getStepIdsForScope(scope)) {
        o[id] = false
    }
    return o
}

function createDefaultForm(scope0) {
    const scope = normalizeScope(scope0)
    return {
        v: 2,
        scope,
        look_s: null,
        look_t: '',
        clarity_s: null,
        clarity_t: '',
        step: buildEmptyStepRecord(scope),
        scenario: null,
        scenario_t: '',
        filter: null,
        filter_t: '',
        rating: null,
        would: null,
        why: '',
    }
}

function mergeV2FromServer(server) {
    const scope = normalizeScope(server.scope)
    const base = createDefaultForm(scope)
    const step = { ...base.step }
    const ids = getStepIdsForScope(scope)
    for (const id of ids) {
        if (server.step && typeof server.step === 'object' && id in server.step) {
            step[id] = Boolean(server.step[id])
        }
    }
    return {
        v: 2,
        scope,
        look_s: server.look_s ?? null,
        look_t: server.look_t ?? '',
        clarity_s: server.clarity_s ?? null,
        clarity_t: server.clarity_t ?? '',
        step,
        scenario: server.scenario ?? null,
        scenario_t: server.scenario_t ?? '',
        filter: server.filter ?? null,
        filter_t: server.filter_t ?? '',
        rating: server.rating != null ? Number(server.rating) : null,
        would: server.would ?? null,
        why: server.why ?? '',
    }
}

function toSavePayload(form) {
    const step = {}
    for (const id of getStepIdsForScope(form.scope)) {
        step[id] = Boolean(form.step[id])
    }
    const isDash = form.scope === 'dashboard'
    return {
        v: 2,
        scope: form.scope,
        look_s: form.look_s,
        look_t: trimToNull(form.look_t),
        clarity_s: form.clarity_s,
        clarity_t: trimToNull(form.clarity_t),
        step,
        scenario: form.scenario,
        scenario_t: trimToNull(form.scenario_t),
        filter: isDash ? null : form.filter,
        filter_t: isDash ? null : trimToNull(form.filter_t),
        rating: form.rating,
        would: form.would,
        why: trimToNull(form.why),
    }
}

const MAX_SCREENSHOTS = 10

function SentimentRow({ value, onChange, disabled }) {
    const opts = [
        { v: 'like', icon: '👍', label: 'Нравится' },
        { v: 'neutral', icon: '😐', label: 'Норм' },
        { v: 'bad', icon: '👎', label: 'Плохо' },
    ]
    const base =
        'inline-flex flex-1 min-w-[5.5rem] items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-bold transition-colors sm:min-w-0 sm:px-3'
    return (
        <div className="flex flex-wrap gap-2">
            {opts.map((o) => {
                const on = value === o.v
                return (
                    <button
                        key={o.v}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(on ? null : o.v)}
                        className={`${base} ${
                            on
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:border-primary/50'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="text-base leading-none" aria-hidden>
                            {o.icon}
                        </span>
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}

function OkProblemRow({ value, onChange, disabled, okLabel = 'ОК', problemLabel = 'Проблема' }) {
    const base =
        'inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors'
    const isOk = value === 'ok'
    const isProblem = value === 'problem'
    return (
        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(isOk ? null : 'ok')}
                className={`${base} ${
                    isOk
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
                }`}
            >
                {okLabel}
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(isProblem ? null : 'problem')}
                className={`${base} ${
                    isProblem
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
                }`}
            >
                {problemLabel}
            </button>
        </div>
    )
}

function FilterRow({ value, onChange, disabled }) {
    const base =
        'inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3'
    const opts = [
        { v: 'ok', label: 'ОК' },
        { v: 'skip', label: 'Пропустил' },
        { v: 'problem', label: 'Проблема' },
    ]
    return (
        <div className="flex flex-wrap gap-2">
            {opts.map((o) => {
                const on = value === o.v
                return (
                    <button
                        key={o.v}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(on ? null : o.v)}
                        className={`${base} ${
                            on
                                ? o.v === 'problem'
                                    ? 'border-amber-500 bg-amber-500 text-white'
                                    : 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}

function WouldRow({ value, onChange, disabled }) {
    const base =
        'inline-flex flex-1 min-w-[6rem] items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors sm:min-w-0 sm:px-3'
    const opts = [
        { v: 'yes', label: 'Да' },
        { v: 'no', label: 'Нет' },
        { v: 'unsure', label: 'Не уверен' },
    ]
    return (
        <div className="flex flex-wrap gap-2">
            {opts.map((o) => {
                const on = value === o.v
                return (
                    <button
                        key={o.v}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(on ? null : o.v)}
                        className={`${base} ${
                            on
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {o.label}
                    </button>
                )
            })}
        </div>
    )
}

function RatingRow({ value, onChange, disabled }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
                const on = value === n
                return (
                    <button
                        key={n}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(on ? null : n)}
                        className={`min-w-[2.5rem] rounded-lg border px-2.5 py-1.5 text-sm font-bold tabular-nums transition-colors ${
                            on
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-200'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {n}
                    </button>
                )
            })}
        </div>
    )
}

function ReportForm({ title, onSubmit, submitting, onCancel, initialComment = '' }) {
    const [comment, setComment] = useState(initialComment)
    const [files, setFiles] = useState([])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!comment.trim() && (!files || files.length === 0)) {
            toast.push(
                <Notification title="Пусто" type="warning">
                    Напиши пару слов или прикрепи фото.
                </Notification>,
            )
            return
        }
        await onSubmit({ comment: comment.trim() || null, screenshots: files.length ? files : null })
        setComment('')
        setFiles([])
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4"
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Закрыть"
                    >
                        <PiX className="text-lg" />
                    </button>
                )}
            </div>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Всё, что хочется добавить. Можно коротко."
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-100 placeholder:text-gray-400 placeholder:font-normal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex flex-col gap-2">
                <label className="inline-flex w-max cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary">
                    <PiPaperclip />
                    {files.length
                        ? `Фото ${files.length} / ${MAX_SCREENSHOTS}`
                        : 'До 10 фото, по 5 МБ'}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            const picked = Array.from(e.target.files || []).slice(0, MAX_SCREENSHOTS)
                            setFiles(picked)
                        }}
                    />
                </label>
                {files.length > 0 && (
                    <ul className="max-h-32 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                        {files.map((f, i) => (
                            <li key={`${f.name}-${i}`} className="truncate">
                                {i + 1}. {f.name}
                            </li>
                        ))}
                    </ul>
                )}
                {files.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setFiles([])}
                        className="w-max text-xs font-bold text-gray-500 hover:text-red-500"
                    >
                        Сбросить фото
                    </button>
                )}
                <div className="flex items-center justify-end">
                    <Button type="submit" variant="solid" size="sm" loading={submitting}>
                        Отправить
                    </Button>
                </div>
            </div>
        </form>
    )
}

function ReportCard({ report, onDelete, deleting }) {
    const imageUrls =
        Array.isArray(report.screenshot_urls) && report.screenshot_urls.length > 0
            ? report.screenshot_urls
            : report.screenshot_url
              ? [report.screenshot_url]
              : []
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    {report.comment && (
                        <p className="whitespace-pre-wrap text-sm font-bold text-gray-700 dark:text-gray-200">
                            {report.comment}
                        </p>
                    )}
                    {imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {imageUrls.map((url, i) => (
                                <a
                                    key={url + i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                >
                                    <img
                                        src={url}
                                        alt={`Скриншот ${i + 1}`}
                                        className="max-h-40 max-w-[12rem] rounded-lg border border-gray-200 dark:border-gray-700 object-contain"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                    {report.created_at && (
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500">
                            {new Date(report.created_at).toLocaleString('ru-RU')}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => onDelete(report.id)}
                    disabled={deleting}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                    aria-label="Удалить"
                    title="Удалить"
                >
                    <PiTrash className="text-lg" />
                </button>
            </div>
        </div>
    )
}

export default function ManualTestPage() {
    const { isAuthenticated, authReady } = useAuthStore()
    const userId = useUserStore((s) => s.user?.id)
    const canSync = authReady && isAuthenticated && userId != null
    const queryClient = useQueryClient()

    const [form, setForm] = useState(() => createDefaultForm('dashboard'))
    const saveTimerRef = useRef(null)
    const pendingRef = useRef(null)

    const checklistQ = useQuery({
        queryKey: ['manual-test-checklist', userId],
        queryFn: fetchManualTestChecklist,
        enabled: canSync,
        staleTime: Infinity,
    })

    const reportsQ = useQuery({
        queryKey: ['manual-test-reports', userId],
        queryFn: fetchManualTestReports,
        enabled: canSync,
        staleTime: 30_000,
    })

    useEffect(() => {
        if (!canSync || checklistQ.status !== 'success') return
        const data = checklistQ.data
        if (!data) {
            setForm(createDefaultForm('dashboard'))
        } else if (isV2State(data)) {
            setForm(mergeV2FromServer(data))
        } else {
            setForm(createDefaultForm(data.scope))
        }
    }, [canSync, checklistQ.status, checklistQ.data])

    const scheduleSave = useCallback(
        (nextForm) => {
            if (!canSync) return
            pendingRef.current = nextForm
            if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
            saveTimerRef.current = window.setTimeout(async () => {
                const f = pendingRef.current
                if (!f) return
                try {
                    await saveManualTestChecklist(toSavePayload(f))
                } catch {
                    toast.push(
                        <Notification title="Не сохранилось" type="danger">
                            Проверьте интернет и попробуйте снова.
                        </Notification>,
                    )
                }
            }, 600)
        },
        [canSync],
    )

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
        }
    }, [])

    const patchForm = (patch) => {
        setForm((prev) => {
            const next = { ...prev, ...patch }
            scheduleSave(next)
            return next
        })
    }

    const handleScopeChange = (opt) => {
        if (!opt || !canSync) return
        const v = normalizeScope(opt.value)
        setForm((prev) => {
            const step = buildEmptyStepRecord(v)
            for (const id of getStepIdsForScope(v)) {
                if (prev.step && id in prev.step) step[id] = prev.step[id]
            }
            const next = {
                ...prev,
                scope: v,
                step,
            }
            if (v === 'dashboard') {
                next.filter = null
                next.filter_t = ''
            }
            scheduleSave({ ...next })
            return next
        })
    }

    const createReportMut = useMutation({
        mutationFn: createManualTestReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manual-test-reports', userId] })
            toast.push(
                <Notification title="Сохранено" type="success">
                    Отправлено.
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Попробуйте снова. Фото — до 5 МБ.
                </Notification>,
            )
        },
    })

    const deleteReportMut = useMutation({
        mutationFn: deleteManualTestReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manual-test-reports', userId] })
        },
    })

    const stepsForScope = STEP_LIST[form.scope] || STEP_LIST.dashboard
    const showFilter = form.scope === 'schedule'

    const reports = reportsQ.data ?? []
    const freeNotes = useMemo(
        () => reports.filter((r) => r.item_key == null || r.item_key === ''),
        [reports],
    )

    const signInHref = `/sign-in?${REDIRECT_URL_KEY}=${encodeURIComponent('/manual-test')}`

    const submitFreeNote = async (payload) => {
        await createReportMut.mutateAsync({
            scope: form.scope,
            itemKey: null,
            ...payload,
        })
    }

    const fieldClass =
        'w-full resize-y rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:font-normal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

    return (
        <Container className="py-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-5 shadow-sm space-y-2">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Быстрая проверка кабинета REXTEN
                    </h1>
                    <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                        <span className="text-gray-900 dark:text-gray-100">Проект.</span> REXTEN — маркетплейс услуг с онлайн-бронированием:
                        клиент ищет услугу на сайте, бизнес ведёт записи, сотрудников и расписание в кабинете. Эта страница — только анкета
                        для теста; сам кабинет открывай отдельно. Смотри{' '}
                        <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs font-mono text-gray-900 dark:text-gray-100">
                            /business/dashboard
                        </code>{' '}
                        (обзор) и{' '}
                        <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs font-mono text-gray-900 dark:text-gray-100">
                            /business/schedule
                        </code>{' '}
                        (календарь), не публичный каталог.
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        <span className="text-gray-900 dark:text-gray-100">Как тестировать.</span> Войди под тем же пользователем, что и в
                        кабинете — ответы сохраняются в аккаунте. Держи кабинет во вкладке рядом: выбери «что смотрим», пройди блоки и шаги
                        как владелец или менеджер. Если без подсказки непонятно, куда жать или что произошло после сохранения — отметь и
                        кратко опиши; скрин сильно помогает.
                    </p>
                </div>

                {!canSync && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4">
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                            Войдите, чтобы ответы сохранялись.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={signInHref}>
                                <Button variant="solid" size="sm">
                                    Войти
                                </Button>
                            </Link>
                            <Link href="/business/sign-in">
                                <Button variant="default" size="sm">
                                    Вход в кабинет бизнеса
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                    <p className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">Что смотрим</p>
                    <Select
                        isSearchable={false}
                        value={SCOPE_OPTIONS.find((o) => o.value === form.scope)}
                        options={SCOPE_OPTIONS}
                        onChange={handleScopeChange}
                        isDisabled={!canSync}
                    />
                </div>

                {/* 1) Первое впечатление */}
                <section className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">1) Первое впечатление</h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Удобно смотреть? Ничего не режет глаз и не раздражает?
                    </p>
                    <SentimentRow
                        value={form.look_s}
                        disabled={!canSync}
                        onChange={(v) => patchForm({ look_s: v })}
                    />
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1.5">Комментарий (по желанию)</p>
                        <textarea
                            value={form.look_t}
                            onChange={(e) => patchForm({ look_t: e.target.value })}
                            disabled={!canSync}
                            rows={2}
                            maxLength={2000}
                            placeholder="Можно одной фразой"
                            className={fieldClass}
                        />
                    </div>
                </section>

                {/* 2) Понятность действий */}
                <section className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">2) Понятность действий</h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Не потерялся? Подписи и кнопки вели туда, куда ожидал?
                    </p>
                    <SentimentRow
                        value={form.clarity_s}
                        disabled={!canSync}
                        onChange={(v) => patchForm({ clarity_s: v })}
                    />
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1.5">Что было непонятно (если было)</p>
                        <textarea
                            value={form.clarity_t}
                            onChange={(e) => patchForm({ clarity_t: e.target.value })}
                            disabled={!canSync}
                            rows={2}
                            maxLength={2000}
                            placeholder="Коротко: что смущало"
                            className={fieldClass}
                        />
                    </div>
                </section>

                {/* 3) Реальный сценарий */}
                <section className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">3) Реальный сценарий</h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Реши задачу по списку и отметь «Сделал» там, где успел. Потом ответь: получилось как задумано или была проблема.
                    </p>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        <span className="text-gray-900 dark:text-gray-100">Про запись и бронь.</span> Если в шаге нужно создать запись или
                        бронь — пройди <span className="text-gray-900 dark:text-gray-100">все</span> шаги мастера/формы,{' '}
                        <span className="text-gray-900 dark:text-gray-100">заполни обязательные поля</span> (как при реальном клиенте), доведи
                        до <span className="text-gray-900 dark:text-gray-100">сохранения</span>. После сохранения обязательно{' '}
                        <span className="text-gray-900 dark:text-gray-100">проверь</span>: запись на месте в сетке, данные в панели совпадают, нет
                        пустых мест там, где их заполнял.
                    </p>
                    <ol className="list-decimal space-y-2 pl-5 text-sm font-bold text-gray-900 dark:text-gray-100">
                        {stepsForScope.map((s) => (
                            <li key={s.id} className="pl-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 pr-2">{s.line}</span>
                                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={Boolean(form.step[s.id])}
                                            disabled={!canSync}
                                            onChange={(e) => {
                                                const on = e.target.checked
                                                setForm((prev) => {
                                                    const next = {
                                                        ...prev,
                                                        step: { ...prev.step, [s.id]: on },
                                                    }
                                                    scheduleSave(next)
                                                    return next
                                                })
                                            }}
                                        />
                                        Сделал
                                    </label>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Получилось, как в списке?</p>
                        <OkProblemRow
                            value={form.scenario}
                            disabled={!canSync}
                            onChange={(v) => patchForm({ scenario: v })}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1.5">Если проблема — что пошло не так</p>
                        <textarea
                            value={form.scenario_t}
                            onChange={(e) => patchForm({ scenario_t: e.target.value })}
                            disabled={!canSync}
                            rows={2}
                            maxLength={2000}
                            placeholder="Коротко: на каком шаге застрял или что не так"
                            className={fieldClass}
                        />
                    </div>
                </section>

                {showFilter && (
                    <section className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Фильтр (сотрудники / ресурсы)</h2>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            Слева в расписании: удобно ли переключать, понятно ли, что показывает сетка. Один сотрудник в бизнесе — нажми
                            «Пропустил».
                        </p>
                        <FilterRow
                            value={form.filter}
                            disabled={!canSync}
                            onChange={(v) => patchForm({ filter: v })}
                        />
                        <div>
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1.5">Если проблема — уточни</p>
                            <textarea
                                value={form.filter_t}
                                onChange={(e) => patchForm({ filter_t: e.target.value })}
                                disabled={!canSync}
                                rows={2}
                                maxLength={2000}
                                className={fieldClass}
                            />
                        </div>
                    </section>
                )}

                <section className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Общая оценка</h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        От <span className="text-gray-900 dark:text-gray-100">1</span> (плохо) до{' '}
                        <span className="text-gray-900 dark:text-gray-100">5</span> (отлично) — выбранный выше фрагмент кабинета.
                    </p>
                    <RatingRow
                        value={form.rating}
                        disabled={!canSync}
                        onChange={(v) => patchForm({ rating: v })}
                    />
                </section>

                <section className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Можно ли этим пользоваться каждый день?</h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Представь, что этот экран — твой основной рабочий инструмент на неделю вперёд.
                    </p>
                    <WouldRow
                        value={form.would}
                        disabled={!canSync}
                        onChange={(v) => patchForm({ would: v })}
                    />
                    <div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1.5">Почему?</p>
                        <textarea
                            value={form.why}
                            onChange={(e) => patchForm({ why: e.target.value })}
                            disabled={!canSync}
                            rows={3}
                            maxLength={2000}
                            placeholder="Честно, как есть"
                            className={fieldClass}
                        />
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Свободная заметка и скриншоты</h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        То, что не влезло выше: баги, мелочи, пожелания. Скрин сильно помогает. <PiArrowDownBold className="ml-1 inline" />
                    </p>
                    {canSync ? (
                        <ReportForm
                            title="Новая заметка"
                            submitting={createReportMut.isPending}
                            onSubmit={submitFreeNote}
                        />
                    ) : (
                        <p className="text-sm font-bold text-gray-400">После входа.</p>
                    )}
                    {freeNotes.length > 0 && (
                        <div className="space-y-2">
                            {freeNotes.map((r) => (
                                <ReportCard
                                    key={r.id}
                                    report={r}
                                    deleting={deleteReportMut.isPending}
                                    onDelete={(id) => deleteReportMut.mutate(id)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </Container>
    )
}
