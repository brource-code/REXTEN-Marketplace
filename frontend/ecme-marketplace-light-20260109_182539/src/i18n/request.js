import { getRequestConfig } from 'next-intl/server'
import { getLocale } from '@/server/actions/locale'
import appConfig from '@/configs/app.config'

export default getRequestConfig(async () => {
    const locale = await getLocale()
    
    // Список доступных локалей
    const availableLocales = ['en', 'ar', 'es', 'zh', 'ru']
    const validLocale = availableLocales.includes(locale) ? locale : appConfig.locale
    
    try {
        const messages = (await import(`../../messages/${validLocale}.json`)).default
        return {
            locale: validLocale,
            messages,
        }
    } catch (error) {
        // Fallback на английский, если файл не найден
        const messages = (await import(`../../messages/${appConfig.locale}.json`)).default
        return {
            locale: appConfig.locale,
            messages,
        }
    }
})
