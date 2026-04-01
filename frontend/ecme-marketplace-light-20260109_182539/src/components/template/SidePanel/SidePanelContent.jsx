'use client'

import { memo } from 'react'
import ThemeConfigurator from '@/components/template/ThemeConfigurator'

const SidePanelContent = memo((props) => {
    return <ThemeConfigurator {...props} />
})

SidePanelContent.displayName = 'SidePanelContent'

export default SidePanelContent
