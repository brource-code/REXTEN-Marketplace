<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$baseUrl = rtrim(config('app.url'), '/');
if (str_starts_with($baseUrl, 'http://') && !str_contains($baseUrl, 'localhost') && !str_contains($baseUrl, '127.0.0.1')) {
    $baseUrl = str_replace('http://', 'https://', $baseUrl);
}

echo "Используем базовый URL: {$baseUrl}\n";

$updated = 0;
DB::table('advertisements')
    ->whereNotNull('image')
    ->where('image', '!=', '')
    ->get()
    ->each(function ($ad) use ($baseUrl, &$updated) {
        $image = $ad->image;
        if (preg_match('/http:\/\/(192\.168\.\d+\.\d+|localhost|127\.0\.0\.1):\d+\//', $image)) {
            $parsedUrl = parse_url($image);
            $path = $parsedUrl['path'] ?? '';
            $newUrl = $baseUrl . $path;
            DB::table('advertisements')->where('id', $ad->id)->update(['image' => $newUrl]);
            echo "Обновлено ID {$ad->id}: {$image} -> {$newUrl}\n";
            $updated++;
        }
    });

echo "Обновлено: {$updated} записей\n";
