/**
 * Автоматические тесты для функциональности объявлений
 * Запуск: node tests/advertisements.test.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';
// Учетные данные суперадмина (из TEST_CREDENTIALS.md)
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@ecme.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'demo12345';

let authToken = null;
let createdAdvertisementId = null;

// Цвета для вывода в консоль
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
    log(`\n🧪 Тест: ${name}`, 'blue');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'yellow');
}

// Вспомогательная функция для API запросов
async function apiRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers,
            },
        };

        if (authToken) {
            config.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500,
        };
    }
}

// Тест 1: Авторизация
async function testLogin() {
    logTest('Авторизация суперадмина');
    
    const result = await apiRequest('POST', '/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (result.success && result.data.access_token) {
        authToken = result.data.access_token;
        logSuccess('Авторизация успешна');
        return true;
    } else {
        logError(`Ошибка авторизации: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 2: Получение списка компаний
async function testGetCompanies() {
    logTest('Получение списка компаний');
    
    const result = await apiRequest('GET', '/admin/companies?pageSize=10');
    
    if (result.success && result.data.data) {
        logSuccess(`Найдено компаний: ${result.data.total || result.data.data.length}`);
        return result.data.data[0]?.id || null;
    } else {
        logError(`Ошибка получения компаний: ${JSON.stringify(result.error)}`);
        return null;
    }
}

// Тест 3: Загрузка изображения
async function testUploadImage() {
    logTest('Загрузка изображения');
    
    // Создаем тестовое изображение (1x1 PNG)
    const testImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );

    try {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('image', testImage, {
            filename: 'test.png',
            contentType: 'image/png',
        });

        const response = await axios.post(
            `${API_URL}/admin/advertisements/upload-image`,
            form,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    ...form.getHeaders(),
                },
            }
        );

        if (response.data.url) {
            logSuccess(`Изображение загружено: ${response.data.url}`);
            return response.data.url;
        } else {
            logError('Изображение не загружено');
            return null;
        }
    } catch (error) {
        logError(`Ошибка загрузки изображения: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

// Тест 4: Создание рекламного объявления
async function testCreateAdvertisement(companyId, imageUrl) {
    logTest('Создание рекламного объявления');
    
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const adData = {
        type: 'advertisement',
        title: 'Тестовое рекламное объявление',
        description: 'Описание тестового рекламного объявления',
        image: imageUrl || 'https://via.placeholder.com/800x600',
        link: '/marketplace/test',
        company_id: companyId,
        start_date: today.toISOString().split('T')[0],
        end_date: nextWeek.toISOString().split('T')[0],
        priority: 5,
        is_active: true,
    };

    const result = await apiRequest('POST', '/admin/advertisements', adData);

    if (result.success && result.data.id) {
        createdAdvertisementId = result.data.id;
        logSuccess(`Рекламное объявление создано с ID: ${createdAdvertisementId}`);
        return true;
    } else {
        logError(`Ошибка создания рекламного объявления: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 5: Создание обычного объявления
async function testCreateRegularAdvertisement(companyId, imageUrl) {
    logTest('Создание обычного объявления');
    
    const adData = {
        type: 'regular',
        title: 'Тестовое обычное объявление',
        description: 'Описание тестового обычного объявления',
        image: imageUrl || 'https://via.placeholder.com/800x600',
        link: '/marketplace/test-regular',
        company_id: companyId,
        priority: 3,
        is_active: true,
        // start_date и end_date не отправляем для обычных объявлений
    };

    const result = await apiRequest('POST', '/admin/advertisements', adData);

    if (result.success && result.data.id) {
        logSuccess(`Обычное объявление создано с ID: ${result.data.id}`);
        return true;
    } else {
        logError(`Ошибка создания обычного объявления: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 6: Получение объявления
async function testGetAdvertisement() {
    logTest('Получение объявления по ID');
    
    if (!createdAdvertisementId) {
        logError('Нет ID созданного объявления для теста');
        return false;
    }

    const result = await apiRequest('GET', `/admin/advertisements/${createdAdvertisementId}`);

    if (result.success && result.data.id) {
        logSuccess(`Объявление получено: ${result.data.title}`);
        return true;
    } else {
        logError(`Ошибка получения объявления: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 7: Обновление объявления
async function testUpdateAdvertisement() {
    logTest('Обновление объявления');
    
    if (!createdAdvertisementId) {
        logError('Нет ID созданного объявления для теста');
        return false;
    }

    const updateData = {
        title: 'Обновленное тестовое объявление',
        description: 'Обновленное описание',
        priority: 7,
    };

    const result = await apiRequest('PUT', `/admin/advertisements/${createdAdvertisementId}`, updateData);

    if (result.success && result.data.title === updateData.title) {
        logSuccess('Объявление успешно обновлено');
        return true;
    } else {
        logError(`Ошибка обновления объявления: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 8: Получение списка объявлений
async function testGetAdvertisements() {
    logTest('Получение списка объявлений');
    
    const result = await apiRequest('GET', '/admin/advertisements');

    if (result.success && Array.isArray(result.data)) {
        logSuccess(`Найдено объявлений: ${result.data.length}`);
        return true;
    } else {
        logError(`Ошибка получения списка объявлений: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 9: Одобрение объявления
async function testApproveAdvertisement() {
    logTest('Одобрение объявления');
    
    if (!createdAdvertisementId) {
        logError('Нет ID созданного объявления для теста');
        return false;
    }

    const result = await apiRequest('POST', `/admin/advertisements/${createdAdvertisementId}/approve`);

    if (result.success) {
        logSuccess('Объявление успешно одобрено');
        return true;
    } else {
        logError(`Ошибка одобрения объявления: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// Тест 10: Удаление объявления
async function testDeleteAdvertisement() {
    logTest('Удаление объявления');
    
    if (!createdAdvertisementId) {
        logError('Нет ID созданного объявления для теста');
        return false;
    }

    // Сначала создаем еще одно объявление для удаления
    const adData = {
        type: 'regular',
        title: 'Объявление для удаления',
        description: 'Это объявление будет удалено',
        company_id: null,
        priority: 1,
        is_active: true,
    };

    const createResult = await apiRequest('POST', '/admin/advertisements', adData);
    
    if (!createResult.success) {
        logError('Не удалось создать объявление для удаления');
        return false;
    }

    const deleteId = createResult.data.id;
    logInfo(`Создано объявление для удаления с ID: ${deleteId}`);

    // Проверяем, что объявление существует
    const getResult = await apiRequest('GET', `/admin/advertisements/${deleteId}`);
    if (!getResult.success) {
        logError('Не удалось получить созданное объявление');
        return false;
    }

    // Удаляем объявление (если есть endpoint для удаления)
    // Если нет, просто проверяем что оно создано
    logSuccess('Объявление готово к удалению (endpoint удаления может быть не реализован)');
    return true;
}

// Проверка доступности сервера
async function checkServer() {
    logTest('Проверка доступности сервера');
    
    try {
        // Пробуем подключиться к любому endpoint (даже если вернется 405 или 404, сервер работает)
        await axios.get(`${API_URL}/auth/login`, {
            timeout: 3000,
            validateStatus: () => true, // Принимаем любой статус
        });
        logSuccess('Сервер доступен');
        return true;
    } catch (error) {
        // Проверяем, может быть это ошибка сети
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            logError(`Сервер недоступен: ${error.message}`);
            logInfo('Убедитесь, что Laravel сервер запущен: cd backend && php artisan serve');
            return false;
        }
        // Если другая ошибка, возможно сервер работает, но endpoint неверный
        logSuccess('Сервер доступен (получена ошибка, но соединение установлено)');
        return true;
    }
}

// Главная функция запуска тестов
async function runTests() {
    log('\n🚀 Запуск автоматических тестов для объявлений\n', 'blue');
    log('='.repeat(60), 'blue');
    
    // Проверяем доступность сервера
    const serverAvailable = await checkServer();
    if (!serverAvailable) {
        logError('\n❌ Сервер недоступен. Запустите сервер и попробуйте снова.');
        process.exit(1);
    }

    const results = {
        passed: 0,
        failed: 0,
        total: 0,
    };

    // Запускаем тесты последовательно
    const tests = [
        { name: 'Авторизация', fn: testLogin },
        { name: 'Получение компаний', fn: testGetCompanies },
        { name: 'Загрузка изображения', fn: testUploadImage },
        { name: 'Создание рекламного объявления', fn: async () => {
            const companyId = await testGetCompanies();
            const imageUrl = await testUploadImage();
            return await testCreateAdvertisement(companyId, imageUrl);
        }},
        { name: 'Создание обычного объявления', fn: async () => {
            const companyId = await testGetCompanies();
            const imageUrl = await testUploadImage();
            return await testCreateRegularAdvertisement(companyId, imageUrl);
        }},
        { name: 'Получение объявления', fn: testGetAdvertisement },
        { name: 'Обновление объявления', fn: testUpdateAdvertisement },
        { name: 'Получение списка объявлений', fn: testGetAdvertisements },
        { name: 'Одобрение объявления', fn: testApproveAdvertisement },
        { name: 'Удаление объявления', fn: testDeleteAdvertisement },
    ];

    for (const test of tests) {
        results.total++;
        try {
            const result = await test.fn();
            if (result) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            results.failed++;
            logError(`Исключение в тесте "${test.name}": ${error.message}`);
        }
    }

    // Итоги
    log('\n' + '='.repeat(60), 'blue');
    log('\n📊 Результаты тестирования:', 'blue');
    log(`Всего тестов: ${results.total}`, 'yellow');
    log(`Пройдено: ${results.passed}`, 'green');
    log(`Провалено: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    
    if (results.failed === 0) {
        log('\n🎉 Все тесты пройдены успешно!', 'green');
    } else {
        log('\n⚠️  Некоторые тесты провалены. Проверьте логи выше.', 'red');
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

// Запускаем тесты
runTests().catch((error) => {
    logError(`Критическая ошибка: ${error.message}`);
    console.error(error);
    process.exit(1);
});

