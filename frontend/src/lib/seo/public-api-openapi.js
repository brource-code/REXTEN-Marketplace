import { getPublicApiAnchorUrl } from '@/lib/seo/agent-discovery'

/** @returns {Record<string, unknown>} */
export function buildPublicOpenApiDocument() {
    const serverUrl = getPublicApiAnchorUrl()

    return {
        openapi: '3.0.3',
        info: {
            title: 'REXTEN public HTTP API',
            version: '1.0.0',
            description:
                'Публичные read-mostly эндпоинты маркетплейса REXTEN (Laravel). Защищённые кабинеты и запись данных требуют JWT (Authorization: Bearer) после POST /auth/login — это не OAuth 2.0 authorization server metadata.',
        },
        servers: [{ url: serverUrl }],
        tags: [
            { name: 'Marketplace', description: 'Каталог услуг и компаний' },
            { name: 'Locations', description: 'Штаты / города' },
            { name: 'SEO', description: 'Лёгкие списки для sitemap и агентов' },
            { name: 'Platform', description: 'Публичные настройки и планы' },
            { name: 'Bookings', description: 'Доступные слоты и создание брони' },
        ],
        paths: {
            '/marketplace/services': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Список услуг / объявлений',
                    operationId: 'marketplaceGetServices',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/marketplace/categories': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Категории',
                    operationId: 'marketplaceGetCategories',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/marketplace/states': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Штаты для фильтра',
                    operationId: 'marketplaceGetStates',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/marketplace/services/{slug}': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Услуга по slug',
                    operationId: 'marketplaceGetServiceBySlug',
                    parameters: [
                        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
                },
            },
            '/marketplace/services/{slug}/profile': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Профиль услуги',
                    operationId: 'marketplaceGetServiceProfile',
                    parameters: [
                        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/marketplace/company/{slug}': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Профиль компании',
                    operationId: 'marketplaceGetCompanyProfile',
                    parameters: [
                        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/locations/states': {
                get: {
                    tags: ['Locations'],
                    summary: 'Штаты',
                    operationId: 'locationsGetStates',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/locations/cities': {
                get: {
                    tags: ['Locations'],
                    summary: 'Города',
                    operationId: 'locationsGetCities',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/locations/search': {
                get: {
                    tags: ['Locations'],
                    summary: 'Поиск локации',
                    operationId: 'locationsSearch',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/locations/validate': {
                get: {
                    tags: ['Locations'],
                    summary: 'Валидация локации',
                    operationId: 'locationsValidate',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/seo/marketplace-listings': {
                get: {
                    tags: ['SEO'],
                    summary: 'Список slug объявлений для индексации',
                    operationId: 'seoMarketplaceListings',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/seo/companies': {
                get: {
                    tags: ['SEO'],
                    summary: 'Компании на витрине',
                    operationId: 'seoCompanies',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/seo/categories': {
                get: {
                    tags: ['SEO'],
                    summary: 'Категории для SEO',
                    operationId: 'seoCategories',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/seo/locations': {
                get: {
                    tags: ['SEO'],
                    summary: 'Пары state/city из объявлений',
                    operationId: 'seoLocations',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/seo/landing-paths': {
                get: {
                    tags: ['SEO'],
                    summary: 'Пути лендингов /services/...',
                    operationId: 'seoLandingPaths',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/settings/public': {
                get: {
                    tags: ['Platform'],
                    summary: 'Публичные настройки (лого и т.п.)',
                    operationId: 'settingsPublic',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/subscription-plans/public': {
                get: {
                    tags: ['Platform'],
                    summary: 'Публичные тарифы',
                    operationId: 'subscriptionPlansPublic',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/advertisements/featured': {
                get: {
                    tags: ['Marketplace'],
                    summary: 'Избранные объявления',
                    operationId: 'advertisementsFeatured',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/bookings/available-slots': {
                get: {
                    tags: ['Bookings'],
                    summary: 'Доступные слоты',
                    operationId: 'bookingsAvailableSlots',
                    responses: { '200': { description: 'OK' } },
                },
            },
            '/bookings/{id}/payment-eligibility': {
                get: {
                    tags: ['Bookings'],
                    summary: 'Пригодность оплаты для брони',
                    operationId: 'bookingsPaymentEligibility',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: { '200': { description: 'OK' } },
                },
            },
        },
    }
}
