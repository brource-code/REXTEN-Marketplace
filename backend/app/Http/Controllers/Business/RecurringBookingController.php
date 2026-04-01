<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\RecurringBookingChain;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RecurringBookingController extends Controller
{
    /**
     * Получить список регулярных бронирований
     */
    public function index(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $chains = RecurringBookingChain::where('company_id', $companyId)
                ->with([
                    'service:id,name',
                    'user:id,email',
                    'user.profile:user_id,first_name,last_name,phone',
                    'specialist:id,name',
                    'bookings' => function($q) {
                        $q->where('booking_date', '>=', now()->format('Y-m-d'))
                            ->orderBy('booking_date')
                            ->limit(10);
                    }
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            $data = $chains->map(function ($chain) {
                $clientName = null;
                if ($chain->user_id && $chain->user) {
                    $profile = $chain->user->profile;
                    if ($profile) {
                        $clientName = trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? ''));
                    }
                }
                $clientName = $clientName ?: $chain->client_name;

                return [
                    'id' => $chain->id,
                    'service_id' => $chain->service_id,
                    'service' => $chain->service ? [
                        'id' => $chain->service->id,
                        'name' => $chain->service->name,
                    ] : null,
                    'user_id' => $chain->user_id,
                    'client_name' => $clientName,
                    'client_email' => $chain->client_email,
                    'client_phone' => $chain->client_phone,
                    'specialist_id' => $chain->specialist_id,
                    'specialist' => $chain->specialist ? [
                        'id' => $chain->specialist->id,
                        'name' => $chain->specialist->name,
                    ] : null,
                    'frequency' => $chain->frequency,
                    'interval_days' => $chain->interval_days,
                    'days_of_week' => $chain->days_of_week,
                    'day_of_month' => $chain->day_of_month,
                    'days_of_month' => $chain->days_of_month,
                    'booking_time' => $chain->booking_time,
                    'duration_minutes' => $chain->duration_minutes,
                    'price' => (float) $chain->price,
                    'start_date' => $chain->start_date->format('Y-m-d'),
                    'end_date' => $chain->end_date ? $chain->end_date->format('Y-m-d') : null,
                    'notes' => $chain->notes,
                    'status' => $chain->status,
                    'upcoming_bookings' => $chain->bookings->map(function ($booking) {
                        return [
                            'id' => $booking->id,
                            'booking_date' => $booking->booking_date->format('Y-m-d'),
                            'status' => $booking->status,
                        ];
                    }),
                ];
            });

            return response()->json([
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching recurring bookings: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error fetching recurring bookings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Создать регулярное бронирование
     */
    public function store(Request $request)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $validated = $request->validate([
                'service_id' => 'nullable|integer|exists:services,id',
                'user_id' => 'nullable|exists:users,id',
                'specialist_id' => 'nullable|exists:team_members,id',
                'advertisement_id' => 'nullable|exists:advertisements,id',
                'frequency' => 'required|string|max:50',
                'interval_days' => 'nullable|integer|min:1',
                'days_of_week' => 'nullable|array',
                'days_of_week.*' => 'integer|min:0|max:6',
                'day_of_month' => 'nullable|integer|min:1|max:31',
                'days_of_month' => 'nullable|array',
                'days_of_month.*' => 'integer|min:1|max:31',
                'booking_time' => 'required|date_format:H:i',
                'duration_minutes' => 'nullable|integer|min:15',
                'price' => 'nullable|numeric|min:0',
                'start_date' => 'required|date',
                'end_date' => 'nullable|date|after:start_date',
                'client_name' => 'nullable|string|max:255',
                'client_email' => 'nullable|email|max:255',
                'client_phone' => 'nullable|string|max:20',
                'notes' => 'nullable|string|max:1000',
            ]);

            // Проверяем обязательные поля в зависимости от frequency
            $frequency = $validated['frequency'];
            
            if (in_array($frequency, ['weekly', 'biweekly', 'every_2_weeks', 'every_3_weeks'])) {
                if (empty($validated['days_of_week']) || !is_array($validated['days_of_week'])) {
                    return response()->json([
                        'message' => 'Для еженедельного повторения необходимо указать дни недели',
                        'error' => 'days_of_week_required',
                    ], 422);
                }
            } elseif (in_array($frequency, ['monthly', 'every_2_months', 'every_3_months'])) {
                if (empty($validated['day_of_month'])) {
                    return response()->json([
                        'message' => 'Для ежемесячного повторения необходимо указать число месяца',
                        'error' => 'day_of_month_required',
                    ], 422);
                }
            } elseif ($frequency === 'bimonthly') {
                if (empty($validated['days_of_month']) || !is_array($validated['days_of_month']) || count($validated['days_of_month']) !== 2) {
                    return response()->json([
                        'message' => 'Для повторения 2 раза в месяц необходимо указать два числа месяца',
                        'error' => 'days_of_month_required',
                    ], 422);
                }
            } elseif ($frequency === 'every_n_days') {
                if (empty($validated['interval_days'])) {
                    return response()->json([
                        'message' => 'Для повторения каждые N дней необходимо указать интервал',
                        'error' => 'interval_days_required',
                    ], 422);
                }
            }

            $chain = RecurringBookingChain::create([
                'company_id' => $companyId,
                'service_id' => $validated['service_id'] ?? null,
                'user_id' => $validated['user_id'] ?? null,
                'specialist_id' => $validated['specialist_id'] ?? null,
                'advertisement_id' => $validated['advertisement_id'] ?? null,
                'frequency' => $validated['frequency'],
                'interval_days' => $validated['interval_days'] ?? null,
                'days_of_week' => $validated['days_of_week'] ?? null,
                'day_of_month' => $validated['day_of_month'] ?? null,
                'days_of_month' => $validated['days_of_month'] ?? null,
                'booking_time' => $validated['booking_time'],
                'duration_minutes' => $validated['duration_minutes'] ?? 60,
                'price' => $validated['price'] ?? 0,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'] ?? null,
                'client_name' => $validated['client_name'] ?? null,
                'client_email' => $validated['client_email'] ?? null,
                'client_phone' => $validated['client_phone'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'active',
            ]);

            $bookings = $chain->createBookings(3);

            Log::info('Recurring booking chain created', [
                'chain_id' => $chain->id,
                'bookings_created' => count($bookings),
            ]);

            return response()->json([
                'message' => 'Recurring booking chain created successfully',
                'data' => [
                    'id' => $chain->id,
                    'bookings_created' => count($bookings),
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating recurring booking: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error creating recurring booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Обновить регулярное бронирование
     */
    public function update(Request $request, $id)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $chain = RecurringBookingChain::where('company_id', $companyId)
                ->where('id', $id)
                ->first();

            if (!$chain) {
                return response()->json([
                    'message' => 'Recurring booking chain not found',
                ], 404);
            }

            $validated = $request->validate([
                'frequency' => 'sometimes|string|max:50',
                'interval_days' => 'nullable|integer|min:1',
                'days_of_week' => 'nullable|array',
                'days_of_week.*' => 'integer|min:0|max:6',
                'day_of_month' => 'nullable|integer|min:1|max:31',
                'days_of_month' => 'nullable|array',
                'days_of_month.*' => 'integer|min:1|max:31',
                'booking_time' => 'sometimes|date_format:H:i',
                'duration_minutes' => 'sometimes|integer|min:15',
                'price' => 'sometimes|numeric|min:0',
                'start_date' => 'sometimes|date',
                'end_date' => 'nullable|date|after:start_date',
                'notes' => 'nullable|string|max:1000',
                'status' => 'sometimes|in:active,paused,cancelled',
            ]);

            $chain->fill($validated);
            $chain->save();

            if ($request->has('frequency') || $request->has('days_of_week') || $request->has('day_of_month') || 
                $request->has('days_of_month') || $request->has('booking_time') || $request->has('start_date') ||
                $request->has('interval_days')) {
                $chain->deleteFutureBookings();
                $chain->createBookings(3);
            }

            return response()->json([
                'message' => 'Recurring booking chain updated successfully',
                'data' => [
                    'id' => $chain->id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating recurring booking: ' . $e->getMessage(), [
                'chain_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error updating recurring booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Удалить регулярное бронирование
     */
    public function destroy(Request $request, $id)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $chain = RecurringBookingChain::where('company_id', $companyId)
                ->where('id', $id)
                ->first();

            if (!$chain) {
                return response()->json([
                    'message' => 'Recurring booking chain not found',
                ], 404);
            }

            $chain->deleteFutureBookings();
            $chain->delete();

            return response()->json([
                'message' => 'Recurring booking chain deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting recurring booking: ' . $e->getMessage(), [
                'chain_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error deleting recurring booking',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Пересоздать бронирования для цепочки
     */
    public function regenerate(Request $request, $id)
    {
        try {
            $companyId = $request->get('current_company_id');
            
            if (!$companyId) {
                return response()->json([
                    'message' => 'Company not found',
                ], 404);
            }

            $chain = RecurringBookingChain::where('company_id', $companyId)
                ->where('id', $id)
                ->first();

            if (!$chain) {
                return response()->json([
                    'message' => 'Recurring booking chain not found',
                ], 404);
            }

            $deleted = $chain->deleteFutureBookings();
            $bookings = $chain->createBookings(3);

            return response()->json([
                'message' => 'Bookings regenerated successfully',
                'data' => [
                    'deleted' => $deleted,
                    'created' => count($bookings),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error regenerating bookings: ' . $e->getMessage(), [
                'chain_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error regenerating bookings',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
