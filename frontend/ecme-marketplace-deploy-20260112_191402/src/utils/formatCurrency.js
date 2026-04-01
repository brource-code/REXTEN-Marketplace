/**
 * Получить символ валюты по коду
 */
export const getCurrencySymbol = (currency = 'USD') => {
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'RUB': '₽',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
    }
    return symbols[currency] || currency
}

/**
 * Форматировать цену с валютой
 * @param {number|string} price - Цена
 * @param {string} currency - Код валюты (USD, EUR, RUB и т.д.)
 * @param {object} options - Опции форматирования
 * @returns {string} Отформатированная цена с символом валюты
 */
export const formatCurrency = (price, currency = 'USD', options = {}) => {
    if (!price && price !== 0) return ''
    
    const {
        showSymbol = true,
        locale = 'ru-RU',
        minimumFractionDigits = 0,
        maximumFractionDigits = 2,
    } = options
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    
    if (isNaN(numPrice)) return ''
    
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(numPrice)
    
    if (!showSymbol) return formatted
    
    const symbol = getCurrencySymbol(currency)
    
    // Для некоторых валют символ ставится перед числом, для других - после
    if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
        return `${symbol}${formatted}`
    } else {
        return `${formatted} ${symbol}`
    }
}

export default formatCurrency

