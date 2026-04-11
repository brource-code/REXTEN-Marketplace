<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_id',
        'service_id',
        'booking_id',
        'order_id',
        'advertisement_id',
        'rating',
        'comment',
        'response',
        'response_at',
        'is_visible',
    ];

    protected $casts = [
        'response_at' => 'datetime',
        'is_visible' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }

    /**
     * Отзывы, относящиеся к объявлению на маркетплейсе (как на странице профиля объявления):
     * — привязка к advertisement_id;
     * — общие отзывы на компанию без advertisement_id;
     * — отзывы на услуги из JSON services объявления (service_id + company_id).
     */
    public function scopeForMarketplaceAdvertisement(Builder $query, Advertisement $advertisement): Builder
    {
        $services = [];
        if (! empty($advertisement->services)) {
            $services = is_array($advertisement->services)
                ? $advertisement->services
                : (json_decode($advertisement->services, true) ?? []);
        }
        $serviceIds = collect($services)->pluck('id')->filter(function ($id) {
            return is_numeric($id);
        })->map(fn ($id) => (int) $id)->unique()->values()->all();

        return $query->where(function (Builder $outer) use ($advertisement, $serviceIds) {
            $outer->where('advertisement_id', $advertisement->id);

            $outer->orWhere(function (Builder $b) use ($advertisement) {
                $b->where('company_id', $advertisement->company_id)
                    ->whereNull('advertisement_id');
            });

            if ($serviceIds !== []) {
                $outer->orWhere(function (Builder $b) use ($serviceIds, $advertisement) {
                    $b->whereIn('service_id', $serviceIds)
                        ->where('company_id', $advertisement->company_id);
                });
            }
        })->where('is_visible', true);
    }
}

