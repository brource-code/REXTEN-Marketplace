<?php
// Тестовый скрипт для проверки подключения к PostgreSQL
header('Content-Type: text/plain; charset=utf-8');

echo "=== Проверка PostgreSQL ===\n\n";

// Проверка расширений
echo "1. Проверка расширений:\n";
if (extension_loaded('pdo_pgsql')) {
    echo "   ✅ pdo_pgsql загружен\n";
} else {
    echo "   ❌ pdo_pgsql НЕ загружен\n";
}

if (extension_loaded('pgsql')) {
    echo "   ✅ pgsql загружен\n";
} else {
    echo "   ❌ pgsql НЕ загружен\n";
}

// Проверка PDO драйверов
echo "\n2. Доступные PDO драйверы:\n";
$drivers = PDO::getAvailableDrivers();
foreach ($drivers as $driver) {
    echo "   - $driver\n";
}

// Проверка подключения
echo "\n3. Проверка подключения к PostgreSQL:\n";
try {
    $pdo = new PDO(
        'pgsql:host=127.0.0.1;dbname=ecme_marketplace',
        'rexten_user',
        'rexten_password'
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "   ✅ Подключение успешно\n";
    echo "   📊 Пользователей в базе: " . $result['count'] . "\n";
} catch (PDOException $e) {
    echo "   ❌ Ошибка подключения: " . $e->getMessage() . "\n";
}

// Информация о PHP
echo "\n4. Информация о PHP:\n";
echo "   Версия: " . PHP_VERSION . "\n";
echo "   SAPI: " . php_sapi_name() . "\n";
echo "   php.ini: " . php_ini_loaded_file() . "\n";
