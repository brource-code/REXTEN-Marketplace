<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use App\Models\AdditionalService;
use App\Models\Advertisement;
use App\Models\Service;

class MigrateAdditionalServicesToServiceId extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:additional-services-to-service-id';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate additional services from advertisement_id to service_id';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Проверяем, существует ли колонка advertisement_id
        $columns = Schema::getColumnListing('additional_services');
        if (!in_array('advertisement_id', $columns)) {
            $this->info('Column advertisement_id does not exist. Migration may have already been run.');
            return;
        }
        
        // Получаем дополнительные услуги с advertisement_id (если поле еще существует)
        // Проверяем через DB напрямую, так как поле может быть удалено из модели
        $additionalServices = \DB::table('additional_services')
            ->whereNotNull('advertisement_id')
            ->get();
        
        $migratedCount = 0;
        $skippedCount = 0;
        
        foreach ($additionalServices as $additionalServiceData) {
            $additionalService = AdditionalService::find($additionalServiceData->id);
            if (!$additionalService) {
                $this->warn('Skipping additional service ' . $additionalServiceData->id . ' - not found');
                $skippedCount++;
                continue;
            }
            
            // Если уже есть service_id, пропускаем
            if ($additionalService->service_id) {
                $this->info('Skipping additional service ' . $additionalService->id . ' - already has service_id');
                continue;
            }
            
            // Проверяем что объявление НЕ рекламное (используем метод)
            $advertisement = Advertisement::find($additionalServiceData->advertisement_id);
            if (!$advertisement) {
                $this->warn('Skipping additional service ' . $additionalService->id . ' - advertisement not found');
                $skippedCount++;
                continue;
            }
            
            if ($advertisement->isAdType()) {
                $this->warn('Skipping additional service ' . $additionalService->id . ' - belongs to ad type (not touching)');
                $skippedCount++;
                continue;
            }
            
            // Найти услугу в services по advertisement_id
            // Если есть service_json_id, пытаемся найти конкретную услугу
            $service = null;
            
            if (isset($additionalServiceData->service_json_id) && $additionalServiceData->service_json_id) {
                // Ищем услугу по advertisement_id и позиции в JSON
                $adServices = Service::where('advertisement_id', $additionalServiceData->advertisement_id)
                    ->get();
                
                // Пытаемся найти по service_json_id в JSON объявления
                $servicesJson = json_decode($advertisement->services, true);
                if (is_array($servicesJson)) {
                    foreach ($servicesJson as $index => $s) {
                        if (isset($s['id']) && $s['id'] == $additionalServiceData->service_json_id) {
                            // Берем услугу по индексу
                            if (isset($adServices[$index])) {
                                $service = $adServices[$index];
                            }
                            break;
                        }
                    }
                }
            }
            
            // Если не нашли по service_json_id, берем первую услугу из объявления
            if (!$service) {
                $service = Service::where('advertisement_id', $additionalServiceData->advertisement_id)
                    ->first();
            }
            
            if ($service) {
                // Обновляем через DB напрямую, так как поле может быть удалено из fillable
                \DB::table('additional_services')
                    ->where('id', $additionalService->id)
                    ->update([
                        'service_id' => $service->id,
                    ]);
                
                $migratedCount++;
                $this->info('Migrated additional service ' . $additionalService->id . ' to service_id ' . $service->id);
            } else {
                $this->warn('Could not find service for additional service ' . $additionalService->id);
                $skippedCount++;
            }
        }
        
        // Обработка записей без связей (id=1)
        $orphanedServices = AdditionalService::whereNull('service_id')
            ->get();
        
        foreach ($orphanedServices as $orphaned) {
            $hasAdvertisementId = \DB::table('additional_services')
                ->where('id', $orphaned->id)
                ->whereNotNull('advertisement_id')
                ->exists();
            
            if (!$hasAdvertisementId) {
                $this->warn('Found orphaned additional service ' . $orphaned->id . ' - no service_id or advertisement_id');
            }
        }
        
        $this->info('Migration complete!');
        $this->info('Migrated: ' . $migratedCount);
        $this->info('Skipped: ' . $skippedCount);
        $this->info('Orphaned: ' . $orphanedServices->count());
    }
}

