'use client'

import { memo, useCallback, useRef } from 'react'
import useTheme from '@/utils/hooks/useTheme'
import Switcher from '@/components/ui/Switcher'

const ModeSwitcher = memo(() => {
    const mode = useTheme((state) => state.mode)
    const setMode = useTheme((state) => state.setMode)
    const timeoutRef = useRef(null)

    const onSwitchChange = useCallback((checked) => {
        // Debounce для предотвращения множественных быстрых изменений
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
            setMode(checked ? 'dark' : 'light')
        }, 100) // Увеличиваем задержку для предотвращения зависаний
    }, [setMode])

    return (
        <div>
            <Switcher
                defaultChecked={mode === 'dark'}
                onChange={onSwitchChange}
            />
        </div>
    )
})

ModeSwitcher.displayName = 'ModeSwitcher'

export default ModeSwitcher
