<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\TeamMember;
use App\Models\SalarySetting;
use App\Models\SalaryCalculation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SalaryCalculationService
{
    /**
     * Calculate salary for a period for all specialists or specific one.
     */
    public function calculateForPeriod($companyId, $periodStart, $periodEnd, $specialistId = null)
    {
        Log::info('SalaryCalculationService: calculateForPeriod', [
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'specialist_id' => $specialistId,
        ]);

        // Получаем специалистов
        $specialistsQuery = TeamMember::where('company_id', $companyId)
            ->where('status', 'active');

        if ($specialistId) {
            $specialistsQuery->where('id', $specialistId);
        }

        $specialists = $specialistsQuery->get();

        if ($specialists->isEmpty()) {
            Log::warning('SalaryCalculationService: No active specialists found', [
                'company_id' => $companyId,
                'specialist_id' => $specialistId,
            ]);
            return [];
        }

        $calculations = [];

        foreach ($specialists as $specialist) {
            $bookings = $this->getBookingsForPeriod($companyId, $periodStart, $periodEnd, $specialist->id);

            if ($bookings->isEmpty()) {
                Log::info('SalaryCalculationService: No bookings found for specialist', [
                    'specialist_id' => $specialist->id,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                ]);
                continue;
            }

            // Получаем активные настройки оплаты для периода
            $settings = $this->getActiveSettingsForPeriod($specialist->id, $periodStart, $periodEnd);

            if ($settings->isEmpty()) {
                Log::warning('SalaryCalculationService: No active salary settings found', [
                    'specialist_id' => $specialist->id,
                ]);
                continue;
            }

            $calculation = $this->calculateForTeamMember($specialist->id, $companyId, $bookings, $settings, $periodStart, $periodEnd);
            
            if ($calculation) {
                $calculations[] = $calculation;
            }
        }

        return $calculations;
    }

    /**
     * Get bookings for period for a specialist.
     */
    public function getBookingsForPeriod($companyId, $periodStart, $periodEnd, $specialistId = null)
    {
        $query = Booking::where('company_id', $companyId)
            ->where('status', 'completed') // Только завершенные бронирования
            ->whereDate('booking_date', '>=', $periodStart)
            ->whereDate('booking_date', '<=', $periodEnd);

        // Ищем бронирования по specialist_id
        if ($specialistId) {
            $query->where('specialist_id', $specialistId);
        }

        return $query->orderBy('booking_date', 'asc')->get();
    }

    /**
     * Get active salary settings for a period.
     * Если нет настроек, действующих в период, возвращает самую раннюю активную настройку (ретроактивно).
     */
    public function getActiveSettingsForPeriod($specialistId, $periodStart, $periodEnd)
    {
        // Получаем все активные настройки, которые действуют в период
        $settings = SalarySetting::where('specialist_id', $specialistId)
            ->where('is_active', true)
            ->where(function ($query) use ($periodStart, $periodEnd) {
                $query->where(function ($q) use ($periodStart, $periodEnd) {
                    // Настройка действует, если:
                    // 1. effective_from <= period_end (начало действия до конца периода)
                    // 2. effective_to IS NULL или effective_to >= period_start (окончание после начала периода или не установлено)
                    $q->where('effective_from', '<=', $periodEnd)
                      ->where(function ($subQ) use ($periodStart) {
                          $subQ->whereNull('effective_to')
                               ->orWhere('effective_to', '>=', $periodStart);
                      });
                });
            })
            ->orderBy('effective_from', 'asc')
            ->get();
        
        // Если нет настроек, действующих в период, берем самую раннюю активную настройку (ретроактивно)
        if ($settings->isEmpty()) {
            $earliestSetting = SalarySetting::where('specialist_id', $specialistId)
                ->where('is_active', true)
                ->orderBy('effective_from', 'asc')
                ->first();
            
            if ($earliestSetting) {
                Log::info('SalaryCalculationService: Using earliest active setting retroactively', [
                    'specialist_id' => $specialistId,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'setting_id' => $earliestSetting->id,
                    'setting_effective_from' => $earliestSetting->effective_from,
                ]);
                return collect([$earliestSetting]);
            }
        }
        
        return $settings;
    }

    /**
     * Get active settings for a specific date.
     * Если настройки нет на дату бронирования, используем самую раннюю активную настройку (ретроактивно).
     */
    public function getActiveSettings($specialistId, $date)
    {
        // Сначала пытаемся найти настройку, которая действует на дату бронирования
        $setting = SalarySetting::where('specialist_id', $specialistId)
            ->where('is_active', true)
            ->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                      ->orWhere('effective_to', '>=', $date);
            })
            ->orderBy('effective_from', 'desc')
            ->first();
        
        // Если настройки нет на дату бронирования, используем самую раннюю активную настройку (ретроактивно)
        if (!$setting) {
            $setting = SalarySetting::where('specialist_id', $specialistId)
                ->where('is_active', true)
                ->whereNull('effective_to') // Только настройки без даты окончания
                ->orderBy('effective_from', 'asc')
                ->first();
        }
        
        return $setting;
    }

    /**
     * Calculate salary for a specialist without saving to database (for reports).
     */
    public function calculateForTeamMemberWithoutSave($specialistId, $companyId, $bookings, $settings, $periodStart, $periodEnd)
    {
        Log::info('SalaryCalculationService: calculateForTeamMemberWithoutSave', [
            'specialist_id' => $specialistId,
            'bookings_count' => $bookings->count(),
            'settings_count' => $settings->count(),
        ]);

        $calculationDetails = [];
        $totalBookings = 0;
        $totalHours = 0;
        $baseAmount = 0;
        $percentAmount = 0;

        foreach ($bookings as $booking) {
            $bookingDate = Carbon::parse($booking->booking_date)->format('Y-m-d');
            
            // Получаем активную настройку на дату бронирования
            $setting = $this->getActiveSettings($specialistId, $bookingDate);

            if (!$setting) {
                Log::warning('SalaryCalculationService: No active setting for booking date', [
                    'specialist_id' => $specialistId,
                    'booking_id' => $booking->id,
                    'booking_date' => $bookingDate,
                ]);
                continue;
            }

            $salaryForBooking = $this->applyPaymentSettings($booking, $setting);

            if ($salaryForBooking > 0) {
                $totalBookings++;
                $totalHours += ($booking->duration_minutes ?? 60) / 60;

                // Разделяем на base и percent в зависимости от типа оплаты
                if ($setting->payment_type === 'percent') {
                    $percentAmount += $salaryForBooking;
                } elseif ($setting->payment_type === 'fixed') {
                    $baseAmount += $salaryForBooking;
                } elseif ($setting->payment_type === 'fixed_plus_percent') {
                    // Для fixed_plus_percent разделяем на фикс и процент
                    $fixedPart = $setting->fixed_amount ?? 0;
                    $percentPart = $salaryForBooking - $fixedPart;
                    $baseAmount += $fixedPart;
                    $percentAmount += $percentPart;
                } elseif ($setting->payment_type === 'hourly') {
                    $baseAmount += $salaryForBooking;
                }

                $calculationDetails[] = [
                    'booking_id' => $booking->id,
                    'booking_date' => $bookingDate,
                    'booking_time' => $booking->booking_time,
                    'total_price' => (float) ($booking->total_price ?? $booking->price ?? 0),
                    'duration_minutes' => $booking->duration_minutes ?? 60,
                    'payment_type' => $setting->payment_type,
                    'salary' => $salaryForBooking,
                    'setting_id' => $setting->id,
                ];
            }
        }

        if ($totalBookings === 0) {
            return null;
        }

        $totalSalary = $baseAmount + $percentAmount;

        // Возвращаем объект-заглушку, похожий на SalaryCalculation, но без сохранения в БД
        $specialist = TeamMember::find($specialistId);
        
        return (object) [
            'specialist_id' => $specialistId,
            'company_id' => $companyId,
            'period_start' => Carbon::parse($periodStart),
            'period_end' => Carbon::parse($periodEnd),
            'total_bookings' => $totalBookings,
            'total_hours' => round($totalHours, 2),
            'base_amount' => round($baseAmount, 2),
            'percent_amount' => round($percentAmount, 2),
            'total_salary' => round($totalSalary, 2),
            'calculation_details' => $calculationDetails,
            'specialist' => $specialist,
        ];
    }

    /**
     * Calculate salary for a specialist.
     */
    public function calculateForTeamMember($specialistId, $companyId, $bookings, $settings, $periodStart, $periodEnd)
    {
        Log::info('SalaryCalculationService: calculateForTeamMember', [
            'specialist_id' => $specialistId,
            'bookings_count' => $bookings->count(),
            'settings_count' => $settings->count(),
        ]);

        $calculationDetails = [];
        $totalBookings = 0;
        $totalHours = 0;
        $baseAmount = 0;
        $percentAmount = 0;

        foreach ($bookings as $booking) {
            $bookingDate = Carbon::parse($booking->booking_date)->format('Y-m-d');
            
            // Получаем активную настройку на дату бронирования
            $setting = $this->getActiveSettings($specialistId, $bookingDate);

            if (!$setting) {
                Log::warning('SalaryCalculationService: No active setting for booking date', [
                    'specialist_id' => $specialistId,
                    'booking_id' => $booking->id,
                    'booking_date' => $bookingDate,
                ]);
                continue;
            }

            $salaryForBooking = $this->applyPaymentSettings($booking, $setting);

            if ($salaryForBooking > 0) {
                $totalBookings++;
                $totalHours += ($booking->duration_minutes ?? 60) / 60;

                // Разделяем на base и percent в зависимости от типа оплаты
                if ($setting->payment_type === 'percent') {
                    $percentAmount += $salaryForBooking;
                } elseif ($setting->payment_type === 'fixed') {
                    $baseAmount += $salaryForBooking;
                } elseif ($setting->payment_type === 'fixed_plus_percent') {
                    // Для fixed_plus_percent разделяем на фикс и процент
                    $fixedPart = $setting->fixed_amount ?? 0;
                    $percentPart = $salaryForBooking - $fixedPart;
                    $baseAmount += $fixedPart;
                    $percentAmount += $percentPart;
                } elseif ($setting->payment_type === 'hourly') {
                    $baseAmount += $salaryForBooking;
                }

                $calculationDetails[] = [
                    'booking_id' => $booking->id,
                    'booking_date' => $bookingDate,
                    'booking_time' => $booking->booking_time,
                    'total_price' => (float) ($booking->total_price ?? $booking->price ?? 0),
                    'duration_minutes' => $booking->duration_minutes ?? 60,
                    'payment_type' => $setting->payment_type,
                    'salary' => $salaryForBooking,
                    'setting_id' => $setting->id,
                ];
            }
        }

        if ($totalBookings === 0) {
            return null;
        }

        $totalSalary = $baseAmount + $percentAmount;

        // Сохраняем расчет
        $calculation = SalaryCalculation::create([
            'specialist_id' => $specialistId,
            'company_id' => $companyId,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'total_bookings' => $totalBookings,
            'total_hours' => round($totalHours, 2),
            'base_amount' => round($baseAmount, 2),
            'percent_amount' => round($percentAmount, 2),
            'total_salary' => round($totalSalary, 2),
            'calculation_details' => $calculationDetails,
        ]);

        Log::info('SalaryCalculationService: Calculation created', [
            'calculation_id' => $calculation->id,
            'total_salary' => $totalSalary,
        ]);

        return $calculation;
    }

    /**
     * Apply payment settings to a booking and calculate salary.
     */
    public function applyPaymentSettings($booking, $settings)
    {
        $totalPrice = (float) ($booking->total_price ?? $booking->price ?? 0);
        $durationMinutes = $booking->duration_minutes ?? 60;
        $durationHours = $durationMinutes / 60;

        switch ($settings->payment_type) {
            case 'percent':
                if (!$settings->percent_rate) {
                    return 0;
                }
                return $totalPrice * ($settings->percent_rate / 100);

            case 'fixed':
                if (!$settings->fixed_amount) {
                    return 0;
                }
                return $settings->fixed_amount;

            case 'fixed_plus_percent':
                $fixedPart = $settings->fixed_amount ?? 0;
                $percentPart = 0;
                if ($settings->percent_rate) {
                    $percentPart = $totalPrice * ($settings->percent_rate / 100);
                }
                return $fixedPart + $percentPart;

            case 'hourly':
                if (!$settings->hourly_rate) {
                    return 0;
                }
                return $settings->hourly_rate * $durationHours;

            default:
                Log::warning('SalaryCalculationService: Unknown payment type', [
                    'payment_type' => $settings->payment_type,
                    'booking_id' => $booking->id,
                ]);
                return 0;
        }
    }
}
