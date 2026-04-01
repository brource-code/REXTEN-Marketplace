#!/bin/bash
# Скрипт для очистки всех упоминаний старых IP адресов

echo "🔍 Поиск всех упоминаний старых IP адресов..."

# Проверяем базу данных
echo ""
echo "📊 Проверка базы данных..."
cd /home/byrelaxx/rexten
docker-compose exec -T backend php artisan tinker --execute="
\$baseUrl = rtrim(config('app.url'), '/');
if (str_starts_with(\$baseUrl, 'http://') && !str_contains(\$baseUrl, 'localhost') && !str_contains(\$baseUrl, '127.0.0.1')) {
    \$baseUrl = str_replace('http://', 'https://', \$baseUrl);
}

function updateJsonImages(\$data, \$baseUrl, &\$needsUpdate) {
    if (is_array(\$data)) {
        foreach (\$data as \$key => &\$value) {
            if (is_array(\$value)) {
                \$value = updateJsonImages(\$value, \$baseUrl, \$needsUpdate);
            } elseif (is_string(\$value) && (str_contains(\$value, '192.168.1.120') || str_contains(\$value, '192.168.1.72'))) {
                if (preg_match('/http:\/\/(192\.168\.1\.(120|72)):\d+\//', \$value, \$matches)) {
                    \$parsedUrl = parse_url(\$value);
                    \$path = \$parsedUrl['path'] ?? '';
                    \$value = \$baseUrl . \$path;
                    \$needsUpdate = true;
                }
            }
        }
    }
    return \$data;
}

\$tables = ['advertisements', 'services', 'businesses', 'users', 'settings'];
\$totalUpdated = 0;

foreach (\$tables as \$table) {
    try {
        \$columns = DB::getSchemaBuilder()->getColumnListing(\$table);
        \$textColumns = [];
        \$jsonColumns = [];
        foreach (\$columns as \$col) {
            try {
                \$type = DB::getSchemaBuilder()->getColumnType(\$table, \$col);
                if (in_array(\$type, ['string', 'text', 'longtext', 'mediumtext'])) {
                    \$textColumns[] = \$col;
                } elseif (\$type === 'json') {
                    \$jsonColumns[] = \$col;
                }
            } catch (Exception \$e) {}
        }
        
        // Обновляем текстовые поля
        foreach (\$textColumns as \$col) {
            \$records = DB::table(\$table)
                ->where(\$col, 'like', '%192.168.1.120%')
                ->orWhere(\$col, 'like', '%192.168.1.72%')
                ->get();
            
            foreach (\$records as \$record) {
                \$value = \$record->\$col;
                if (preg_match('/http:\/\/(192\.168\.1\.(120|72)):\d+\//', \$value, \$matches)) {
                    \$parsedUrl = parse_url(\$value);
                    \$path = \$parsedUrl['path'] ?? '';
                    \$newValue = \$baseUrl . \$path;
                    
                    DB::table(\$table)->where('id', \$record->id)->update([\$col => \$newValue]);
                    echo \"✅ Updated \$table.\$col (ID: {\$record->id})\\n\";
                    \$totalUpdated++;
                }
            }
        }
        
        // Обновляем JSON поля
        foreach (\$jsonColumns as \$col) {
            \$records = DB::table(\$table)
                ->whereNotNull(\$col)
                ->where(\$col, '!=', '')
                ->get(['id', \$col]);
            
            foreach (\$records as \$record) {
                \$fieldValue = \$record->\$col;
                if (!\$fieldValue || (!str_contains(\$fieldValue, '192.168.1.120') && !str_contains(\$fieldValue, '192.168.1.72'))) {
                    continue;
                }
                
                \$data = json_decode(\$fieldValue, true);
                if (!is_array(\$data)) continue;
                
                \$needsUpdate = false;
                \$updatedData = updateJsonImages(\$data, \$baseUrl, \$needsUpdate);
                
                if (\$needsUpdate) {
                    DB::table(\$table)->where('id', \$record->id)->update([\$col => json_encode(\$updatedData)]);
                    echo \"✅ Updated \$table.\$col (ID: {\$record->id})\\n\";
                    \$totalUpdated++;
                }
            }
        }
    } catch (Exception \$e) {
        echo \"⚠️  Error processing table \$table: \" . \$e->getMessage() . \"\\n\";
    }
}

if (\$totalUpdated > 0) {
    echo \"\\n✅ Обновлено записей: \$totalUpdated\\n\";
} else {
    echo \"\\n✅ Записей с IP адресами не найдено\\n\";
}
"

echo ""
echo "✅ Очистка завершена!"
echo ""
echo "📝 Текущие настройки:"
echo "   - Backend URL: https://api.rexten.live"
echo "   - Frontend URL: https://dev.rexten.live (dev) / https://rexten.live (prod)"
echo ""
echo "⚠️  Примечание: Паттерны для локальных IP адресов в cors.php оставлены для разработки."
