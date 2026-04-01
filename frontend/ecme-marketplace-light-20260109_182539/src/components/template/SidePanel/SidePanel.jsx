'use client'
import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import classNames from 'classnames'
import Drawer from '@/components/ui/Drawer'
import { PiGearDuotone } from 'react-icons/pi'
import SidePanelContent from './SidePanelContent'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useTheme from '@/utils/hooks/useTheme'
import { setTheme as setThemeCookies } from '@/server/actions/theme'

const _SidePanel = (props) => {
    const { className, ...rest } = props
    const t = useTranslations('themeConfig')

    const [isOpen, setIsOpen] = useState(false)
    const theme = useTheme((state) => state)
    const direction = useTheme((state) => state.direction)
    
    // Мемоизируем placement, чтобы избежать лишних перерендеров
    const placement = useMemo(() => direction === 'rtl' ? 'left' : 'right', [direction])

    const openPanel = useCallback(() => {
        setIsOpen(true)
    }, [])

    const closePanel = useCallback(() => {
        // Простое закрытие - react-modal сам управляет классами body
        setIsOpen(false)
        
        // Сохраняем тему в cookies при закрытии - просто и без лишней асинхронности
        try {
            const themeData = JSON.stringify({ state: theme })
            // Не ждем результата - fire and forget
            setThemeCookies(themeData).catch(() => {
                // Игнорируем ошибки сохранения
            })
        } catch (e) {
            // Игнорируем ошибки
        }
    }, [theme])

    return (
        <>
            <div
                className={classNames('text-2xl', className)}
                onClick={openPanel}
                {...rest}
            >
                <PiGearDuotone />
            </div>
            <Drawer
                title={t('title')}
                isOpen={isOpen}
                placement={placement}
                width={375}
                onClose={closePanel}
                lockScroll={false} // Временно отключен скролл-лок для дебага
            >
                <SidePanelContent callBackClose={closePanel} />
            </Drawer>
        </>
    )
}

const SidePanel = withHeaderItem(_SidePanel)

export default SidePanel
