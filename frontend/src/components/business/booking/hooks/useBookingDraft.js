'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const KEY_PREFIX = 'rexten:booking-draft'
const TTL_MS = 24 * 60 * 60 * 1000

function buildKey(scope, companyId) {
    return `${KEY_PREFIX}:${scope}:${companyId || 'anon'}`
}

function safeRead(key) {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        if (!parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
            window.localStorage.removeItem(key)
            return null
        }
        return parsed
    } catch (_e) {
        return null
    }
}

function safeWrite(key, payload) {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(
            key,
            JSON.stringify({ savedAt: Date.now(), data: payload }),
        )
    } catch (_e) {
        // localStorage могут быть отключены — игнорируем
    }
}

function safeRemove(key) {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.removeItem(key)
    } catch (_e) {
        /* noop */
    }
}

/**
 * Простой draft-storage в localStorage с дебаунсом 500мс и TTL 24ч.
 * Используется в NewBookingWizard, чтобы не терять прогресс при случайном закрытии.
 *
 * @param {string} scope — например 'new-booking' или 'block-time'
 * @param {string|number|null|undefined} companyId
 */
export function useBookingDraft(scope, companyId) {
    const key = buildKey(scope, companyId)
    const [hasDraft, setHasDraft] = useState(() => Boolean(safeRead(key)))
    const timerRef = useRef(null)

    useEffect(() => {
        setHasDraft(Boolean(safeRead(key)))
    }, [key])

    const saveDraft = useCallback(
        (data) => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                safeWrite(key, data)
                setHasDraft(true)
            }, 500)
        },
        [key],
    )

    const loadDraft = useCallback(() => {
        const stored = safeRead(key)
        return stored ? { data: stored.data, savedAt: stored.savedAt } : null
    }, [key])

    const clearDraft = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        safeRemove(key)
        setHasDraft(false)
    }, [key])

    /** Сохранить сразу (без дебаунса), например перед закрытием дравера. */
    const flushDraft = useCallback(
        (data) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            if (data != null) {
                safeWrite(key, data)
                setHasDraft(true)
            }
        },
        [key],
    )

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    return useMemo(
        () => ({ hasDraft, saveDraft, loadDraft, clearDraft, flushDraft }),
        [hasDraft, saveDraft, loadDraft, clearDraft, flushDraft],
    )
}

export default useBookingDraft
