<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Advertisement;
use App\Models\Service;

class MigrateAdvertisementServicesToTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:advertisement-services';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate services from JSON in advertisements to services table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // ВАЖНО: Мигрируем ТОЛЬКО marketplace объявления (НЕ рекламные)
        // Используем константы для четкого различения
        $advertisements = Advertisement::whereNotNull('services')
            ->where('services', '!=', '[]')
            ->where(function($q) {
                $q->where('type', Advertisement::TYPE_MARKETPLACE)
                  ->orWhere('type', Advertisement::TYPE_REGULAR)
                  ->orWhereNull('type');
            })
            ->get();
        
        $adCount = Advertisement::whereIn('type', [Advertisement::TYPE_AD, Advertisement::TYPE_ADVERTISEMENT])
            ->count();
        
        $this->info('Found ' . $advertisements->count() . ' marketplace advertisements to migrate');
        $this->info('Skipping ' . $adCount . ' ad type advertisements (not touching)');
        
        $migratedCount = 0;
        foreach ($advertisements as $ad) {
            // Обрабатываем services как JSON строку или массив (из-за cast в модели)
            $servicesJson = is_string($ad->services) ? json_decode($ad->services, true) : $ad->services;
            if (!is_array($servicesJson)) {
                $this->warn('Skipping advertisement ' . $ad->id . ' - invalid services JSON');
                continue;
            }
            
            // Пропускаем пустые массивы
            if (empty($servicesJson)) {
                $this->info('Skipping advertisement ' . $ad->id . ' - empty services array');
                continue;
            }
            
            // Проверяем, не мигрированы ли уже услуги (если есть услуги с advertisement_id)
            $existingServices = Service::where('advertisement_id', $ad->id)->count();
            if ($existingServices > 0) {
                $this->info('Skipping advertisement ' . $ad->id . ' - services already migrated');
                continue;
            }
            
            $serviceIds = [];
            foreach ($servicesJson as $serviceData) {
                // Пропускаем если это уже ссылка на service_id
                if (isset($serviceData['id']) && is_numeric($serviceData['id'])) {
                    // Проверяем, существует ли уже такая услуга
                    $existingService = Service::find($serviceData['id']);
                    if ($existingService && $existingService->advertisement_id == $ad->id) {
                        $serviceIds[] = $existingService->id;
                        continue;
                    }
                }
                
                // Создаем услугу в services
                $service = Service::create([
                    'company_id' => $ad->company_id,
                    'advertisement_id' => $ad->id,
                    'name' => $serviceData['name'] ?? 'Unknown',
                    'description' => $serviceData['description'] ?? null,
                    'price' => $serviceData['price'] ?? 0,
                    'duration' => $serviceData['duration'] ?? $serviceData['duration_minutes'] ?? 60,
                    'is_active' => true,
                ]);
                
                $serviceIds[] = $service->id;
            }
            
            // Обновляем JSON на ссылки
            $ad->services = json_encode(array_map(fn($id) => ['id' => $id], $serviceIds));
            $ad->save();
            
            $migratedCount++;
            $this->info('Migrated advertisement ' . $ad->id . ' - ' . count($serviceIds) . ' services');
        }
        
        $this->info('Migration complete! Migrated ' . $migratedCount . ' marketplace advertisements');
    }
}

