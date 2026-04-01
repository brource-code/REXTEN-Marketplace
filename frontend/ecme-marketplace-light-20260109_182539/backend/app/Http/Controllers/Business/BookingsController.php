<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BookingsController extends Controller
{
    protected $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    /**
     * Получить все бронирования бизнеса
     */
    public function index(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $query = Booking::where('company_id', $companyId)
            ->with(['service', 'user.profile', 'specialist.profile']);

        // Фильтры
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->where('booking_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('booking_date', '<=', $request->date_to);
        }

        if ($request->has('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        $bookings = $query->orderBy('booking_date', 'desc')
            ->orderBy('booking_time', 'desc')
            ->get();

        $data = $bookings->map(function ($booking) {
            return [
                'id' => $booking->id,
                'service' => [
                    'id' => $booking->service->id ?? null,
                    'name' => $booking->service->name ?? 'N/A',
                ],
                'client' => [
                    'id' => $booking->user->id ?? null,
                    'name' => $booking->user->name ?? $booking->user->profile->full_name ?? 'Гость',
                    'email' => $booking->user->email ?? null,
                    'phone' => $booking->user->profile->phone ?? null,
                ],
                'specialist' => $booking->specialist ? [
                    'id' => $booking->specialist->id,
                    'name' => $booking->specialist->name ?? $booking->specialist->profile->full_name ?? 'N/A',
                ] : null,
                'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
                'booking_time' => $booking->booking_time,
                'duration_minutes' => $booking->duration_minutes ?? 60,
                'price' => (float) $booking->price,
                'status' => $booking->status,
                'notes' => $booking->notes,
                'client_notes' => $booking->client_notes,
                'created_at' => $booking->created_at ? $booking->created_at->toISOString() : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Получить одно бронирование
     */
    public function show(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $booking = Booking::where('company_id', $companyId)
            ->with(['service', 'user.profile', 'specialist.profile', 'company'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $booking->id,
                'service' => [
                    'id' => $booking->service->id ?? null,
                    'name' => $booking->service->name ?? 'N/A',
                ],
                'client' => [
                    'id' => $booking->user->id ?? null,
                    'name' => $booking->user->name ?? $booking->user->profile->full_name ?? 'Гость',
                    'email' => $booking->user->email ?? null,
                    'phone' => $booking->user->profile->phone ?? null,
                ],
                'specialist' => $booking->specialist ? [
                    'id' => $booking->specialist->id,
                    'name' => $booking->specialist->name ?? $booking->specialist->profile->full_name ?? 'N/A',
                ] : null,
                'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
                'booking_time' => $booking->booking_time,
                'duration_minutes' => $booking->duration_minutes ?? 60,
                'price' => (float) $booking->price,
                'status' => $booking->status,
                'notes' => $booking->notes,
                'client_notes' => $booking->client_notes,
                'cancelled_at' => $booking->cancelled_at ? $booking->cancelled_at->toISOString() : null,
                'cancellation_reason' => $booking->cancellation_reason,
                'created_at' => $booking->created_at ? $booking->created_at->toISOString() : null,
            ],
        ]);
    }

    /**
     * Создать бронирование (для бизнеса)
     */
    public function store(Request $request)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'service_id' => 'required|exists:services,id',
            'user_id' => 'nullable|exists:users,id',
            'booking_date' => 'required|date|after_or_equal:today',
            'booking_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15',
            'specialist_id' => 'nullable|exists:users,id',
            'price' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:new,pending,confirmed,completed,cancelled',
            'notes' => 'nullable|string|max:1000',
            'client_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Проверяем доступность
            $isAvailable = $this->bookingService->isSlotAvailable(
                $companyId,
                $request->service_id,
                $request->booking_date,
                $request->booking_time,
                $request->duration_minutes ?? 60
            );

            if (!$isAvailable) {
                return response()->json([
                    'success' => false,
                    'message' => 'Это время уже занято. Выберите другое время.',
                    'error' => 'slot_occupied',
                ], 400);
            }

            $booking = $this->bookingService->createBooking([
                'company_id' => $companyId,
                'user_id' => $request->user_id,
                'service_id' => $request->service_id,
                'specialist_id' => $request->specialist_id,
                'booking_date' => $request->booking_date,
                'booking_time' => $request->booking_time,
                'duration_minutes' => $request->duration_minutes,
                'price' => $request->price,
                'status' => $request->status ?? 'pending',
                'notes' => $request->notes,
                'client_notes' => $request->client_notes,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Бронирование успешно создано',
                'data' => $booking->load(['service', 'user.profile', 'specialist.profile']),
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось создать бронирование: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Обновить бронирование
     */
    public function update(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $booking = Booking::where('company_id', $companyId)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'service_id' => 'sometimes|exists:services,id',
            'user_id' => 'nullable|exists:users,id',
            'booking_date' => 'sometimes|date',
            'booking_time' => 'sometimes|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15',
            'specialist_id' => 'nullable|exists:users,id',
            'price' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:new,pending,confirmed,completed,cancelled',
            'notes' => 'nullable|string|max:1000',
            'client_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Если изменяется дата/время, проверяем доступность
            if ($request->has('booking_date') || $request->has('booking_time')) {
                $bookingDate = $request->booking_date ?? $booking->booking_date->format('Y-m-d');
                $bookingTime = $request->booking_time ?? $booking->booking_time;
                $duration = $request->duration_minutes ?? $booking->duration_minutes ?? 60;

                $isAvailable = $this->bookingService->isSlotAvailable(
                    $companyId,
                    $request->service_id ?? $booking->service_id,
                    $bookingDate,
                    $bookingTime,
                    $duration,
                    $booking->id // Исключаем текущее бронирование
                );

                if (!$isAvailable) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Это время уже занято. Выберите другое время.',
                        'error' => 'slot_occupied',
                    ], 400);
                }
            }

            // Обновляем статус отмены, если статус меняется на cancelled
            if ($request->has('status') && $request->status === 'cancelled' && $booking->status !== 'cancelled') {
                $booking->cancelled_at = now();
                $booking->cancellation_reason = $request->cancellation_reason ?? 'Отменено администратором';
            }

            $booking->update($request->only([
                'service_id',
                'user_id',
                'booking_date',
                'booking_time',
                'duration_minutes',
                'specialist_id',
                'price',
                'status',
                'notes',
                'client_notes',
                'cancelled_at',
                'cancellation_reason',
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Бронирование успешно обновлено',
                'data' => $booking->load(['service', 'user.profile', 'specialist.profile']),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Не удалось обновить бронирование: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Удалить бронирование
     */
    public function destroy(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $booking = Booking::where('company_id', $companyId)->findOrFail($id);

        // Не удаляем завершенные бронирования
        if ($booking->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Нельзя удалить завершенное бронирование',
            ], 400);
        }

        $booking->delete();

        return response()->json([
            'success' => true,
            'message' => 'Бронирование успешно удалено',
        ]);
    }
}

