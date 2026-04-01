/**
 * Маппинг кириллических названий категорий на английские slug'и
 */
const categoryNameToSlugMap = {
    'клининг': 'cleaning',
    'уборка': 'cleaning',
    'автосервис': 'auto-service',
    'маникюр': 'nail-services',
    'красота': 'beauty',
    'косметология': 'cosmetology',
    'массаж': 'massage',
    'парикмахерские услуги': 'hair-services',
    'барбершоп': 'barbershop',
    'массаж и spa': 'massage-spa',
    'ремонт и строительство': 'repair-construction',
    'отопление и вентиляция': 'hvac',
    'ландшафтный дизайн': 'landscaping',
    'уборка снега': 'snow-removal',
    'уход за детьми': 'childcare',
    'уход за пожилыми': 'elder-care',
    'уход за животными': 'pet-care',
    'изучение языков': 'language-learning',
    'музыкальные уроки': 'music-lessons',
    'фотография': 'photography',
    'видеосъемка': 'videography',
    'планирование мероприятий': 'event-planning',
    'кейтеринг': 'catering',
    'переезды': 'moving',
    'it-поддержка': 'it-support',
    'веб-разработка': 'web-development',
    'юридические услуги': 'legal-services',
    'бухгалтерия': 'accounting',
    'переводы': 'translation',
    'физиотерапия': 'physical-therapy',
    'химчистка': 'dry-cleaning',
    'прачечная': 'laundry',
    'тату и пирсинг': 'tattoo-piercing',
}

/**
 * Утилита для получения переведенного названия категории
 * Работает как с объектами категорий, так и со строками (названиями)
 * 
 * @param {Object|string} category - Объект категории {id, name, slug} или строка с названием
 * @param {Function} t - Функция перевода из next-intl (useTranslations('public.services'))
 * @returns {string} - Переведенное название категории или оригинальное, если перевод не найден
 */
export const getCategoryName = (category, t) => {
    if (!category) return ''
    
    // Если category - это строка, создаем объект из неё
    let categoryObj = category
    if (typeof category === 'string') {
        const nameLower = category.toLowerCase().trim()
        // Если строка пустая, возвращаем пустую строку
        if (!nameLower) return ''
        // Проверяем маппинг для кириллических названий
        const mappedSlug = categoryNameToSlugMap[nameLower]
        categoryObj = { 
            name: category, 
            slug: mappedSlug || category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') 
        }
    }
    
    // Если categoryObj - это объект, но у него нет name, пытаемся извлечь из других полей
    if (categoryObj && typeof categoryObj === 'object' && !categoryObj.name) {
        categoryObj.name = categoryObj.title || categoryObj.label || categoryObj.category || ''
    }
    
    // Если после всех проверок name пустой, возвращаем пустую строку
    if (!categoryObj || !categoryObj.name || categoryObj.name.trim() === '') {
        return ''
    }
    
    // Используем slug для поиска перевода, если slug нет - генерируем из name
    let slug = categoryObj.slug
    if (!slug) {
        const nameLower = categoryObj.name?.toLowerCase().trim()
        // Проверяем маппинг для кириллических названий
        slug = categoryNameToSlugMap[nameLower] || categoryObj.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }
    if (!slug) return categoryObj.name
    
    // Нормализуем slug: убираем лишние дефисы, приводим к нижнему регистру
    slug = slug.toLowerCase().replace(/--+/g, '-').replace(/^-|-$/g, '')
    
    // Если slug пустой после нормализации, возвращаем оригинальное название
    if (!slug || slug.trim() === '') {
        return categoryObj.name
    }
    
    // Пробуем несколько вариантов slug для поиска перевода
    const slugVariants = [
        slug, // Оригинальный slug
        slug.replace(/-/g, '_'), // С подчеркиваниями вместо дефисов
        slug.replace(/_/g, '-'), // С дефисами вместо подчеркиваний
    ]
    
    // Убираем дубликаты и пустые значения
    const uniqueSlugs = [...new Set(slugVariants)].filter(s => s && s.trim() !== '')
    
    // Если нет валидных slug'ов, возвращаем оригинальное название
    if (uniqueSlugs.length === 0) {
        return categoryObj.name
    }
    
    // Пытаемся найти перевод для каждого варианта slug
    for (const slugVariant of uniqueSlugs) {
        const translationKey = `categories.${slugVariant}`
        
        try {
            // Используем безопасный способ получения перевода
            let translated = null
            try {
                // Пробуем получить перевод с defaultValue
                if (t && typeof t === 'function') {
                    translated = t(translationKey, { defaultValue: null })
                }
            } catch (intlError) {
                // Если next-intl бросает ошибку (IntlError), игнорируем и продолжаем
                translated = null
            }
            
            // Проверяем, что получили валидный перевод (не ключ и не ошибку)
            if (translated && typeof translated === 'string' && translated !== translationKey) {
                // Дополнительная проверка: если перевод начинается с "categories." или "public.services.categories.", это ошибка
                if (!translated.startsWith('categories.') && !translated.startsWith('public.services.categories.')) {
                    return translated
                }
            }
        } catch (error) {
            // Продолжаем поиск следующего варианта
            continue
        }
    }
    
    // Fallback: возвращаем оригинальное название
    return categoryObj.name
}
