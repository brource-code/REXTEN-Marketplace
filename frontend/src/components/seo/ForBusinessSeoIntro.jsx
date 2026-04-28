import { getTranslations } from 'next-intl/server'

/**
 * Семантический H1 + абзац для SEO (лендинг ниже рендерит «живую» типографику в клиенте).
 */
export default async function ForBusinessSeoIntro() {
    const t = await getTranslations('forBusiness.meta')

    return (
        <div className="sr-only">
            <h1>{t('title')}</h1>
            <p>{t('description')}</p>
        </div>
    )
}
