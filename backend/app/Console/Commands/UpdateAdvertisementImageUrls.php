<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class UpdateAdvertisementImageUrls extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'advertisements:update-image-urls';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Обновляет URL изображений в объявлениях, заменяя IP адреса на домен';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Начинаем обновление URL изображений...');
        
        // Определяем правильный домен в зависимости от окружения
        $baseUrl = rtrim(config('app.url'), '/');
        
        // Если baseUrl содержит http://, заменяем на https:// для продакшена
        if (str_starts_with($baseUrl, 'http://') && !str_contains($baseUrl, 'localhost') && !str_contains($baseUrl, '127.0.0.1')) {
            $baseUrl = str_replace('http://', 'https://', $baseUrl);
        }
        
        $this->info("Используем базовый URL: {$baseUrl}");
        
        // Обновляем URL изображений в таблице advertisements
        $updated = 0;
        $skipped = 0;
        
        DB::table('advertisements')
            ->whereNotNull('image')
            ->where('image', '!=', '')
            ->get()
            ->each(function ($ad) use ($baseUrl, &$updated, &$skipped) {
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
                    
                    $this->line("Обновлено объявление ID {$ad->id}: {$image} -> {$newUrl}");
                    $updated++;
                } else {
                    $skipped++;
                }
            });
        
        $this->info("Обновлено: {$updated} записей");
        $this->info("Пропущено: {$skipped} записей (уже правильный URL)");
        
        return Command::SUCCESS;
    }
}
