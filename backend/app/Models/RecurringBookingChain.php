<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class RecurringBookingChain extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'service_id',
        'user_id',
        'specialist_id',
        'advertisement_id',
        'frequency',
        'interval_days',
        'days_of_week',
        'day_of_month',
        'days_of_month',
        'booking_time',
        'duration_minutes',
        'price',
        'start_date',
        'end_date',
        'client_name',
        'client_email',
        'client_phone',
        'notes',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'days_of_week' => 'array',
        'days_of_month' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'price' => 'decimal:2',
    ];

    /**
     * Get the company for the recurring booking chain.
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the service for the recurring booking chain.
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Get the user who made the recurring booking.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the specialist for the recurring booking.
     */
    public function specialist()
    {
        return $this->belongsTo(TeamMember::class, 'specialist_id');
    }

    /**
     * Get the advertisement for the recurring booking.
     */
    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }

    /**
     * Get the bookings for the recurring booking chain.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'recurring_chain_id');
    }

    /**
     * Генерация дат бронирований на основе настроек повторения
     * 
     * @param int $monthsAhead Количество месяцев вперед для генерации
     * @return array Массив дат Carbon
     */
    public function generateBookingDates(int $monthsAhead = 3): array
    {
        $dates = [];
        $current = Carbon::parse($this->start_date);
        $end = $this->end_date 
            ? Carbon::parse($this->end_date) 
            : Carbon::now()->addMonths($monthsAhead);
        
        // Ограничиваем максимальный период генерации
        $maxEnd = Carbon::now()->addMonths($monthsAhead);
        if ($end->gt($maxEnd)) {
            $end = $maxEnd;
        }
        
        while ($current->lte($end)) {
            if ($this->shouldBookOnDate($current)) {
                $dates[] = $current->copy();
            }
            $current->addDay();
        }
        
        return $dates;
    }

    /**
     * Проверка, должно ли быть бронирование на указанную дату
     * 
     * @param Carbon $date Дата для проверки
     * @return bool
     */
    private function shouldBookOnDate(Carbon $date): bool
    {
        switch ($this->frequency) {
            case 'daily':
                // Каждый день
                $daysSinceStart = $date->diffInDays(Carbon::parse($this->start_date));
                return $daysSinceStart >= 0;
                
            case 'every_n_days':
                // Каждые N дней
                if (!$this->interval_days || $this->interval_days < 1) {
                    return false;
                }
                $daysSinceStart = $date->diffInDays(Carbon::parse($this->start_date));
                return $daysSinceStart >= 0 && $daysSinceStart % $this->interval_days === 0;
                
            case 'weekly':
                // Раз в неделю - проверяем дни недели
                return in_array($date->dayOfWeek, $this->days_of_week ?? []);
                
            case 'biweekly':
                // 2 раза в неделю - каждые 2 недели в указанные дни
                $weeksSinceStart = $date->diffInWeeks(Carbon::parse($this->start_date));
                return $weeksSinceStart % 2 === 0 && in_array($date->dayOfWeek, $this->days_of_week ?? []);
                
            case 'every_2_weeks':
                // Каждые 2 недели в определенный день недели
                if (empty($this->days_of_week)) {
                    return false;
                }
                $weeksSinceStart = $date->diffInWeeks(Carbon::parse($this->start_date));
                return $weeksSinceStart % 2 === 0 && in_array($date->dayOfWeek, $this->days_of_week ?? []);
                
            case 'every_3_weeks':
                // Каждые 3 недели в определенный день недели
                if (empty($this->days_of_week)) {
                    return false;
                }
                $weeksSinceStart = $date->diffInWeeks(Carbon::parse($this->start_date));
                return $weeksSinceStart % 3 === 0 && in_array($date->dayOfWeek, $this->days_of_week ?? []);
                
            case 'monthly':
                // Раз в месяц - в указанное число месяца
                return $date->day === $this->day_of_month;
                
            case 'bimonthly':
                // 2 раза в месяц - в указанные числа месяца
                return in_array($date->day, $this->days_of_month ?? []);
                
            case 'every_2_months':
                // Каждые 2 месяца в указанное число
                if (!$this->day_of_month) {
                    return false;
                }
                $monthsSinceStart = $date->diffInMonths(Carbon::parse($this->start_date));
                return $monthsSinceStart % 2 === 0 && $date->day === $this->day_of_month;
                
            case 'every_3_months':
                // Каждые 3 месяца в указанное число
                if (!$this->day_of_month) {
                    return false;
                }
                $monthsSinceStart = $date->diffInMonths(Carbon::parse($this->start_date));
                return $monthsSinceStart % 3 === 0 && $date->day === $this->day_of_month;
                
            default:
                return false;
        }
    }

    /**
     * Создание бронирований на основе цепочки
     * 
     * @param int $monthsAhead Количество месяцев вперед
     * @return array Массив созданных бронирований
     */
    public function createBookings(int $monthsAhead = 3): array
    {
        $dates = $this->generateBookingDates($monthsAhead);
        $bookings = [];
        
        foreach ($dates as $date) {
            // Проверяем, не существует ли уже бронирование на эту дату
            $existingBooking = Booking::where('company_id', $this->company_id)
                ->where('recurring_chain_id', $this->id)
                ->whereDate('booking_date', $date->format('Y-m-d'))
                ->whereTime('booking_time', $this->booking_time)
                ->first();
            
            if ($existingBooking) {
                continue; // Пропускаем, если уже существует
            }
            
            // Определяем execution_type из услуги
            $executionType = 'onsite';
            if ($this->service_id) {
                $service = \App\Models\Service::find($this->service_id);
                if ($service && $service->service_type) {
                    if ($service->service_type === 'onsite') {
                        $executionType = 'onsite';
                    } elseif ($service->service_type === 'offsite') {
                        $executionType = 'offsite';
                    } elseif ($service->service_type === 'hybrid') {
                        $executionType = 'onsite'; // По умолчанию для hybrid
                    }
                }
            }

            // Создаем бронирование
            $booking = Booking::create([
                'company_id' => $this->company_id,
                'service_id' => $this->service_id,
                'user_id' => $this->user_id,
                'specialist_id' => $this->specialist_id,
                'advertisement_id' => $this->advertisement_id,
                'recurring_chain_id' => $this->id,
                'booking_date' => $date->format('Y-m-d'),
                'booking_time' => $this->booking_time,
                'duration_minutes' => $this->duration_minutes,
                'price' => $this->price,
                'total_price' => $this->price, // Изначально равна базовой цене
                'status' => 'new',
                'notes' => $this->notes,
                'client_name' => $this->client_name,
                'client_email' => $this->client_email,
                'client_phone' => $this->client_phone,
                'execution_type' => $executionType,
            ]);
            
            $bookings[] = $booking;
        }
        
        return $bookings;
    }

    /**
     * Удаление будущих бронирований цепочки
     * 
     * @return int Количество удаленных бронирований
     */
    public function deleteFutureBookings(): int
    {
        return Booking::where('recurring_chain_id', $this->id)
            ->where('booking_date', '>=', Carbon::now()->format('Y-m-d'))
            ->whereIn('status', ['new', 'pending'])
            ->delete();
    }
}
