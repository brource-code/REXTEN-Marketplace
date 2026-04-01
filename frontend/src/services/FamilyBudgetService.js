import LaravelApiService from './LaravelApiService'

const FamilyBudgetService = {
    /**
     * Получить все данные бюджета (настройки + события)
     */
    async getData() {
        return LaravelApiService.get('/family-budget')
    },

    /**
     * Обновить настройки бюджета
     */
    async updateSettings(settings) {
        return LaravelApiService.put('/family-budget/settings', settings)
    },

    /**
     * Получить события (опционально за период)
     */
    async getEvents(period = null) {
        const params = period ? { period } : {}
        return LaravelApiService.get('/family-budget/events', params)
    },

    /**
     * Создать событие
     */
    async createEvent(event) {
        return LaravelApiService.post('/family-budget/events', event)
    },

    /**
     * Обновить событие
     */
    async updateEvent(id, event) {
        return LaravelApiService.put(`/family-budget/events/${id}`, event)
    },

    /**
     * Удалить событие
     */
    async deleteEvent(id) {
        return LaravelApiService.delete(`/family-budget/events/${id}`)
    },

    /**
     * Синхронизировать все события (полная замена)
     */
    async syncEvents(events) {
        return LaravelApiService.post('/family-budget/sync', { events })
    },

    /**
     * Очистить все данные бюджета
     */
    async clearAll() {
        return LaravelApiService.delete('/family-budget/clear')
    },

    /**
     * Получить AI-анализ (публичный эндпоинт)
     */
    async getAiReport(data) {
        return LaravelApiService.post('/family-budget/ai-report', data)
    },
}

export default FamilyBudgetService
