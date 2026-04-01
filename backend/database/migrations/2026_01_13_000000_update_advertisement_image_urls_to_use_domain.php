<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Обновляет URL изображений в таблице advertisements, заменяя IP адреса на домен.
     * Заменяет:
     * - http://192.168.1.120:8000 -> https://api.rexten.live (или https://dev.rexten.live для dev)
     * - http://localhost:8000 -> https://api.rexten.live (или https://dev.rexten.live для dev)
     * - http://127.0.0.1:8000 -> https://api.rexten.live (или https://dev.rexten.live для dev)
     */
    public function up()
    {
        // Определяем правильный домен в зависимости от окружения
        $baseUrl = rtrim(config('app.url'), '/');
        
        // Если baseUrl содержит http://, заменяем на https:// для продакшена
        if (str_starts_with($baseUrl, 'http://') && !str_contains($baseUrl, 'localhost') && !str_contains($baseUrl, '127.0.0.1')) {
            $baseUrl = str_replace('http://', 'https://', $baseUrl);
        }
        
        // Обновляем URL изображений в таблице advertisements
        // Заменяем все IP адреса и localhost на правильный домен
        $updated = 0;
        DB::table('advertisements')
            ->whereNotNull('image')
            ->where('image', '!=', '')
            ->get()
            ->each(function ($ad) use ($baseUrl, &$updated) {
                $image = $ad->image;
                
                // Проверяем, содержит ли URL IP адрес или localhost
                if (preg_match('/http:\/\/(192\.168\.\d+\.\d+|localhost|127\.0\.0\.1):\d+\//', $image)) {
                    // Извлекаем путь из старого URL
                    $parsedUrl = parse_url($image);
                    $path = $parsedUrl['path'] ?? '';
                    
                    // Формируем новый URL с правильным доменом
                    $newUrl = $baseUrl . $path;
                    
                    // Обновляем запись
                    DB::table('advertisements')
                        ->where('id', $ad->id)
                        ->update(['image' => $newUrl]);
                    
                    $updated++;
                }
            });
        
        \Log::info("Updated {$updated} advertisement image URLs from IP addresses to domain");
    }

    /**
     * Reverse the migrations.
     * 
     * Откат миграции не требуется, так как мы просто обновляем URL.
     */
    public function down()
    {
        // Откат не требуется
    }
};
