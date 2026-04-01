'use client'
import { memo, useCallback, useRef, useMemo } from 'react'
import Button from '@/components/ui/Button'
import InputGroup from '@/components/ui/InputGroup'
import useTheme from '@/utils/hooks/useTheme'
import { THEME_ENUM } from '@/constants/theme.constant'

const dirList = [
    { value: THEME_ENUM.DIR_LTR, label: 'LTR' },
    { value: THEME_ENUM.DIR_RTL, label: 'RTL' },
]

const DirectionSwitcher = memo(({ callBackClose }) => {
    const setDirection = useTheme((state) => state.setDirection)
    const direction = useTheme((state) => state.direction)
    const timeoutRef = useRef(null)

    const onDirChange = useCallback((val) => {
        // Debounce для предотвращения множественных быстрых изменений
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
            setDirection(val)
            callBackClose?.()
        }, 100) // Увеличиваем задержку для предотвращения зависаний
    }, [setDirection, callBackClose])

    // Мемоизируем dirList, чтобы не пересоздавать при каждом рендере
    const dirListMemo = useMemo(() => dirList, [])

    return (
        <InputGroup size="sm">
            {dirListMemo.map((dir) => (
                <Button
                    key={dir.value}
                    active={direction === dir.value}
                    onClick={() => onDirChange(dir.value)}
                >
                    {dir.label}
                </Button>
            ))}
        </InputGroup>
    )
})

DirectionSwitcher.displayName = 'DirectionSwitcher'

export default DirectionSwitcher
