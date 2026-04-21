'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useVerifyEmailCode, useResendEmailCode } from '@/hooks/api/useAuth'
import { BUSINESS_OWNER } from '@/constants/roles.constant'
import classNames from '@/utils/classNames'
import AuthPageLogo from '@/components/auth/AuthPageLogo'

const PENDING_BUSINESS_PROFILE_KEY = 'rexten_pending_business_profile'
const OTP_LEN = 6

const emptyCells = () => Array.from({ length: OTP_LEN }, () => '')

function digitsOnly(v) {
    return String(v ?? '').replace(/\D/g, '')
}

export default function VerifyCodeClient() {
    const searchParams = useSearchParams()
    const initialEmail = useMemo(() => {
        const raw = searchParams.get('email') || ''
        try {
            return decodeURIComponent(raw)
        } catch {
            return raw
        }
    }, [searchParams])

    /** Email из ссылки (?email=…) — не даём менять, чтобы не путать с верификацией другого аккаунта */
    const emailFromUrl = useMemo(() => initialEmail.trim().length > 0, [initialEmail])

    const [email, setEmail] = useState(initialEmail)
    const [cells, setCells] = useState(emptyCells)
    const t = useTranslations('auth.verifyCode')
    const locale = useLocale()
    const verifyMutation = useVerifyEmailCode()
    const resendMutation = useResendEmailCode()
    const [resendSeconds, setResendSeconds] = useState(0)
    const autoSubmitKeyRef = useRef('')
    const inputRefs = useRef([])

    const code = useMemo(() => cells.join(''), [cells])

    useEffect(() => {
        setEmail(initialEmail)
        setCells(emptyCells())
        autoSubmitKeyRef.current = ''
    }, [initialEmail])

    useEffect(() => {
        if (resendSeconds <= 0) return undefined
        const id = setInterval(() => {
            setResendSeconds((s) => Math.max(0, s - 1))
        }, 1000)
        return () => clearInterval(id)
    }, [resendSeconds])

    const applyBusinessDraft = useCallback(async () => {
        if (typeof window === 'undefined') return
        const raw = sessionStorage.getItem(PENDING_BUSINESS_PROFILE_KEY)
        if (!raw) return
        let draft
        try {
            draft = JSON.parse(raw)
        } catch {
            sessionStorage.removeItem(PENDING_BUSINESS_PROFILE_KEY)
            return
        }
        if (!draft || typeof draft !== 'object') {
            sessionStorage.removeItem(PENDING_BUSINESS_PROFILE_KEY)
            return
        }
        try {
            const LaravelAxios = (await import('@/services/axios/LaravelAxios')).default
            await LaravelAxios.put('/business/settings/profile', draft)
        } catch {
            toast.push(
                <Notification title={t('errors.generic')} type="warning" width={340}>
                    {t('errors.generic')}
                </Notification>,
                { placement: 'top-end', offsetY: 30, offsetX: 30 },
            )
        } finally {
            sessionStorage.removeItem(PENDING_BUSINESS_PROFILE_KEY)
        }
    }, [t])

    const onVerified = useCallback(
        async (data) => {
            toast.push(
                <Notification title={t('toastVerifiedTitle')} type="success" width={340}>
                    {t('toastVerifiedDescription')}
                </Notification>,
                { placement: 'top-end', offsetY: 30, offsetX: 30 },
            )
            if (data?.user?.role === BUSINESS_OWNER) {
                await applyBusinessDraft()
            }
        },
        [applyBusinessDraft, t],
    )

    const runVerify = useCallback(
        (em, c) => {
            verifyMutation.mutate(
                { email: em, code: c },
                {
                    onSuccess: onVerified,
                },
            )
        },
        [onVerified, verifyMutation],
    )

    const onSubmit = useCallback(() => {
        const em = email.trim()
        if (!em) {
            toast.push(
                <Notification title={t('errors.emailRequired')} type="warning" width={320} />,
                { placement: 'top-end', offsetY: 30, offsetX: 30 },
            )
            return
        }
        const c = digitsOnly(code).slice(0, OTP_LEN)
        if (c.length !== OTP_LEN) {
            toast.push(
                <Notification title={t('errors.invalid')} type="warning" width={320} />,
                { placement: 'top-end', offsetY: 30, offsetX: 30 },
            )
            return
        }
        runVerify(em, c)
    }, [code, email, runVerify, t])

    useEffect(() => {
        const em = email.trim()
        const c = digitsOnly(code).slice(0, OTP_LEN)
        if (c.length !== OTP_LEN || !em || verifyMutation.isPending) return undefined
        const key = `${em}:${c}`
        if (autoSubmitKeyRef.current === key) return undefined
        autoSubmitKeyRef.current = key
        const id = setTimeout(() => runVerify(em, c), 200)
        return () => clearTimeout(id)
    }, [code, email, runVerify, verifyMutation.isPending])

    useEffect(() => {
        if (digitsOnly(code).length < OTP_LEN) {
            autoSubmitKeyRef.current = ''
        }
    }, [code])

    const focusCell = (index) => {
        const el = inputRefs.current[index]
        if (el) {
            el.focus()
            el.select()
        }
    }

    const setCell = (index, digit) => {
        const d = digit ? digit.slice(-1) : ''
        setCells((prev) => {
            const next = [...prev]
            next[index] = d
            return next
        })
        if (d && index < OTP_LEN - 1) {
            requestAnimationFrame(() => focusCell(index + 1))
        }
    }

    const handleCellChange = (index, e) => {
        const raw = digitsOnly(e.target.value)
        if (raw.length > 1) {
            const filled = raw.slice(0, OTP_LEN).split('')
            setCells((prev) => {
                const next = [...prev]
                for (let i = 0; i < OTP_LEN; i++) {
                    next[i] = filled[i] ?? ''
                }
                return next
            })
            const nextFocus = Math.min(filled.length, OTP_LEN - 1)
            requestAnimationFrame(() => focusCell(nextFocus))
            return
        }
        setCell(index, raw)
    }

    const handleCellKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (cells[index]) {
                return
            }
            e.preventDefault()
            if (index > 0) {
                setCells((prev) => {
                    const next = [...prev]
                    next[index - 1] = ''
                    return next
                })
                focusCell(index - 1)
            }
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault()
            focusCell(index - 1)
        }
        if (e.key === 'ArrowRight' && index < OTP_LEN - 1) {
            e.preventDefault()
            focusCell(index + 1)
        }
    }

    const handleOtpPaste = (e) => {
        const text = digitsOnly(e.clipboardData.getData('text'))
        if (!text) return
        e.preventDefault()
        const filled = text.slice(0, OTP_LEN).split('')
        setCells(() => {
            const next = emptyCells()
            for (let i = 0; i < OTP_LEN; i++) {
                next[i] = filled[i] ?? ''
            }
            return next
        })
        const nextFocus = Math.min(filled.length, OTP_LEN - 1)
        requestAnimationFrame(() => focusCell(nextFocus))
    }

    const onResend = () => {
        const em = email.trim()
        if (!em) {
            toast.push(
                <Notification title={t('errors.emailRequired')} type="warning" width={320} />,
                { placement: 'top-end', offsetY: 30, offsetX: 30 },
            )
            return
        }
        resendMutation.mutate(
            { email: em, locale },
            {
                onSuccess: () => {
                    setResendSeconds(60)
                    toast.push(
                        <Notification title={t('toastResentTitle')} type="success" width={340}>
                            {t('toastResentDescription')}
                        </Notification>,
                        { placement: 'top-end', offsetY: 30, offsetX: 30 },
                    )
                },
                onError: (err) => {
                    const status = err?.response?.status
                    const apiCode = err?.response?.data?.code
                    const wait = Number(err?.response?.data?.wait_seconds)
                    if (status === 429 && apiCode === 'resend_cooldown' && wait > 0) {
                        setResendSeconds(wait)
                    }
                    let msg = t('errors.generic')
                    if (apiCode === 'resend_cooldown') msg = t('errors.resendCooldown')
                    if (apiCode === 'hourly_limit') msg = t('errors.hourlyLimit')
                    if (apiCode === 'mail_failed' || status === 503) msg = t('errors.mailFailed')
                    toast.push(
                        <Notification title={t('errors.generic')} type="danger" width={340}>
                            {msg}
                        </Notification>,
                        { placement: 'top-end', offsetY: 30, offsetX: 30 },
                    )
                },
            },
        )
    }

    return (
        <div className="mx-auto w-full max-w-xl px-1">
            <AuthPageLogo className="mb-6" />
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/40 sm:p-8">
                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                    {t('title')}
                </h3>
                <p className="mb-8 text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                    {t('subtitle')}
                </p>

                <div className="mb-6">
                    <label className="mb-2 block text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('emailLabel')}
                    </label>
                    <Input
                        type="email"
                        readOnly={emailFromUrl}
                        autoComplete="email"
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={emailFromUrl ? undefined : (e) => setEmail(e.target.value)}
                        className={classNames(
                            'text-sm font-bold text-gray-900 dark:text-gray-100',
                            emailFromUrl &&
                                'cursor-default bg-gray-100 dark:bg-gray-800/70 focus:ring-0',
                        )}
                    />
                </div>

                <div className="mb-2">
                    <label className="mb-3 block text-sm font-bold text-gray-500 dark:text-gray-400">
                        {t('codeLabel')}
                    </label>
                    <div
                        role="group"
                        aria-label={t('codeLabel')}
                        className="grid w-full grid-cols-6 gap-1.5 sm:gap-2"
                        onPaste={handleOtpPaste}
                    >
                        {cells.map((ch, i) => (
                            <input
                                key={i}
                                ref={(el) => {
                                    inputRefs.current[i] = el
                                }}
                                type="text"
                                inputMode="numeric"
                                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                maxLength={OTP_LEN}
                                value={ch}
                                aria-label={t('digitAria', { n: i + 1 })}
                                className={classNames(
                                    'aspect-square w-full min-h-0 min-w-0 rounded-lg border-2 bg-white text-center text-base font-bold tabular-nums',
                                    'text-gray-900 outline-none transition sm:rounded-xl sm:text-xl',
                                    'border-gray-200 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100',
                                    'focus:border-primary focus:ring-2 focus:ring-primary/25 dark:focus:border-primary',
                                )}
                                onChange={(e) => handleCellChange(i, e)}
                                onKeyDown={(e) => handleCellKeyDown(i, e)}
                                onFocus={(e) => e.target.select()}
                            />
                        ))}
                    </div>
                    <p className="mt-3 text-xs font-bold text-gray-500 dark:text-gray-400">{t('codeHint')}</p>
                </div>

                {verifyMutation.isError ? (
                    <p className="mb-4 text-sm font-bold text-red-600 dark:text-red-400">
                        {(() => {
                            const apiCode = verifyMutation.error?.code
                            const map = {
                                invalid_code: 'invalid',
                                invalid_format: 'invalid',
                                expired: 'expired',
                                too_many_attempts: 'tooManyAttempts',
                                already_verified: 'alreadyVerified',
                            }
                            const key = map[apiCode]
                            return key ? t(`errors.${key}`) : verifyMutation.error?.message || t('errors.generic')
                        })()}
                    </p>
                ) : null}

                <div className="flex flex-col gap-3">
                    <Button
                        type="button"
                        variant="solid"
                        className="w-full justify-center sm:w-auto sm:min-w-[200px]"
                        loading={verifyMutation.isPending}
                        disabled={verifyMutation.isPending}
                        onClick={onSubmit}
                    >
                        {verifyMutation.isPending ? t('submitting') : t('submit')}
                    </Button>
                    <Button
                        type="button"
                        variant="plain"
                        className="justify-center sm:justify-start"
                        disabled={resendMutation.isPending || resendSeconds > 0}
                        onClick={onResend}
                    >
                        {resendSeconds > 0 ? t('resendWait', { seconds: resendSeconds }) : t('resend')}
                    </Button>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                    <Link href="/sign-in" className="text-sm font-bold text-primary hover:underline">
                        {t('backToSignIn')}
                    </Link>
                </div>
            </div>
        </div>
    )
}
