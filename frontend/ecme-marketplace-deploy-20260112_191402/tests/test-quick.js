/**
 * Быстрый тест без необходимости запуска сервера
 * Проверяет только структуру данных и валидацию
 */

console.log('🧪 Быстрый тест структуры данных\n');

// Тест 1: Проверка структуры данных для рекламного объявления
console.log('✅ Тест 1: Структура данных рекламного объявления');
const advertisementData = {
    type: 'advertisement',
    title: 'Тестовое объявление',
    description: 'Описание',
    image: 'https://example.com/image.jpg',
    link: '/test',
    company_id: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 5,
    is_active: true,
};

const requiredFields = ['type', 'title', 'start_date', 'end_date'];
const missingFields = requiredFields.filter(field => !advertisementData[field]);

if (missingFields.length === 0) {
    console.log('   ✅ Все обязательные поля присутствуют');
} else {
    console.log(`   ❌ Отсутствуют поля: ${missingFields.join(', ')}`);
}

// Тест 2: Проверка структуры данных для обычного объявления
console.log('\n✅ Тест 2: Структура данных обычного объявления');
const regularData = {
    type: 'regular',
    title: 'Обычное объявление',
    description: 'Описание',
    image: 'https://example.com/image.jpg',
    link: '/test',
    company_id: 1,
    priority: 3,
    is_active: true,
    // start_date и end_date НЕ должны быть для обычных объявлений
};

if (!regularData.start_date && !regularData.end_date) {
    console.log('   ✅ Даты отсутствуют (правильно для обычных объявлений)');
} else {
    console.log('   ❌ Даты не должны присутствовать для обычных объявлений');
}

// Тест 3: Проверка типов данных
console.log('\n✅ Тест 3: Типы данных');
const typeChecks = [
    { field: 'type', value: regularData.type, expected: 'string', valid: typeof regularData.type === 'string' },
    { field: 'title', value: regularData.title, expected: 'string', valid: typeof regularData.title === 'string' },
    { field: 'priority', value: regularData.priority, expected: 'number', valid: typeof regularData.priority === 'number' },
    { field: 'is_active', value: regularData.is_active, expected: 'boolean', valid: typeof regularData.is_active === 'boolean' },
];

typeChecks.forEach(check => {
    if (check.valid) {
        console.log(`   ✅ ${check.field}: ${typeof check.value} (ожидалось: ${check.expected})`);
    } else {
        console.log(`   ❌ ${check.field}: ${typeof check.value} (ожидалось: ${check.expected})`);
    }
});

// Тест 4: Проверка валидных значений
console.log('\n✅ Тест 4: Валидные значения');
const validations = [
    { field: 'type', value: regularData.type, valid: ['advertisement', 'regular'].includes(regularData.type) },
    { field: 'priority', value: regularData.priority, valid: regularData.priority >= 1 && regularData.priority <= 10 },
    { field: 'is_active', value: regularData.is_active, valid: typeof regularData.is_active === 'boolean' },
];

validations.forEach(validation => {
    if (validation.valid) {
        console.log(`   ✅ ${validation.field}: ${validation.value} (валидно)`);
    } else {
        console.log(`   ❌ ${validation.field}: ${validation.value} (невалидно)`);
    }
});

// Тест 5: Проверка массивов (услуги, команда, портфолио)
console.log('\n✅ Тест 5: Структура массивов');
const testArrays = {
    services: [],
    team: [],
    portfolio: [],
};

Object.keys(testArrays).forEach(key => {
    const arr = testArrays[key];
    if (Array.isArray(arr)) {
        console.log(`   ✅ ${key}: массив (${arr.length} элементов)`);
    } else {
        console.log(`   ❌ ${key}: не массив`);
    }
});

// Тест 6: Проверка расписания
console.log('\n✅ Тест 6: Структура расписания');
const schedule = {
    monday: { isOpen: true, start: '09:00', end: '18:00' },
    tuesday: { isOpen: true, start: '09:00', end: '18:00' },
    wednesday: { isOpen: false },
};

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
days.forEach(day => {
    if (schedule[day]) {
        const daySchedule = schedule[day];
        if (daySchedule.isOpen && daySchedule.start && daySchedule.end) {
            console.log(`   ✅ ${day}: открыто ${daySchedule.start}-${daySchedule.end}`);
        } else if (!daySchedule.isOpen) {
            console.log(`   ✅ ${day}: закрыто`);
        } else {
            console.log(`   ⚠️  ${day}: неполные данные`);
        }
    } else {
        console.log(`   ⚠️  ${day}: не задано`);
    }
});

console.log('\n✅ Быстрый тест завершен!');
console.log('💡 Для полного тестирования запустите: npm run test:advertisements');

