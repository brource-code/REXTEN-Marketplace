'use client'

import { memo, useCallback, useRef, useMemo } from 'react'
import classNames from '@/utils/classNames'
import { TbCheck } from 'react-icons/tb'
import presetThemeSchemaConfig from '@/configs/preset-theme-schema.config'
import useTheme from '@/utils/hooks/useTheme'

const ThemeSwitcher = memo(() => {
    const schema = useTheme((state) => state.themeSchema)
    const setSchema = useTheme((state) => state.setSchema)
    const mode = useTheme((state) => state.mode)
    const timeoutRef = useRef(null)

    const handleSchemaChange = useCallback((key) => {
        // Debounce для предотвращения множественных быстрых изменений
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
            setSchema(key)
        }, 100) // Увеличиваем задержку для предотвращения зависаний
    }, [setSchema])

    // Мемоизируем список схем, чтобы не пересоздавать при каждом рендере
    const schemaEntries = useMemo(() => Object.entries(presetThemeSchemaConfig), [])

    return (
        <div className="inline-flex items-center gap-2">
            {schemaEntries.map(([key, value]) => (
                <button
                    key={key}
                    className={classNames(
                        'h-8 w-8 rounded-full flex items-center justify-center border-2 border-white',
                        schema === key && 'ring-2 ring-primary',
                    )}
                    style={{ backgroundColor: value[mode].primary || '' }}
                    onClick={() => handleSchemaChange(key)}
                >
                    {schema === key ? (
                        <TbCheck className="text-neutral text-lg" />
                    ) : null}
                </button>
            ))}
        </div>
    )
})

ThemeSwitcher.displayName = 'ThemeSwitcher'

export default ThemeSwitcher
