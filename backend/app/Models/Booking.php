<?php

namespace App\Models;

use App\Services\Routing\Dto\GeoPoint;
use Carbon\CarbonInterface;
use DateTimeZone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::saved(function (Booking $booking) {
            if (!$booking->company_id || !$booking->user_id) {
                return;
            }
            $user = User::query()->find($booking->user_id);
            if (!$user || strtoupper((string) $user->role) !== 'CLIENT') {
                return;
            }
            DB::table('company_clients')->insertOrIgnore([
                'company_id' => $booking->company_id,
                'user_id' => $booking->user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'user_id',
        'service_id',
        'title',
        'advertisement_id',
        'execution_type',
        'specialist_id',
        'recurring_chain_id',
        'booking_date',
        'booking_time',
        'duration_minutes',
        'price',
        'total_price',
        'status',
        'notes',
        'client_notes',
        'client_name',
        'client_phone',
        'client_email',
        'review_token',
        'review_token_expires_at',
        'cancelled_at',
        'cancellation_reason',
        'discount_amount',
        'discount_source',
        'discount_tier_id',
        'promo_code_id',
        'priority',
        'cached_lat',
        'cached_lng',
        'geocoded_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'booking_date' => 'datetime',
        'price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'review_token_expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'discount_amount' => 'decimal:2',
        'priority' => 'integer',
        'cached_lat' => 'decimal:8',
        'cached_lng' => 'decimal:8',
        'geocoded_at' => 'datetime',
    ];

    /**
     * Get the company for the booking.
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the user who made the booking.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the service for the booking.
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Get the advertisement for the booking.
     */
    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }

    /**
     * Get the specialist for the booking.
     */
    public function specialist()
    {
        return $this->belongsTo(TeamMember::class, 'specialist_id');
    }

    /**
     * День для планировщика маршрутов: брони компании на дату, назначенные этому специалисту
     * или без исполнителя (specialist_id null) — как в календаре, иначе список пуст при типичных данных.
     */
    public function scopeForRoutePlannerDay(Builder $query, int $companyId, int $specialistId, string $date): Builder
    {
        return $query
            ->where('company_id', $companyId)
            ->where(function (Builder $q) use ($specialistId): void {
                $q->where('specialist_id', $specialistId)
                    ->orWhereNull('specialist_id');
            })
            ->whereDate('booking_date', $date)
            ->where('status', '!=', 'cancelled');
    }

    /**
     * Get the order for the booking.
     */
    public function order()
    {
        return $this->hasOne(Order::class);
    }

    /**
     * Get the reviews for the booking.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the location for the booking (for offsite bookings).
     */
    public function location()
    {
        return $this->hasOne(BookingLocation::class);
    }

    /**
     * Get the recurring booking chain for the booking.
     */
    public function recurringChain()
    {
        return $this->belongsTo(RecurringBookingChain::class, 'recurring_chain_id');
    }

    public function discountTier()
    {
        return $this->belongsTo(DiscountTier::class, 'discount_tier_id');
    }

    public function promoCode()
    {
        return $this->belongsTo(PromoCode::class, 'promo_code_id');
    }

    /**
     * Связь с дополнительными услугами через pivot таблицу
     */
    public function additionalServices()
    {
        return $this->belongsToMany(AdditionalService::class, 'booking_additional_services')
            ->withPivot('quantity', 'price')
            ->withTimestamps();
    }

    /**
     * Вычислить общую стоимость с дополнительными услугами
     */
    public function calculateTotalWithAdditionalServices(): float
    {
        $basePrice = $this->price ?? 0;
        $additionalTotal = $this->additionalServices->sum(function ($service) {
            return $service->pivot->price * $service->pivot->quantity;
        });

        return $basePrice + $additionalTotal;
    }

    /**
     * Генерировать токен для отзыва (для незарегистрированных клиентов)
     */
    public function generateReviewToken(): string
    {
        $this->review_token = bin2hex(random_bytes(32)); // 64 символа
        $this->review_token_expires_at = now()->addDays(30); // Токен действителен 30 дней
        $this->save();
        return $this->review_token;
    }

    /**
     * Части адреса из профиля привязанного клиента (если есть user_id).
     *
     * @return array<int, string>
     */
    protected function profileAddressParts(): array
    {
        if ($this->user_id === null) {
            return [];
        }

        if (! $this->relationLoaded('user')) {
            $this->load('user.profile');
        }

        $profile = $this->user?->profile;
        if ($profile === null) {
            $profile = UserProfile::query()->where('user_id', $this->user_id)->first();
        }

        if ($profile === null) {
            return [];
        }

        $parts = array_filter([
            $profile->address ?? null,
            $profile->city ?? null,
            $profile->state ?? null,
            $profile->zip_code ?? null,
        ], static fn ($v) => $v !== null && trim((string) $v) !== '');

        return array_values($parts);
    }

    /**
     * Части адреса визита из строки брони (BookingLocation / ручной ввод).
     *
     * @return array<int, string>
     */
    protected function locationAddressParts(): array
    {
        $location = $this->relationLoaded('location') ? $this->location : $this->location()->first();

        if ($location === null) {
            return [];
        }

        $parts = array_filter([
            $location->address_line1 ?? null,
            $location->city ?? null,
            $location->state ?? null,
            $location->zip ?? null,
        ], static fn ($v) => $v !== null && trim((string) $v) !== '');

        return array_values($parts);
    }

    /**
     * Адрес визита для отображения: сначала профиль клиента, иначе адрес из брони (ручной / BookingLocation).
     */
    public function visitAddressLineForDisplay(): string
    {
        $fromProfile = $this->profileAddressParts();
        if ($fromProfile !== []) {
            return implode(', ', $fromProfile);
        }

        $fromLocation = $this->locationAddressParts();

        return $fromLocation !== [] ? implode(', ', $fromLocation) : '';
    }

    /**
     * Строка для геокодера (HERE): тот же приоритет, что у {@see visitAddressLineForDisplay()}, суффикс USA.
     */
    public function addressLineForGeocodingUs(): string
    {
        $fromProfile = $this->profileAddressParts();
        if ($fromProfile !== []) {
            return implode(', ', $fromProfile).', USA';
        }

        $fromLocation = $this->locationAddressParts();

        return $fromLocation !== [] ? implode(', ', $fromLocation).', USA' : '';
    }

    /**
     * Строка для геокодера только из адреса брони (BookingLocation), без профиля.
     * Используется как вторая попытка, если по профилю геокод не дал точку, а адрес визита в брони другой.
     */
    public function addressLineForGeocodingLocationOnlyUs(): string
    {
        $fromLocation = $this->locationAddressParts();

        return $fromLocation !== [] ? implode(', ', $fromLocation).', USA' : '';
    }

    /**
     * Выезд (offsite) без ни строки адреса у брони, ни адреса в профиле привязанного клиента.
     */
    public function isOffsiteVisitAddressMissing(): bool
    {
        if (($this->execution_type ?? 'onsite') !== 'offsite') {
            return false;
        }

        return trim($this->visitAddressLineForDisplay()) === '';
    }

    public function getGeoPoint(): ?GeoPoint
    {
        if ($this->cached_lat !== null && $this->cached_lng !== null) {
            return new GeoPoint((float) $this->cached_lat, (float) $this->cached_lng);
        }

        $location = $this->relationLoaded('location') ? $this->location : $this->location()->first();
        if ($location !== null && $location->lat !== null && $location->lng !== null) {
            return new GeoPoint((float) $location->lat, (float) $location->lng);
        }

        return null;
    }

    /**
     * Окно визита в таймзоне бизнеса (США: обычно из {@see Company::timezone}, иначе America/Los_Angeles).
     *
     * @return array{start: \Illuminate\Support\Carbon, end: \Illuminate\Support\Carbon}
     */
    public function getTimeWindow(?string $timezone = null): array
    {
        $tz = $timezone ?? $this->resolveBusinessTimezone();

        $bookingDate = $this->booking_date;
        if ($bookingDate instanceof CarbonInterface) {
            $dateStr = $bookingDate->copy()->timezone($tz)->format('Y-m-d');
        } else {
            $dateStr = Carbon::parse((string) $bookingDate, $tz)->format('Y-m-d');
        }

        $time = $this->booking_time;
        if ($time instanceof CarbonInterface) {
            $timeStr = $time->format('H:i:s');
        } else {
            $timeStr = is_string($time) ? trim($time) : '00:00:00';
            if ($timeStr !== '' && strlen($timeStr) === 5) {
                $timeStr .= ':00';
            }
        }

        if ($timeStr === '') {
            $timeStr = '00:00:00';
        }

        $start = Carbon::createFromFormat('Y-m-d H:i:s', $dateStr.' '.$timeStr, $tz);
        $durationMinutes = (int) ($this->duration_minutes ?? 60);
        $end = $start->copy()->addMinutes($durationMinutes);

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Таймзона компании для расписания (рынок США — дефолт как в миграции companies.timezone).
     */
    public function resolveBusinessTimezone(): string
    {
        if ($this->relationLoaded('company') && $this->company) {
            $tz = trim((string) ($this->company->timezone ?? ''));
            if ($tz !== '' && $this->isValidIanaTimezone($tz)) {
                return $tz;
            }
        }

        if ($this->company_id) {
            $tz = Company::query()->whereKey($this->company_id)->value('timezone');
            if (is_string($tz)) {
                $tz = trim($tz);
                if ($tz !== '' && $this->isValidIanaTimezone($tz)) {
                    return $tz;
                }
            }
        }

        return 'America/Los_Angeles';
    }

    private function isValidIanaTimezone(string $tz): bool
    {
        try {
            new DateTimeZone($tz);

            return true;
        } catch (\Exception) {
            return false;
        }
    }

    /**
     * Имя клиента для UI бизнеса (как в {@see \App\Http\Controllers\Business\ScheduleController}): поле client_name или ФИО из профиля.
     */
    public function businessClientDisplayName(): string
    {
        $raw = trim((string) ($this->client_name ?? ''));
        if ($raw !== '') {
            return $raw;
        }

        if ($this->user_id === null) {
            return 'Клиент';
        }

        if (! $this->relationLoaded('user')) {
            $this->load('user.profile');
        }

        $profile = $this->user?->profile;
        if ($profile !== null) {
            $fromProfile = trim(($profile->first_name ?? '').' '.($profile->last_name ?? ''));
            if ($fromProfile !== '') {
                return $fromProfile;
            }
        }

        $email = $this->user?->email ?? $this->client_email ?? null;
        if ($email !== null && trim((string) $email) !== '') {
            return (string) $email;
        }

        return 'Клиент';
    }

    /**
     * Название услуги для UI (логика как у заголовка в расписании).
     */
    public function businessServiceDisplayName(): string
    {
        $default = 'Услуга';

        if (! $this->service_id) {
            return $default;
        }

        if ($this->advertisement_id) {
            $ad = $this->relationLoaded('advertisement') && $this->advertisement
                ? $this->advertisement
                : Advertisement::query()->find($this->advertisement_id);
            if ($ad !== null) {
                $name = $this->serviceNameFromAdvertisementServicesJson($ad, $this->service_id);
                if ($name !== null) {
                    return $name;
                }
            }
        }

        if (! $this->relationLoaded('service')) {
            $this->load('service');
        }

        $svc = $this->service;
        if ($svc !== null && (int) $svc->company_id === (int) $this->company_id) {
            return (string) $svc->name;
        }

        $found = Advertisement::query()
            ->where('company_id', $this->company_id)
            ->where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->get()
            ->first(function (Advertisement $ad): bool {
                $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                foreach ($services as $svc) {
                    if (isset($svc['id']) && (string) $svc['id'] === (string) $this->service_id) {
                        return true;
                    }
                }

                return false;
            });

        if ($found !== null) {
            $name = $this->serviceNameFromAdvertisementServicesJson($found, $this->service_id);
            if ($name !== null) {
                return $name;
            }
        }

        return $default;
    }

    /**
     * Вторая строка списка маршрута — как заголовок слота в календаре: «Имя — Услуга».
     */
    public function businessRouteListTitle(): string
    {
        $isCustomEvent = empty($this->service_id) && trim((string) ($this->title ?? '')) !== '';
        if ($isCustomEvent) {
            return (string) $this->title;
        }

        return $this->businessClientDisplayName().' - '.$this->businessServiceDisplayName();
    }

    private function serviceNameFromAdvertisementServicesJson(Advertisement $ad, $serviceId): ?string
    {
        $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
        $serviceData = collect($services)->first(function ($s) use ($serviceId) {
            return isset($s['id']) && (string) $s['id'] === (string) $serviceId;
        });

        if (is_array($serviceData) && isset($serviceData['name']) && trim((string) $serviceData['name']) !== '') {
            return (string) $serviceData['name'];
        }

        return null;
    }
}

