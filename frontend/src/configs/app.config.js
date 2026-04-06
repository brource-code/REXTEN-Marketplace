const appConfig = {
    apiPrefix: '/api',
    /** Главная страница маркетплейса (каталог) — ссылка с логотипа на всех экранах */
    marketplaceHomePath: '/services',
    authenticatedEntryPath: '/business/dashboard', // По умолчанию для админки
    unAuthenticatedEntryPath: '/sign-in', // Страница входа
    locale: 'en',
    activeNavTranslation: true,
    // Пути для разных ролей
    roleEntryPaths: {
        // CLIENT не используется в админке - они на публичном сайте
        BUSINESS_OWNER: '/business/dashboard',
        SUPERADMIN: '/superadmin/dashboard',
    },
    // Публичные пути (для клиентов на фронте)
    publicAuthPath: '/sign-in', // Публичная страница входа для клиентов
}

export default appConfig
