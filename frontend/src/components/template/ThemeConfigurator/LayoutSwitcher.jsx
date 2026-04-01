'use client'

import { memo, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import classNames from 'classnames'
import Segment from '@/components/ui/Segment'
import useTheme from '@/utils/hooks/useTheme'
import {
    LAYOUT_COLLAPSIBLE_SIDE,
    LAYOUT_TOP_BAR_CLASSIC,
} from '@/constants/theme.constant'
import CollapsibleSideSvg from '@/assets/svg/CollapsibleSideSvg'
import TopBarClassicSvg from '@/assets/svg/TopBarClassicSvg'

const LayoutSwitcher = memo(() => {
    const t = useTranslations('themeConfig')
    const themeLayout = useTheme((state) => state.layout)
    const setLayout = useTheme((state) => state.setLayout)
    const timeoutRef = useRef(null)

    const layouts = useMemo(() => [
        {
            value: LAYOUT_COLLAPSIBLE_SIDE,
            label: t('collapsible'),
            src: '/img/thumbs/layouts/classic.jpg',
            srcDark: '/img/thumbs/layouts/classic-dark.jpg',
            svg: <CollapsibleSideSvg height={'100%'} width={'100%'} />,
        },
        {
            value: LAYOUT_TOP_BAR_CLASSIC,
            label: t('topBar'),
            src: '/img/thumbs/layouts/stackedSide.jpg',
            srcDark: '/img/thumbs/layouts/stackedSide-dark.jpg',
            svg: <TopBarClassicSvg height={'100%'} width={'100%'} />,
        },
    ], [t])

    const handleLayoutChange = useCallback((val) => {
        // Debounce для предотвращения множественных быстрых изменений
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
            setLayout(val)
        }, 100) // Увеличиваем задержку для предотвращения зависаний
    }, [setLayout])

    return (
        <div>
            <Segment
                className="w-full bg-transparent dark:bg-transparent p-0"
                value={[]}
                onChange={handleLayoutChange}
            >
                <div className="grid grid-cols-2 gap-4 w-full">
                    {layouts.map((layout) => (
                        <Segment.Item key={layout.value} value={layout.value}>
                            {({ onSegmentItemClick }) => {
                                const active = themeLayout.type === layout.value
                                return (
                                    <div className="text-center">
                                        <button
                                            className={classNames(
                                                'border-2 rounded-xl overflow-hidden',
                                                active
                                                    ? 'border-primary dark:border-primary'
                                                    : 'border-gray-200 dark:border-gray-700',
                                            )}
                                            onClick={onSegmentItemClick}
                                        >
                                            {layout.svg}
                                        </button>
                                        <div className="mt-2 font-semibold">
                                            {layout.label}
                                        </div>
                                    </div>
                                )
                            }}
                        </Segment.Item>
                    ))}
                </div>
            </Segment>
        </div>
    )
})

LayoutSwitcher.displayName = 'LayoutSwitcher'

export default LayoutSwitcher
