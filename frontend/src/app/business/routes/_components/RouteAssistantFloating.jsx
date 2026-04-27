'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PiChatCircle, PiX } from 'react-icons/pi'
import RouteAssistantPanel from './RouteAssistantPanel'

const STORAGE_KEY = 'rexten_route_assistant_fab_rb'
const PAD = 12
const DRAG_THRESHOLD = 6

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n))
}

/**
 * @param {HTMLElement} layoutEl
 * @param {HTMLElement} wrapEl
 * @param {{ right: number, bottom: number }} rb
 */
function clampRbToLayout(layoutEl, wrapEl, rb) {
    const maxR = Math.max(PAD, layoutEl.offsetWidth - wrapEl.offsetWidth - PAD)
    const maxB = Math.max(PAD, layoutEl.offsetHeight - wrapEl.offsetHeight - PAD)
    return {
        right: clamp(rb.right, PAD, maxR),
        bottom: clamp(rb.bottom, PAD, maxB),
    }
}

/**
 * Плавающий диспетчер (xl+): вне overflow карты, привязка к блоку маршрута, перетаскивание, «AI» на кнопке.
 *
 * @param {{
 *   layoutRef: React.RefObject<HTMLElement | null>
 *   specialistId: number | null
 *   date: string
 *   displayTimezone?: string | null
 *   onOpenBooking?: (bookingId: number) => void
 *   canManageRoutes?: boolean
 * }} props
 */
export default function RouteAssistantFloating({
    layoutRef,
    specialistId,
    date,
    displayTimezone = null,
    onOpenBooking,
    canManageRoutes = true,
}) {
    const t = useTranslations('business.routes.assistant')
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const [offset, setOffset] = useState({ right: PAD, bottom: PAD })
    const lastRbRef = useRef(offset)

    const dragRef = useRef(
        /** @type {{ dragging: boolean, moved: boolean, startX: number, startY: number, startR: number, startB: number } | null} */
        null,
    )

    const readStored = useCallback(() => {
        if (typeof window === 'undefined') {
            return null
        }
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY)
            if (!raw) {
                return null
            }
            const o = JSON.parse(raw)
            if (typeof o?.right !== 'number' || typeof o?.bottom !== 'number') {
                return null
            }
            if (!Number.isFinite(o.right) || !Number.isFinite(o.bottom)) {
                return null
            }
            return { right: o.right, bottom: o.bottom }
        } catch {
            return null
        }
    }, [])

    const persist = useCallback((rb) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rb))
        } catch {
            // ignore
        }
    }, [])

    const applyClamp = useCallback(() => {
        const layout = layoutRef?.current
        const wrap = wrapRef.current
        if (!layout || !wrap) {
            return
        }
        setOffset((prev) => {
            const next = clampRbToLayout(layout, wrap, prev)
            lastRbRef.current = next
            return next.right === prev.right && next.bottom === prev.bottom ? prev : next
        })
    }, [layoutRef])

    useLayoutEffect(() => {
        const stored = readStored()
        if (stored) {
            lastRbRef.current = stored
            setOffset(stored)
        }
    }, [readStored])

    useLayoutEffect(() => {
        applyClamp()
    }, [applyClamp, open])

    useLayoutEffect(() => {
        const layout = layoutRef?.current
        if (!layout || typeof ResizeObserver === 'undefined') {
            return undefined
        }
        const ro = new ResizeObserver(() => applyClamp())
        ro.observe(layout)
        return () => ro.disconnect()
    }, [layoutRef, applyClamp])

    const handlePointerMove = useCallback(
        (e) => {
            const d = dragRef.current
            if (!d) {
                return
            }
            const dx = e.clientX - d.startX
            const dy = e.clientY - d.startY
            if (!d.dragging) {
                if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) {
                    return
                }
                d.dragging = true
                d.moved = true
            }
            const layout = layoutRef?.current
            const wrap = wrapRef.current
            if (!layout || !wrap) {
                return
            }
            const nextRaw = {
                right: d.startR - dx,
                bottom: d.startB - dy,
            }
            const next = clampRbToLayout(layout, wrap, nextRaw)
            lastRbRef.current = next
            setOffset(next)
        },
        [layoutRef],
    )

    /**
     * @param {React.PointerEvent<HTMLElement>} e
     * @param {{ toggleOnClick?: boolean }} opts
     */
    const handlePointerUpOrCancel = useCallback(
        (e, opts) => {
            const el = e.currentTarget
            const d = dragRef.current
            const moved = Boolean(d?.moved)
            if (moved) {
                persist(lastRbRef.current)
            }
            try {
                el.releasePointerCapture(e.pointerId)
            } catch {
                // ignore
            }
            dragRef.current = null
            if (!moved && opts?.toggleOnClick) {
                setOpen((v) => !v)
            }
        },
        [persist],
    )

    const handleDragPointerDown = useCallback((e) => {
        if (e.button !== 0) {
            return
        }
        const rb = lastRbRef.current
        dragRef.current = {
            dragging: false,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            startR: rb.right,
            startB: rb.bottom,
        }
        try {
            e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
            // ignore
        }
    }, [])

    return (
        <div
            ref={wrapRef}
            className="pointer-events-none absolute z-[35] flex flex-col items-end gap-2"
            style={{ right: offset.right, bottom: offset.bottom }}
        >
            {open ? (
                <>
                    <div className="pointer-events-auto flex h-[min(62dvh,40rem)] max-h-[min(62dvh,40rem)] w-[min(26rem,calc(100%-1rem))] max-w-[26rem] min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-gray-950 dark:ring-white/10">
                        <RouteAssistantPanel
                            key={`float-${specialistId ?? 'none'}|${date}`}
                            specialistId={specialistId}
                            date={date}
                            displayTimezone={displayTimezone}
                            onOpenBooking={onOpenBooking}
                            canManageRoutes={canManageRoutes}
                            floatingLayout
                            floatingDragRegionProps={{
                                onPointerDown: handleDragPointerDown,
                                onPointerMove: handlePointerMove,
                                onPointerUp: (e) => handlePointerUpOrCancel(e, { toggleOnClick: false }),
                                onPointerCancel: (e) => handlePointerUpOrCancel(e, { toggleOnClick: false }),
                            }}
                        />
                    </div>
                    <div
                        role="separator"
                        aria-label={t('floatingDragHandle')}
                        className="pointer-events-auto mb-0.5 h-3 w-14 shrink-0 cursor-grab touch-none rounded-full bg-gray-300 shadow-inner dark:bg-gray-600 active:cursor-grabbing"
                        onPointerDown={handleDragPointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={(e) => handlePointerUpOrCancel(e, { toggleOnClick: false })}
                        onPointerCancel={(e) => handlePointerUpOrCancel(e, { toggleOnClick: false })}
                    />
                </>
            ) : null}
            <button
                type="button"
                className="pointer-events-auto inline-flex min-h-[3rem] cursor-pointer select-none items-center justify-center gap-2 rounded-xl rounded-br-md border-2 border-white bg-primary px-3.5 py-2.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(37,99,235,0.45)] outline-none transition hover:bg-primary-mild hover:shadow-[0_12px_32px_rgba(37,99,235,0.55)] active:scale-[0.98] dark:border-gray-800 dark:bg-primary dark:text-white dark:shadow-[0_10px_32px_rgba(0,0,0,0.55)] dark:hover:bg-primary-mild"
                aria-label={open ? t('floatingToggleClose') : t('floatingToggleOpen')}
                aria-expanded={open}
                onPointerDown={handleDragPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUpOrCancel(e, { toggleOnClick: true })}
                onPointerCancel={(e) => handlePointerUpOrCancel(e, { toggleOnClick: false })}
            >
                {open ? (
                    <PiX className="h-6 w-6 shrink-0 text-white" aria-hidden />
                ) : (
                    <>
                        <PiChatCircle className="h-5 w-5 shrink-0 text-white" aria-hidden />
                        <span className="whitespace-nowrap text-sm font-bold text-white">{t('floatingFabLabel')}</span>
                    </>
                )}
            </button>
        </div>
    )
}
