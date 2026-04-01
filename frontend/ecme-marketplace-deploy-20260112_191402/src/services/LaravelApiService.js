import LaravelAxios from './axios/LaravelAxios'

/**
 * Базовый сервис для работы с Laravel API
 * Используется для всех запросов к Laravel backend
 */
const LaravelApiService = {
    /**
     * Универсальный метод для выполнения запросов к Laravel API
     * @param {Object} param - параметры запроса (url, method, data, params)
     * @returns {Promise} - промис с данными ответа
     */
    async fetchData(param) {
        return new Promise((resolve, reject) => {
            LaravelAxios(param)
                .then((response) => {
                    resolve(response.data)
                })
                .catch((error) => {
                    reject(error.response?.data || error.message)
                })
        })
    },

    /**
     * GET запрос
     */
    async get(url, params = {}) {
        return this.fetchData({
            url,
            method: 'get',
            params,
        })
    },

    /**
     * POST запрос
     */
    async post(url, data = {}) {
        return this.fetchData({
            url,
            method: 'post',
            data,
        })
    },

    /**
     * PUT запрос
     */
    async put(url, data = {}) {
        return this.fetchData({
            url,
            method: 'put',
            data,
        })
    },

    /**
     * PATCH запрос
     */
    async patch(url, data = {}) {
        return this.fetchData({
            url,
            method: 'patch',
            data,
        })
    },

    /**
     * DELETE запрос
     */
    async delete(url) {
        return this.fetchData({
            url,
            method: 'delete',
        })
    },
}

export default LaravelApiService

