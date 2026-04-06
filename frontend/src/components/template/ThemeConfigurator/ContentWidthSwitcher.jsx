'use client'

import { memo, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Segment from '@/components/ui/Segment'
import useTheme from '@/utils/hooks/useTheme'
import { CONTENT_WIDTH_BOXED, CONTENT_WIDTH_FULL } from '@/constants/theme.constant'

const ContentWidthSwitcher = memo(() => {
    const t = useTranslations('themeConfig')
    const contentWidth = useTheme((state) => state.layout?.contentWidth)
    const setContentWidth = useTheme((state) => state.setContentWidth)
    const timeoutRef = useRef(null)

    const value = contentWidth === CONTENT_WIDTH_FULL ? CONTENT_WIDTH_FULL : CONTENT_WIDTH_BOXED

    const handleChange = useCallback(
        (next) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            timeoutRef.current = setTimeout(() => {
                setContentWidth(next === CONTENT_WIDTH_FULL ? CONTENT_WIDTH_FULL : CONTENT_WIDTH_BOXED)
            }, 100)
        },
        [setContentWidth],
    )

    return (
        <div>
            <Segment
                value={value}
                onChange={handleChange}
                className="inline-flex w-full rounded-xl p-1"
            >
                <Segment.Item value={CONTENT_WIDTH_BOXED} className="rounded-lg flex-1 font-bold">
                    {t('contentWidthStandard')}
                </Segment.Item>
                <Segment.Item value={CONTENT_WIDTH_FULL} className="rounded-lg flex-1 font-bold">
                    {t('contentWidthFull')}
                </Segment.Item>
            </Segment>
        </div>
    )
})

ContentWidthSwitcher.displayName = 'ContentWidthSwitcher'

export default ContentWidthSwitcher
