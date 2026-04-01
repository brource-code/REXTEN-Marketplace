import { getRequestConfig } from 'next-intl/server'
import { getLocale } from '@/server/actions/locale'
import appConfig from '@/configs/app.config'
import { SUPPORTED_LOCALES } from '@/constants/locale.constant'

export default getRequestConfig(async () => {
    const locale = await getLocale()
    
    const validLocale = SUPPORTED_LOCALES.includes(locale) ? locale : appConfig.locale
    
    try {
        const messages = (await import(`../../messages/${validLocale}.json`)).default
        // Проверка наличия ключа для отладки
        if (process.env.NODE_ENV === 'development' && validLocale === 'ru') {
            const hasVisible = messages?.business?.advertisements?.columns?.visible
            if (!hasVisible) {
                console.warn('[i18n] Missing business.advertisements.columns.visible in ru.json')
            }
        }
        return {
            locale: validLocale,
            messages,
        }
    } catch (error) {
        // Fallback на дефолтный язык, если файл не найден
        const messages = (await import(`../../messages/${appConfig.locale}.json`)).default
        return {
            locale: appConfig.locale,
            messages,
        }
    }
})
