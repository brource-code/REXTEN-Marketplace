/**
 * Mock сервис для авторизации
 * Используется для разработки без бэкенда
 * Данные хранятся в localStorage
 */

import { setAccessToken, setRefreshToken } from '@/utils/auth/tokenStorage'

// Mock пользователи для тестирования
const MOCK_USERS = [
    {
        id: 1,
        name: 'Иван Иванов',
        email: 'client@ecme.com',
        password: 'demo12345', // В реальном приложении пароль должен быть хеширован
        role: 'CLIENT',
        avatar: null,
    },
    {
        id: 2,
        name: 'Петр Петров',
        email: 'business@ecme.com',
        password: 'demo12345',
        role: 'BUSINESS_OWNER',
        avatar: null,
    },
    {
        id: 3,
        name: 'Администратор',
        email: 'admin@ecme.com',
        password: 'demo12345',
        role: 'SUPERADMIN',
        avatar: null,
    },
]

// Генерация простого JWT токена (для демонстрации)
function generateToken(payload, expiresIn = '24h') {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const exp = Date.now() + (expiresIn === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
    const tokenPayload = { ...payload, exp }
    const body = btoa(JSON.stringify(tokenPayload))
    return `${header}.${body}.mock_signature`
}

// Имитация задержки сети
function delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const MockAuthService = {
    /**
     * Вход в систему
     * @param {Object} credentials - {email, password}
     * @returns {Promise} - возвращает {access_token, refresh_token, user}
     */
    async login(credentials) {
        await delay(800) // Имитация запроса к серверу

        const { email, password } = credentials

        // Ищем пользователя
        const user = MOCK_USERS.find(
            u => u.email === email && u.password === password
        )

        if (!user) {
            const error = new Error('Неверный email или пароль')
            error.response = {
                status: 401,
                data: {
                    message: 'Неверный email или пароль',
                    errors: {},
                },
            }
            throw error
        }

        // Генерируем токены
        const accessToken = generateToken(
            {
                user_id: user.id,
                email: user.email,
                role: user.role,
            },
            '24h'
        )

        const refreshToken = generateToken(
            {
                user_id: user.id,
                type: 'refresh',
            },
            '7d'
        )

        // Сохраняем токены
        setAccessToken(accessToken)
        setRefreshToken(refreshToken)

        // Возвращаем данные без пароля
        const { password: _, ...userWithoutPassword } = user

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: userWithoutPassword,
        }
    },

    /**
     * Регистрация
     * @param {Object} data - данные пользователя {name, email, password, password_confirmation, role?}
     * @returns {Promise} - возвращает {access_token, refresh_token, user}
     */
    async register(data) {
        await delay(1000)

        const { name, email, password, password_confirmation, role = 'CLIENT' } = data

        // Валидация
        if (password !== password_confirmation) {
            const error = new Error('Пароли не совпадают')
            error.response = {
                status: 422,
                data: {
                    message: 'Пароли не совпадают',
                    errors: {
                        password: ['Пароли не совпадают'],
                    },
                },
            }
            throw error
        }

        if (password.length < 6) {
            const error = new Error('Пароль должен содержать минимум 6 символов')
            error.response = {
                status: 422,
                data: {
                    message: 'Пароль должен содержать минимум 6 символов',
                    errors: {
                        password: ['Пароль должен содержать минимум 6 символов'],
                    },
                },
            }
            throw error
        }

        // Проверяем, не существует ли уже пользователь с таким email
        const existingUser = MOCK_USERS.find(u => u.email === email)
        if (existingUser) {
            const error = new Error('Пользователь с таким email уже существует')
            error.response = {
                status: 422,
                data: {
                    message: 'Пользователь с таким email уже существует',
                    errors: {
                        email: ['Пользователь с таким email уже существует'],
                    },
                },
            }
            throw error
        }

        // Создаем нового пользователя
        const newUser = {
            id: MOCK_USERS.length + 1,
            name,
            email,
            password, // В реальном приложении должен быть хеширован
            role: role === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'CLIENT',
            avatar: null,
        }

        // Добавляем в список (в реальном приложении сохраняли бы в БД)
        MOCK_USERS.push(newUser)

        // Генерируем токены
        const accessToken = generateToken(
            {
                user_id: newUser.id,
                email: newUser.email,
                role: newUser.role,
            },
            '24h'
        )

        const refreshToken = generateToken(
            {
                user_id: newUser.id,
                type: 'refresh',
            },
            '7d'
        )

        // Сохраняем токены
        setAccessToken(accessToken)
        setRefreshToken(refreshToken)

        const { password: _, ...userWithoutPassword } = newUser

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: userWithoutPassword,
        }
    },

    /**
     * Выход из системы
     */
    async logout() {
        await delay(300)
        // Токены очищаются в authStore
        return {}
    },

    /**
     * Обновить токен
     * @param {string} refreshToken - refresh token
     * @returns {Promise} - возвращает новый access_token и refresh_token
     */
    async refreshToken(refreshToken) {
        await delay(500)

        if (!refreshToken) {
            const error = new Error('Refresh token не предоставлен')
            error.response = { status: 401, data: { message: 'Unauthorized' } }
            throw error
        }

        try {
            // Парсим токен (упрощенная версия)
            const parts = refreshToken.split('.')
            if (parts.length !== 3) {
                throw new Error('Invalid token')
            }

            const payload = JSON.parse(atob(parts[1]))

            // Проверяем срок действия
            if (payload.exp && payload.exp < Date.now()) {
                throw new Error('Token expired')
            }

            // Находим пользователя
            const user = MOCK_USERS.find(u => u.id === payload.user_id)
            if (!user) {
                throw new Error('User not found')
            }

            // Генерируем новые токены
            const newAccessToken = generateToken(
                {
                    user_id: user.id,
                    email: user.email,
                    role: user.role,
                },
                '24h'
            )

            const newRefreshToken = generateToken(
                {
                    user_id: user.id,
                    type: 'refresh',
                },
                '7d'
            )

            setAccessToken(newAccessToken)
            setRefreshToken(newRefreshToken)

            return {
                access_token: newAccessToken,
                refresh_token: newRefreshToken,
            }
        } catch (error) {
            const authError = new Error('Невалидный refresh token')
            authError.response = { status: 401, data: { message: 'Unauthorized' } }
            throw authError
        }
    },

    /**
     * Получить текущего пользователя
     * @returns {Promise} - возвращает данные пользователя
     */
    async getCurrentUser() {
        await delay(500)

        // Получаем токен из localStorage
        const token = localStorage.getItem('auth_token')
        if (!token) {
            const error = new Error('Не авторизован')
            error.response = { status: 401, data: { message: 'Unauthorized' } }
            throw error
        }

        try {
            // Парсим токен
            const parts = token.split('.')
            if (parts.length !== 3) {
                throw new Error('Invalid token')
            }

            const payload = JSON.parse(atob(parts[1]))

            // Проверяем срок действия
            if (payload.exp && payload.exp < Date.now()) {
                throw new Error('Token expired')
            }

            // Находим пользователя
            const user = MOCK_USERS.find(u => u.id === payload.user_id)
            if (!user) {
                throw new Error('User not found')
            }

            const { password: _, ...userWithoutPassword } = user

            return userWithoutPassword
        } catch (error) {
            const authError = new Error('Невалидный токен')
            authError.response = { status: 401, data: { message: 'Unauthorized' } }
            throw authError
        }
    },

    /**
     * Восстановление пароля
     * @param {Object} data - {email}
     */
    async forgotPassword(data) {
        await delay(800)
        // В mock версии просто возвращаем успех
        return {
            message: 'Инструкции по восстановлению пароля отправлены на email',
        }
    },

    /**
     * Сброс пароля
     * @param {Object} data - {token, email, password, password_confirmation}
     */
    async resetPassword(data) {
        await delay(800)
        return {
            message: 'Пароль успешно изменен',
        }
    },
}

export default MockAuthService

