'use client'

import { memo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Notification from '@/components/ui/Notification'
import Button from '@/components/ui/Button'
import toast from '@/components/ui/toast'
import { themeConfig } from '@/configs/theme.config'
import useTheme from '@/utils/hooks/useTheme'

const CopyButton = memo(() => {
    const t = useTranslations('themeConfig')
    // Используем селектор для получения только нужных полей
    const theme = useTheme((state) => ({
        mode: state.mode,
        themeSchema: state.themeSchema,
        direction: state.direction,
        layout: state.layout,
        panelExpand: state.panelExpand,
    }))

    const handleCopy = useCallback(() => {
        const config = {
            ...themeConfig,
            ...theme,
            layout: {
                type: theme.layout.type,
                sideNavCollapse: theme.layout.sideNavCollapse,
                contentWidth: theme.layout.contentWidth ?? 'boxed',
            },
            panelExpand: false,
        }

        navigator.clipboard.writeText(`
            
export const themeConfig: ThemeConfig = ${JSON.stringify(config, null, 2)}
`)

        toast.push(
            <Notification title={t('copySuccess')} type="success">
                {t('copySuccessDesc')}
            </Notification>,
            {
                placement: 'top-center',
            },
        )
    }, [theme, t])

    return (
        <Button block variant="solid" onClick={handleCopy}>
            {t('copyConfig')}
        </Button>
    )
})

CopyButton.displayName = 'CopyButton'

export default CopyButton
