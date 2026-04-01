'use client'
import classNames from '@/utils/classNames'
import Card from '@/components/ui/Card'
import { LayoutContext } from '@/utils/hooks/useLayout'
import { useContext } from 'react'

const AdaptiveCard = (props) => {
    // Используем useContext напрямую, чтобы не выбрасывать ошибку, если LayoutProvider отсутствует
    const layoutContext = useContext(LayoutContext)
    const adaptiveCardActive = layoutContext?.adaptiveCardActive || false

    const { className, bodyClass, ...rest } = props

    return (
        <Card
            className={classNames(
                className,
                adaptiveCardActive && 'border-none dark:bg-transparent',
            )}
            bodyClass={classNames(bodyClass, adaptiveCardActive && 'p-0')}
            {...rest}
        />
    )
}

export default AdaptiveCard
