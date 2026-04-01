import LaravelApiService from './LaravelApiService'

/**
 * Сервис для работы с компаниями
 * Все методы обращаются к Laravel API
 */
const CompanyService = {
    /**
     * Получить список компаний (для суперадмина)
     * @param {Object} params - параметры фильтрации
     */
    async getCompanies(params = {}) {
        return LaravelApiService.get('/superadmin/companies', params)
    },

    /**
     * Получить одну компанию по ID
     * @param {number|string} id - ID компании
     */
    async getCompany(id) {
        return LaravelApiService.get(`/superadmin/companies/${id}`)
    },

    /**
     * Создать новую компанию
     * @param {Object} data - данные компании
     */
    async createCompany(data) {
        return LaravelApiService.post('/superadmin/companies', data)
    },

    /**
     * Обновить компанию
     * @param {number|string} id - ID компании
     * @param {Object} data - данные для обновления
     */
    async updateCompany(id, data) {
        return LaravelApiService.patch(`/superadmin/companies/${id}`, data)
    },

    /**
     * Получить информацию о текущей компании (для бизнеса)
     */
    async getCurrentCompany() {
        return LaravelApiService.get('/business/company')
    },

    /**
     * Обновить настройки текущей компании
     * @param {Object} data - данные настроек
     */
    async updateCompanySettings(data) {
        return LaravelApiService.patch('/business/company/settings', data)
    },

    /**
     * Получить услуги компании
     * @param {Object} params - параметры фильтрации
     */
    async getServices(params = {}) {
        return LaravelApiService.get('/business/services', params)
    },

    /**
     * Создать услугу
     * @param {Object} data - данные услуги
     */
    async createService(data) {
        return LaravelApiService.post('/business/services', data)
    },
}

export default CompanyService

