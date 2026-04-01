<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Advertisement;
use App\Models\Service;

class MigrateServicesFromAdvertisements extends Command
{
    protected $signature = 'services:migrate-from-advertisements';
    protected $description = 'Миграция услуг из JSON объявлений в таблицу services';

    public function handle()
    {
        $this->info('Начинаем миграцию услуг из объявлений...');

        $advertisements = Advertisement::whereIn('type', ['regular', 'marketplace'])
            ->whereNotNull('services')
            ->get();

        $migrated = 0;
        $skipped = 0;

        foreach ($advertisements as $advertisement) {
            $services = is_array($advertisement->services) 
                ? $advertisement->services 
                : (json_decode($advertisement->services, true) ?? []);

            if (empty($services)) {
                continue;
            }

            foreach ($services as $serviceData) {
                $serviceId = $serviceData['id'] ?? $serviceData['service_id'] ?? null;
                
                // Если услуга уже существует в таблице services, пропускаем
                if ($serviceId) {
                    $existingService = Service::where('id', $serviceId)
                        ->where('company_id', $advertisement->company_id)
                        ->first();
                    
                    if ($existingService) {
                        $skipped++;
                        continue;
                    }
                }

                // Создаем услугу в таблице services
                $service = Service::create([
                    'company_id' => $advertisement->company_id,
                    'advertisement_id' => $advertisement->id,
                    'name' => $serviceData['name'] ?? 'Unknown',
                    'description' => $serviceData['description'] ?? null,
                    'price' => $serviceData['price'] ?? 0,
                    'duration_minutes' => $serviceData['duration'] ?? $serviceData['duration_minutes'] ?? 60,
                    'duration_unit' => $serviceData['duration_unit'] ?? 'hours',
                    'service_type' => $serviceData['service_type'] ?? 'onsite',
                    'is_active' => ($serviceData['is_active'] ?? $serviceData['status'] ?? 'active') === 'active',
                ]);

                // Обновляем JSON в объявлении с правильным ID
                $serviceData['id'] = $service->id;
                $serviceData['service_id'] = $service->id;
                
                $migrated++;
            }

            // Обновляем JSON в объявлении с правильными ID
            $updatedServices = array_map(function($serviceData) {
                if (isset($serviceData['service_id'])) {
                    $serviceData['id'] = $serviceData['service_id'];
                }
                return $serviceData;
            }, $services);

            $advertisement->update([
                'services' => $updatedServices
            ]);
        }

        $this->info("Миграция завершена!");
        $this->info("Создано услуг: {$migrated}");
        $this->info("Пропущено (уже существуют): {$skipped}");

        return 0;
    }
}

