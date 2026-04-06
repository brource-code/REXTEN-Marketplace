'use client'

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type OnboardingTourBackdropProps = {
    active: boolean
    targetSelector: string | null
}

function dimColor(isDark: boolean): string {
    return isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(30, 30, 32, 0.68)'
}

/**
 * Затемнение всего экрана, кроме прямоугольника цели: один fixed-блок + огромный box-shadow.
 * Так нет зазоров между полосами и не зависим от Tailwind arbitrary-классов в проде.
 * z-index ниже тултипа Shepherd (10050), выше сайдбара/контента.
 */
export default function OnboardingTourBackdrop({
    active,
    targetSelector,
}: OnboardingTourBackdropProps): ReactNode {
    const [mounted, setMounted] = useState(false)
    const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(
        null,
    )
    const [themeDark, setThemeDark] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const sync = () => setThemeDark(document.documentElement.classList.contains('dark'))
        sync()
        const mo = new MutationObserver(sync)
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => mo.disconnect()
    }, [])

    /** Пока цель в DOM не готова — крутим rAF (шаг тура после навигации) */
    useLayoutEffect(() => {
        if (!active || !targetSelector) {
            setBox(null)
            return
        }

        let raf = 0
        let attempts = 0
        const maxAttempts = 600

        const update = () => {
            const el = document.querySelector(targetSelector)
            if (el) {
                const r = el.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    setBox({
                        left: r.left,
                        top: r.top,
                        width: r.width,
                        height: r.height,
                    })
                    return
                }
            }
            attempts += 1
            if (attempts < maxAttempts) {
                raf = requestAnimationFrame(update)
            } else {
                setBox(null)
            }
        }

        update()

        const onScrollOrResize = () => {
            const el = document.querySelector(targetSelector)
            if (!el) return
            const r = el.getBoundingClientRect()
            if (r.width > 0 && r.height > 0) {
                setBox({ left: r.left, top: r.top, width: r.width, height: r.height })
            }
        }

        window.addEventListener('scroll', onScrollOrResize, true)
        window.addEventListener('resize', onScrollOrResize)

        const el = document.querySelector(targetSelector)
        let ro: ResizeObserver | null = null
        if (el && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(onScrollOrResize)
            ro.observe(el)
        }

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('scroll', onScrollOrResize, true)
            window.removeEventListener('resize', onScrollOrResize)
            ro?.disconnect()
        }
    }, [active, targetSelector])

    if (!mounted || typeof document === 'undefined') {
        return null
    }

    if (!active || !targetSelector || !box) {
        return null
    }

    const { left, top, width, height } = box
    const color = dimColor(themeDark)

    const overlay = (
        <>
            {/* «Окно»: тень на 9999px даёт ровное затемнение вокруг без дыр */}
            <div
                className="fixed pointer-events-none"
                style={{
                    left,
                    top,
                    width,
                    height,
                    borderRadius: 10,
                    zIndex: 10038,
                    boxShadow: `0 0 0 9999px ${color}`,
                }}
                aria-hidden
            />
            {/* Рамка вокруг цели */}
            <div
                className="fixed pointer-events-none rounded-lg border-2 border-gray-400 dark:border-gray-500"
                style={{
                    left,
                    top,
                    width,
                    height,
                    zIndex: 10039,
                }}
                aria-hidden
            />
        </>
    )

    return createPortal(overlay, document.body)
}
