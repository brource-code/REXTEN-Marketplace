<?php

namespace App\Observers;

use App\Models\Company;
use App\Models\Booking;
use App\Models\Order;
use App\Models\Advertisement;
use App\Models\BusinessEvent;
use App\Enums\BusinessEventType;

class BusinessEventObserver
{
    /**
     * Handle the Company "created" event.
     * Создаёт событие "Новый бизнес зарегистрирован"
     */
    public function created(Company $company)
    {
        BusinessEvent::create([
            'type' => BusinessEventType::BUSINESS_REGISTERED->value,
            'title' => 'Новый бизнес зарегистрирован',
            'description' => "Компания \"{$company->name}\" зарегистрирована на платформе",
            'company_id' => $company->id,
            'user_id' => null,
            'amount' => null,
            'metadata' => [
                'company_name' => $company->name,
                'company_email' => $company->email,
                'category' => $company->category_slug,
            ],
        ]);
    }
}
