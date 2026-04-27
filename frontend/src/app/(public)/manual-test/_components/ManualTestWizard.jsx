'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PiArrowRightBold, PiPaperclip, PiTrash, PiX } from 'react-icons/pi'
import Container from '@/components/shared/Container'
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
    isV3State,
} from '@/lib/api/manualTestChecklist'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import {
    WIZARD_STEPS,
    WIZARD_REPORT_SCOPE,
    getWizardStepById,
    getWizardStepIds,
    getWizardStepIndex,
    getNextWizardStepId,
    getPrevWizardStepId,
} from '../simpleConfig'

const DEMO_LOGIN_URL = 'https://rexten.live/auth/demo-login'
const MAX_SCREENSHOTS = 10
/** Лимит как на бэкенде: `max:5120` (КБ) ≈ 5 МБ */
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024

function fileDedupeKey(f) {
    return `${f.name}\0${f.size}\0${f.lastModified}`
}

function openDemoLoginInNewTab(e) {
    if (e.button !== 0) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    window.open(DEMO_LOGIN_URL, '_blank', 'noopener,noreferrer')
}

function trimToNull(s) {
    if (s == null || typeof s !== 'string') return null
    const t = s.trim()
    return t.length ? t : null
}

function createDefaultV3() {
    return {
        v: 3,
        current_step: 'welcome',
        completed_steps: {},
        skipped_steps: {},
        answers: {},
        final: {
            rating: null,
            would: null,
            comment: '',
        },
    }
}

/** Старые id шагов, объединённые в один `business_settings` (v3). */
const LEGACY_BUSINESS_SETTINGS_STEPS = new Set(['business_profile', 'services', 'team', 'settings_rest'])

function mergeV3FromServer(s) {
    const ids = new Set(getWizardStepIds())
    const base = createDefaultV3()
    let current =
        typeof s.current_step === 'string' && ids.has(s.current_step) ? s.current_step : base.current_step
    if (!ids.has(s.current_step) && LEGACY_BUSINESS_SETTINGS_STEPS.has(s.current_step)) {
        current = ids.has('business_settings') ? 'business_settings' : base.current_step
    }

    const completed = { ...base.completed_steps }
    for (const [k, v] of Object.entries(s.completed_steps || {})) {
        if (ids.has(k)) completed[k] = Boolean(v)
    }
    const skipped = { ...base.skipped_steps }
    for (const [k, v] of Object.entries(s.skipped_steps || {})) {
        if (ids.has(k)) skipped[k] = Boolean(v)
    }

    const answers = { ...base.answers }
    for (const id of ids) {
        const raw = s.answers?.[id]
        if (!raw || typeof raw !== 'object') continue
        const def = getWizardStepById(id)
        const tasks = {}
        for (const t of def.tasks) {
            tasks[t.id] = Boolean(raw.tasks?.[t.id])
        }
        answers[id] = {
            tasks,
            sentiment: raw.sentiment ?? null,
            scenario: raw.scenario ?? null,
            rating: raw.rating != null ? Number(raw.rating) : null,
            would: raw.would ?? null,
            comment: typeof raw.comment === 'string' ? raw.comment : '',
        }
    }

    const fin = s.final || {}
    return {
        v: 3,
        current_step: current,
        completed_steps: completed,
        skipped_steps: skipped,
        answers,
        final: {
            rating: fin.rating != null ? Number(fin.rating) : null,
            would: fin.would ?? null,
            comment: typeof fin.comment === 'string' ? fin.comment : '',
        },
    }
}

function ensureStepAnswers(form) {
    const stepId = form.current_step
    const def = getWizardStepById(stepId)
    const out = {
        ...form,
        answers: { ...form.answers },
        final: { ...form.final },
    }

    if (def.id === 'finish') {
        const prev = out.answers.finish || { tasks: {} }
        const tasks = { ...prev.tasks }
        for (const t of def.tasks) {
            if (!(t.id in tasks)) tasks[t.id] = false
        }
        out.answers.finish = { ...prev, tasks }
        return out
    }

    const prev = out.answers[stepId] || { tasks: {} }
    const tasks = { ...prev.tasks }
    for (const t of def.tasks) {
        if (!(t.id in tasks)) tasks[t.id] = false
    }
    out.answers[stepId] = {
        sentiment: prev.sentiment ?? null,
        scenario: prev.scenario ?? null,
        rating: prev.rating ?? null,
        would: prev.would ?? null,
        comment: typeof prev.comment === 'string' ? prev.comment : '',
        tasks,
    }
    return out
}

function toSavePayloadV3(form) {
    const answers = {}
    for (const id of getWizardStepIds()) {
        const def = getWizardStepById(id)
        const src = form.answers[id] || {}
        const tasks = {}
        for (const t of def.tasks) {
            tasks[t.id] = Boolean(src.tasks?.[t.id])
        }
        if (id === 'finish') {
            answers.finish = {
                tasks,
                sentiment: null,
                scenario: null,
                rating: null,
                would: null,
                comment: null,
            }
            continue
        }
        answers[id] = {
            tasks,
            sentiment: src.sentiment ?? null,
            scenario: src.scenario ?? null,
            rating: src.rating ?? null,
            would: src.would ?? null,
            comment: trimToNull(typeof src.comment === 'string' ? src.comment : ''),
        }
    }
    return {
        v: 3,
        current_step: form.current_step,
        completed_steps: form.completed_steps,
        skipped_steps: form.skipped_steps,
        answers,
        final: {
            rating: form.final.rating,
            would: form.final.would,
            comment: trimToNull(typeof form.final.comment === 'string' ? form.final.comment : ''),
        },
    }
}

function buildAppUrl(pathWithQuery) {
    if (typeof window === 'undefined') return pathWithQuery
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    const p = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`
    return `${window.location.origin}${basePath}${p}`
}

function openInternalRoute(pathWithQuery, e) {
    if (e && e.button !== 0) return
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return
    if (e) e.preventDefault()
    window.open(buildAppUrl(pathWithQuery), '_blank', 'noopener,noreferrer')
}

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

function OkProblemRow({ value, onChange, disabled }) {
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
                ОК
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
                Проблема
            </button>
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
                    {files.length ? `Фото ${files.length} / ${MAX_SCREENSHOTS}` : 'До 10 фото, по 5 МБ'}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            const selected = Array.from(e.target.files || [])
                            const tooBig = selected.filter((f) => f.size > MAX_SCREENSHOT_BYTES)
                            if (tooBig.length > 0) {
                                toast.push(
                                    <Notification title="Размер файла" type="warning">
                                        Пропущено {tooBig.length} файл(ов) больше 5 МБ.
                                    </Notification>,
                                )
                            }
                            const withinLimit = selected.filter((f) => f.size <= MAX_SCREENSHOT_BYTES)
                            setFiles((prev) => {
                                const keys = new Set(prev.map(fileDedupeKey))
                                const merged = [...prev]
                                for (const f of withinLimit) {
                                    if (merged.length >= MAX_SCREENSHOTS) break
                                    const k = fileDedupeKey(f)
                                    if (!keys.has(k)) {
                                        keys.add(k)
                                        merged.push(f)
                                    }
                                }
                                return merged
                            })
                            e.target.value = ''
                        }}
                    />
                </label>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500">
                    Можно выбрать несколько файлов сразу или добавлять партиями — до {MAX_SCREENSHOTS} шт.
                </p>
                {files.length > 0 && (
                    <ul className="max-h-32 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                        {files.map((f, i) => (
                            <li key={fileDedupeKey(f)} className="truncate">
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

export default function ManualTestWizard() {
    const tDemo = useTranslations('public.manualTest')
    const reduceMotion = useReducedMotion()
    const { isAuthenticated, authReady } = useAuthStore()
    const userId = useUserStore((s) => s.user?.id)
    const canSync = authReady && isAuthenticated && userId != null
    const queryClient = useQueryClient()

    const [form, setForm] = useState(() => ensureStepAnswers(createDefaultV3()))
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
        if (isV3State(data)) {
            setForm(ensureStepAnswers(mergeV3FromServer(data)))
        } else {
            setForm(ensureStepAnswers(createDefaultV3()))
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
                    await saveManualTestChecklist(toSavePayloadV3(f))
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

    const updateForm = useCallback(
        (updater) => {
            setForm((prev) => {
                const patch = typeof updater === 'function' ? updater(prev) : updater
                const next = ensureStepAnswers(patch)
                scheduleSave(next)
                return next
            })
        },
        [scheduleSave],
    )

    const stepDef = useMemo(() => getWizardStepById(form.current_step), [form.current_step])
    const stepIndex = getWizardStepIndex(form.current_step)
    const totalSteps = WIZARD_STEPS.length
    const progressPct = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0

    const stepReports = useMemo(() => {
        const list = reportsQ.data ?? []
        return list.filter((r) => r.scope === WIZARD_REPORT_SCOPE && r.item_key === form.current_step)
    }, [reportsQ.data, form.current_step])

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

    const submitStepReport = async (payload) => {
        await createReportMut.mutateAsync({
            scope: WIZARD_REPORT_SCOPE,
            itemKey: form.current_step,
            ...payload,
        })
    }

    const goNext = () => {
        const nextId = getNextWizardStepId(form.current_step)
        if (!nextId) return
        updateForm((prev) => ({
            ...prev,
            completed_steps: { ...prev.completed_steps, [prev.current_step]: true },
            current_step: nextId,
        }))
    }

    const goBack = () => {
        const prevId = getPrevWizardStepId(form.current_step)
        if (!prevId) return
        updateForm((prev) => ({
            ...prev,
            current_step: prevId,
        }))
    }

    const goSkip = () => {
        if (form.current_step === 'welcome' || form.current_step === 'finish') return
        const nextId = getNextWizardStepId(form.current_step)
        if (!nextId) return
        updateForm((prev) => {
            const sid = prev.current_step
            const completed = { ...prev.completed_steps }
            delete completed[sid]
            return {
                ...prev,
                completed_steps: completed,
                skipped_steps: { ...prev.skipped_steps, [sid]: true },
                current_step: nextId,
            }
        })
    }

    const markRunComplete = () => {
        updateForm((prev) => ({
            ...prev,
            completed_steps: { ...prev.completed_steps, finish: true },
        }))
        toast.push(
            <Notification title="Готово" type="success">
                Спасибо за прохождение теста.
            </Notification>,
        )
    }

    const patchStepAnswer = (patch) => {
        const sid = form.current_step
        if (sid === 'finish') return
        updateForm((prev) => {
            const cur = prev.answers[sid] || {}
            return {
                ...prev,
                answers: {
                    ...prev.answers,
                    [sid]: { ...cur, ...patch },
                },
            }
        })
    }

    const patchFinal = (patch) => {
        updateForm((prev) => ({
            ...prev,
            final: { ...prev.final, ...patch },
        }))
    }

    const patchTask = (taskId, checked) => {
        const sid = form.current_step
        updateForm((prev) => {
            const next = { ...prev, answers: { ...prev.answers } }
            if (sid === 'finish') {
                const cur = next.answers.finish || { tasks: {} }
                next.answers.finish = {
                    ...cur,
                    tasks: { ...cur.tasks, [taskId]: checked },
                }
            } else {
                const cur = next.answers[sid] || { tasks: {} }
                next.answers[sid] = {
                    ...cur,
                    tasks: { ...cur.tasks, [taskId]: checked },
                }
            }
            return next
        })
    }

    const signInHref = `/sign-in?${REDIRECT_URL_KEY}=${encodeURIComponent('/manual-test')}`

    const fieldClass =
        'w-full resize-y rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:font-normal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

    const motionDuration = reduceMotion ? 0.12 : 0.28
    const slideX = reduceMotion ? 0 : 18

    const currentAnswer = stepDef.id === 'finish' ? {} : form.answers[stepDef.id] || {}
    const finishTasks = form.answers.finish?.tasks || {}

    const renderQuestion = (q) => {
        const disabled = !canSync
        if (stepDef.id === 'finish') {
            if (q.type === 'rating') {
                return (
                    <RatingRow
                        value={form.final.rating}
                        disabled={disabled}
                        onChange={(v) => patchFinal({ rating: v })}
                    />
                )
            }
            if (q.type === 'would') {
                return (
                    <WouldRow
                        value={form.final.would}
                        disabled={disabled}
                        onChange={(v) => patchFinal({ would: v })}
                    />
                )
            }
            if (q.type === 'textarea') {
                return (
                    <textarea
                        value={form.final.comment}
                        onChange={(e) => patchFinal({ comment: e.target.value })}
                        disabled={disabled}
                        rows={4}
                        maxLength={2000}
                        className={fieldClass}
                    />
                )
            }
            return null
        }

        if (q.type === 'sentiment') {
            return (
                <SentimentRow
                    value={currentAnswer.sentiment}
                    disabled={disabled}
                    onChange={(v) => patchStepAnswer({ sentiment: v })}
                />
            )
        }
        if (q.type === 'ok_problem') {
            return (
                <OkProblemRow
                    value={currentAnswer.scenario}
                    disabled={disabled}
                    onChange={(v) => patchStepAnswer({ scenario: v })}
                />
            )
        }
        if (q.type === 'rating') {
            return (
                <RatingRow
                    value={currentAnswer.rating}
                    disabled={disabled}
                    onChange={(v) => patchStepAnswer({ rating: v })}
                />
            )
        }
        if (q.type === 'would') {
            return (
                <WouldRow
                    value={currentAnswer.would}
                    disabled={disabled}
                    onChange={(v) => patchStepAnswer({ would: v })}
                />
            )
        }
        if (q.type === 'textarea') {
            return (
                <textarea
                    value={currentAnswer.comment ?? ''}
                    onChange={(e) => patchStepAnswer({ comment: e.target.value })}
                    disabled={disabled}
                    rows={3}
                    maxLength={2000}
                    className={fieldClass}
                />
            )
        }
        return null
    }

    return (
        <Container className="py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-5 shadow-sm space-y-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Интерактивное ручное тестирование REXTEN
                    </h1>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        Один шаг за раз: открой страницу кабинета в новой вкладке, выполни действия, вернись сюда и отметь
                        результат. Ответы сохраняются в профиле пользователя, под которым ты вошёл на этой странице.
                    </p>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <motion.div
                                className="h-full rounded-full bg-primary"
                                initial={false}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: motionDuration, ease: 'easeOut' }}
                            />
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                            Шаг <span className="text-gray-900 dark:text-gray-100">{stepIndex + 1}</span> из{' '}
                            <span className="text-gray-900 dark:text-gray-100">{totalSteps}</span> —{' '}
                            <span className="text-gray-900 dark:text-gray-100">{progressPct}%</span>
                        </p>
                    </div>
                    <div className="mt-4 space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/40 p-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            Этап 0 — демо-аккаунт REXTEN (по желанию)
                        </h2>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                            Кнопка ниже открывает общую демо-сессию на rexten.live: зайди, осмотри продукт и пойми, что это
                            за платформа. Пройдись по страницам кабинета, потыкай интерфейс, посоздавай, отредактируй и
                            удали записи — делай что угодно, чтобы познакомиться с REXTEN.{' '}
                            <span className="text-gray-900 dark:text-gray-100">
                                Только после этого этапа продолжай по шагам мастера на этой странице
                            </span>{' '}
                            и регистрируй новый аккаунт бизнеса под свой прогон тестирования (шаг «Регистрация бизнеса»).
                        </p>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end">
                        <Button
                            asElement="a"
                            href={DEMO_LOGIN_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="default"
                            size="sm"
                            onClick={openDemoLoginInNewTab}
                        >
                            {tDemo('demoLogin')}
                        </Button>
                    </div>
                </div>

                {!canSync && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4">
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{tDemo('signInPrompt')}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                asElement="a"
                                href={buildAppUrl(signInHref)}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="solid"
                                size="sm"
                            >
                                {tDemo('signIn')}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                    <nav
                        aria-label="Этапы теста"
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-3 lg:sticky lg:top-24 lg:self-start"
                    >
                        <p className="mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">{tDemo('stepsTitle')}</p>
                        <p className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">{tDemo('stepNavHint')}</p>
                        <ol className="space-y-1.5">
                            {WIZARD_STEPS.map((s, i) => {
                                const active = s.id === form.current_step
                                const done = Boolean(form.completed_steps[s.id])
                                const skipped = Boolean(form.skipped_steps[s.id])
                                return (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            aria-current={active ? 'step' : undefined}
                                            onClick={() => {
                                                if (active) return
                                                updateForm((prev) => ({
                                                    ...prev,
                                                    current_step: s.id,
                                                }))
                                            }}
                                            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                                active
                                                    ? 'bg-primary/15 text-primary ring-1 ring-primary/40 cursor-default'
                                                    : `cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 ${
                                                          done
                                                              ? 'text-emerald-700 dark:text-emerald-300'
                                                              : skipped
                                                                ? 'text-amber-700 dark:text-amber-300'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                      }`
                                            }`}
                                        >
                                            <span className="text-gray-900 dark:text-gray-100 tabular-nums">{i + 1}.</span>{' '}
                                            {s.title}
                                        </button>
                                    </li>
                                )
                            })}
                        </ol>
                    </nav>

                    <div className="min-w-0">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={form.current_step}
                                initial={{ opacity: 0, x: slideX }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -slideX }}
                                transition={{ duration: motionDuration, ease: 'easeOut' }}
                                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-5 shadow-sm space-y-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{stepDef.group}</p>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{stepDef.title}</h2>
                                        {stepDef.duration && (
                                            <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
                                                Ориентир по времени:{' '}
                                                <span className="text-gray-900 dark:text-gray-100">{stepDef.duration}</span>
                                            </p>
                                        )}
                                    </div>
                                    {stepDef.route && (
                                        <Button
                                            asElement="a"
                                            href={buildAppUrl(stepDef.route)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            variant="solid"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={(e) => openInternalRoute(stepDef.route, e)}
                                        >
                                            Открыть страницу
                                            <PiArrowRightBold className="ml-1 inline text-base" />
                                        </Button>
                                    )}
                                </div>

                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{stepDef.intro}</p>
                                {stepDef.tabHint && (
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{stepDef.tabHint}</p>
                                )}

                                {stepDef.tasks.length > 0 && (
                                    <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/30 p-4">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Что сделать</h3>
                                        <ul className="space-y-2">
                                            {stepDef.tasks.map((t) => {
                                                const checked =
                                                    stepDef.id === 'finish'
                                                        ? Boolean(finishTasks[t.id])
                                                        : Boolean(currentAnswer.tasks?.[t.id])
                                                return (
                                                    <li key={t.id} className="flex gap-2">
                                                        <label className="flex cursor-pointer gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                                                                checked={checked}
                                                                disabled={!canSync}
                                                                onChange={(e) => patchTask(t.id, e.target.checked)}
                                                            />
                                                            <span>{t.text}</span>
                                                        </label>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )}

                                {stepDef.questions.length > 0 && (
                                    <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Вопросы</h3>
                                        {stepDef.questions.map((q) => (
                                            <div key={q.id} className="space-y-2">
                                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{q.label}</p>
                                                {renderQuestion(q)}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        Заметка и скриншоты к этому шагу
                                    </h3>
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                        Привязка к шагу: <span className="text-gray-900 dark:text-gray-100">{form.current_step}</span>
                                    </p>
                                    {canSync ? (
                                        <ReportForm
                                            title="Новая заметка для шага"
                                            submitting={createReportMut.isPending}
                                            onSubmit={submitStepReport}
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-gray-400">После входа.</p>
                                    )}
                                    {stepReports.length > 0 && (
                                        <div className="space-y-2">
                                            {stepReports.map((r) => (
                                                <ReportCard
                                                    key={r.id}
                                                    report={r}
                                                    deleting={deleteReportMut.isPending}
                                                    onDelete={(id) => deleteReportMut.mutate(id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Button type="button" variant="default" size="sm" disabled={!getPrevWizardStepId(form.current_step)} onClick={goBack}>
                                        Назад
                                    </Button>
                                    <div className="flex flex-wrap gap-2">
                                        {form.current_step !== 'welcome' && form.current_step !== 'finish' && (
                                            <Button type="button" variant="twoTone" size="sm" disabled={!canSync} onClick={goSkip}>
                                                Пропустить шаг
                                            </Button>
                                        )}
                                        {form.current_step === 'welcome' && (
                                            <Button type="button" variant="solid" size="sm" onClick={goNext}>
                                                Начать
                                            </Button>
                                        )}
                                        {form.current_step !== 'welcome' && form.current_step !== 'finish' && (
                                            <Button type="button" variant="solid" size="sm" onClick={goNext} disabled={!getNextWizardStepId(form.current_step)}>
                                                Далее
                                            </Button>
                                        )}
                                        {form.current_step === 'finish' && (
                                            <Button type="button" variant="solid" size="sm" disabled={!canSync} onClick={markRunComplete}>
                                                Завершить тестирование
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {form.completed_steps.finish && (
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                        Ты отметил(а) завершение прогона. При необходимости вернись к шагам выше или обнови ответы —
                                        они продолжают сохраняться.
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {canSync && checklistQ.isError && (
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">Не удалось загрузить сохранённый прогресс.</p>
                )}
            </div>
        </Container>
    )
}
