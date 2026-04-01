import LaravelApiService from './LaravelApiService'

/**
 * Сервис для работы с бронированиями
 * Все методы обращаются к Laravel API
 */
const BookingService = {
    /**
     * Получить список бронирований
     * @param {Object} params - параметры фильтрации (page, status, date и т.д.)
     */
    async getBookings(params = {}) {
        return LaravelApiService.get('/business/bookings', params)
    },

    /**
     * Получить одно бронирование по ID
     * @param {number|string} id - ID бронирования
     */
    async getBooking(id) {
        return LaravelApiService.get(`/business/bookings/${id}`)
    },

    /**
     * Создать новое бронирование
     * @param {Object} data - данные бронирования
     */
    async createBooking(data) {
        return LaravelApiService.post('/business/bookings', data)
    },

    /**
     * Обновить бронирование
     * @param {number|string} id - ID бронирования
     * @param {Object} data - данные для обновления
     */
    async updateBooking(id, data) {
        return LaravelApiService.patch(`/business/bookings/${id}`, data)
    },

    /**
     * Удалить бронирование
     * @param {number|string} id - ID бронирования
     */
    async deleteBooking(id) {
        return LaravelApiService.delete(`/business/bookings/${id}`)
    },

    /**
     * Получить доступные слоты для бронирования
     * @param {Object} params - параметры (business_id, service_id, date)
     */
    async getAvailableSlots(params) {
        return LaravelApiService.get('/business/bookings/slots', params)
    },
}

export default BookingService

