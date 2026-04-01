<?php

namespace App\Observers;

use App\Models\Advertisement;
use App\Models\BusinessEvent;
use App\Enums\BusinessEventType;

class AdvertisementEventObserver
{
    /**
     * Handle the Advertisement "updated" event.
     * Создаёт событие "Рекламная кампания запущена" когда статус меняется на approved и is_active = true
     */
    public function updated(Advertisement $advertisement)
    {
        // Проверяем, что статус изменился на approved и реклама активна
        if ($advertisement->isDirty('status') 
            && $advertisement->status === 'approved' 
            && $advertisement->is_active
            && $advertisement->type === Advertisement::TYPE_AD) {
            
            BusinessEvent::create([
                'type' => BusinessEventType::CAMPAIGN_STARTED->value,
                'title' => 'Рекламная кампания запущена',
                'description' => "Запущена рекламная кампания \"{$advertisement->title}\"",
                'company_id' => $advertisement->company_id,
                'user_id' => null,
                'amount' => null,
                'metadata' => [
                    'advertisement_id' => $advertisement->id,
                    'advertisement_title' => $advertisement->title,
                    'start_date' => $advertisement->start_date ? $advertisement->start_date->toISOString() : null,
                    'end_date' => $advertisement->end_date ? $advertisement->end_date->toISOString() : null,
                ],
            ]);
        }
    }
}
