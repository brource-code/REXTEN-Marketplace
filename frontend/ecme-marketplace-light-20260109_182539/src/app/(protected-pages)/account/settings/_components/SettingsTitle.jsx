'use client'
import { useTranslations } from 'next-intl'

const SettingsTitle = () => {
    const t = useTranslations('accountSettings')
    return <h3 className="font-bold">{t('title')}</h3>
}

export default SettingsTitle

