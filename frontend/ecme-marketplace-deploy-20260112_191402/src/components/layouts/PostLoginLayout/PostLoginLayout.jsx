'use client'
import {
    LAYOUT_COLLAPSIBLE_SIDE,
    LAYOUT_STACKED_SIDE,
    LAYOUT_TOP_BAR_CLASSIC,
    LAYOUT_FRAMELESS_SIDE,
    LAYOUT_CONTENT_OVERLAY,
    LAYOUT_BLANK,
} from '@/constants/theme.constant'
import FrameLessSide from './components/FrameLessSide'
import CollapsibleSide from './components/CollapsibleSide'
import StackedSide from './components/StackedSide'
import TopBarClassic from './components/TopBarClassic'
import ContentOverlay from './components/ContentOverlay'
import Blank from './components/Blank'
import PageContainer from '@/components/template/PageContainer'
import queryRoute from '@/utils/queryRoute'
import useTheme from '@/utils/hooks/useTheme'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const Layout = ({ children, layoutType }) => {
    switch (layoutType) {
        case LAYOUT_COLLAPSIBLE_SIDE:
            return <CollapsibleSide>{children}</CollapsibleSide>
        case LAYOUT_STACKED_SIDE:
            return <StackedSide>{children}</StackedSide>
        case LAYOUT_TOP_BAR_CLASSIC:
            return <TopBarClassic>{children}</TopBarClassic>
        case LAYOUT_FRAMELESS_SIDE:
            return <FrameLessSide>{children}</FrameLessSide>
        case LAYOUT_CONTENT_OVERLAY:
            return <ContentOverlay>{children}</ContentOverlay>
        case LAYOUT_BLANK:
            return <Blank>{children}</Blank>
        default:
            // Fallback to CollapsibleSide if layoutType is not recognized
            return <CollapsibleSide>{children}</CollapsibleSide>
    }
}

const PostLoginLayout = ({ children }) => {
    const layoutType = useTheme((state) => state.layout.type)
    const setLayout = useTheme((state) => state.setLayout)
    const savedLayoutRef = useRef(null)

    const pathname = usePathname()

    const route = queryRoute(pathname)

    // Автоматическое переключение layout для планшетов в горизонтальной ориентации
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleResize = () => {
            const width = window.innerWidth
            const height = window.innerHeight
            const isTablet = width >= 768 && width <= 1024
            const isLandscape = width > height

            // Если планшет в горизонтальной ориентации
            if (isTablet && isLandscape) {
                // Сохраняем текущий layout, если еще не сохранен
                if (!savedLayoutRef.current && layoutType !== LAYOUT_TOP_BAR_CLASSIC) {
                    savedLayoutRef.current = layoutType
                }
                // Переключаем на верхнюю панель
                if (layoutType !== LAYOUT_TOP_BAR_CLASSIC) {
                    setLayout(LAYOUT_TOP_BAR_CLASSIC)
                }
            } else {
                // Если не планшет в landscape или планшет в portrait
                // Восстанавливаем сохраненный layout, если был
                if (savedLayoutRef.current && layoutType === LAYOUT_TOP_BAR_CLASSIC) {
                    setLayout(savedLayoutRef.current)
                    savedLayoutRef.current = null
                }
            }
        }

        // Проверяем при монтировании
        handleResize()

        // Слушаем изменения размера окна и ориентации
        window.addEventListener('resize', handleResize)
        window.addEventListener('orientationchange', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('orientationchange', handleResize)
        }
    }, [layoutType, setLayout])

    return (
        <Layout
            layoutType={route?.meta?.layout ? route?.meta?.layout : layoutType}
        >
            <PageContainer {...route?.meta}>{children}</PageContainer>
        </Layout>
    )
}

export default PostLoginLayout
