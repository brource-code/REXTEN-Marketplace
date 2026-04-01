<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Advertisement;
use App\Models\Service;

class SyncServiceIdsInAdvertisements extends Command
{
    protected $signature = 'services:sync-ids-in-advertisements {--company-id= : Синхронизировать только для указанной компании}';
    protected $description = 'Синхронизация ID услуг в JSON объявлений с реальными ID из таблицы services';

    public function handle()
    {
        $this->info('Начинаем синхронизацию ID услуг в объявлениях...');

        $companyId = $this->option('company-id');
        
        $query = Advertisement::whereIn('type', ['regular', 'marketplace'])
            ->whereNotNull('services');
            
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
        
        $advertisements = $query->get();

        $synced = 0;
        $notFound = 0;
        $errors = 0;

        foreach ($advertisements as $advertisement) {
            $services = is_array($advertisement->services) 
                ? $advertisement->services 
                : (json_decode($advertisement->services, true) ?? []);

            if (empty($services)) {
                continue;
            }

            $updated = false;
            $updatedServices = [];

            foreach ($services as $serviceData) {
                $serviceName = $serviceData['name'] ?? '';
                $oldId = $serviceData['id'] ?? $serviceData['service_id'] ?? null;
                
                if (empty($serviceName)) {
                    // Пропускаем услуги без имени
                    $updatedServices[] = $serviceData;
                    continue;
                }

                // Ищем услугу в таблице services по имени и компании
                $serviceModel = Service::where('company_id', $advertisement->company_id)
                    ->where('name', $serviceName)
                    ->first();

                if ($serviceModel) {
                    // Нашли услугу в таблице - обновляем ID
                    $newId = $serviceModel->id;
                    
                    if ($oldId != $newId) {
                        $this->line("  Обновлено: '{$serviceName}' - ID {$oldId} -> {$newId}");
                        $updated = true;
                    }
                    
                    $updatedServices[] = array_merge($serviceData, [
                        'id' => (string) $newId,
                        'service_id' => $newId,
                        'service_type' => $serviceModel->service_type ?? ($serviceData['service_type'] ?? 'onsite'),
                    ]);
                } else {
                    // Услуга не найдена в таблице - оставляем как есть, но логируем
                    $this->warn("  Не найдено: '{$serviceName}' (ID в JSON: {$oldId})");
                    $notFound++;
                    $updatedServices[] = $serviceData;
                }
            }

            if ($updated) {
                try {
                    $advertisement->update([
                        'services' => $updatedServices
                    ]);
                    $synced++;
                    $this->info("✓ Объявление #{$advertisement->id} (компания #{$advertisement->company_id}) синхронизировано");
                } catch (\Exception $e) {
                    $this->error("✗ Ошибка при обновлении объявления #{$advertisement->id}: " . $e->getMessage());
                    $errors++;
                }
            }
        }

        $this->info("\nСинхронизация завершена!");
        $this->info("Синхронизировано объявлений: {$synced}");
        $this->info("Услуг не найдено: {$notFound}");
        if ($errors > 0) {
            $this->error("Ошибок: {$errors}");
        }

        return 0;
    }
}

