'use client'

import { useEffect } from 'react'

const TYPABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isTypingInsideField(target) {
    if (!target || target.nodeType !== 1) return false
    if (target.isContentEditable) return true
    return TYPABLE_TAGS.has(target.tagName)
}

/**
 * Глобальные хоткеи для drawer/wizard:
 *   Esc          → onEsc
 *   Cmd/Ctrl+S   → onSave
 *   Cmd/Ctrl+⏎   → onSubmit (создать/сохранить и закрыть)
 *   E            → onEdit, если передан (когда не печатаешь в инпуте)
 *   D            → onDelete
 *   R            → onReschedule
 *
 * Все handler'ы опциональны.
 */
export function useBookingHotkeys({
    enabled = true,
    onEsc,
    onSave,
    onSubmit,
    onEdit,
    onDelete,
    onReschedule,
} = {}) {
    useEffect(() => {
        if (!enabled) return undefined

        const handler = (e) => {
            if (e.key === 'Escape') {
                if (onEsc) {
                    onEsc(e)
                }
                return
            }

            const meta = e.metaKey || e.ctrlKey
            if (meta && (e.key === 's' || e.key === 'S')) {
                e.preventDefault()
                if (onSave) onSave(e)
                return
            }
            if (meta && e.key === 'Enter') {
                e.preventDefault()
                if (onSubmit) onSubmit(e)
                return
            }

            if (isTypingInsideField(e.target)) return

            if (e.key === 'e' || e.key === 'E') {
                if (onEdit) {
                    e.preventDefault()
                    onEdit(e)
                }
            } else if (e.key === 'd' || e.key === 'D') {
                if (onDelete) {
                    e.preventDefault()
                    onDelete(e)
                }
            } else if (e.key === 'r' || e.key === 'R') {
                if (onReschedule) {
                    e.preventDefault()
                    onReschedule(e)
                }
            }
        }

        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [enabled, onEsc, onSave, onSubmit, onEdit, onDelete, onReschedule])
}

export default useBookingHotkeys
