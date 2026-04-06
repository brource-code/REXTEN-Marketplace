<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Services\ClientBookingNotificationTexts;
use App\Services\ClientNotificationMailer;
use App\Models\Booking;
use App\Models\Notification;
use App\Services\ActivityService;
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
            ->with(['service', 'user.profile', 'specialist', 'location']);

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
            $result = [
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
                    'name' => $booking->specialist->name ?? 'N/A',
                ] : null,
                'execution_type' => $booking->execution_type ?? 'onsite',
                'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
                'booking_time' => $booking->booking_time,
                'duration_minutes' => $booking->duration_minutes ?? 60,
                'price' => (float) $booking->price,
                'status' => $booking->status,
                'notes' => $booking->notes,
                'client_notes' => $booking->client_notes,
                'created_at' => $booking->created_at ? $booking->created_at->toISOString() : null,
            ];
            
            // Добавляем адрес для offsite бронирований
            if (($booking->execution_type ?? 'onsite') === 'offsite' && $booking->location) {
                $result['location'] = [
                    'address_line1' => $booking->location->address_line1,
                    'city' => $booking->location->city,
                    'state' => $booking->location->state,
                    'zip' => $booking->location->zip,
                    'lat' => $booking->location->lat,
                    'lng' => $booking->location->lng,
                    'notes' => $booking->location->notes,
                ];
            }
            
            return $result;
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
            ->with([
                'service',
                'user.profile',
                'specialist',
                'company',
                'location',
                'discountTier',
                'promoCode',
                'additionalServices',
            ])
            ->findOrFail($id);

        $data = [
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
                'name' => $booking->specialist->name ?? 'N/A',
            ] : null,
            'execution_type' => $booking->execution_type ?? 'onsite',
            'booking_date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
            'booking_time' => $booking->booking_time,
            'duration_minutes' => $booking->duration_minutes ?? 60,
            'price' => (float) $booking->price,
            'total_price' => (float) ($booking->total_price ?? $booking->price),
            'discount_amount' => (float) ($booking->discount_amount ?? 0),
            'discount_source' => $booking->discount_source,
            'discount_tier_name' => $booking->discountTier?->name,
            'promo_code' => $booking->promoCode?->code,
            'review_token' => $booking->review_token,
            'advertisement_id' => $booking->advertisement_id,
            'status' => $booking->status,
            'notes' => $booking->notes,
            'client_notes' => $booking->client_notes,
            'cancelled_at' => $booking->cancelled_at ? $booking->cancelled_at->toISOString() : null,
            'cancellation_reason' => $booking->cancellation_reason,
            'created_at' => $booking->created_at ? $booking->created_at->toISOString() : null,
            'additional_services' => $booking->additionalServices
                ? $booking->additionalServices->map(function ($addService) {
                    return [
                        'id' => $addService->id ?? null,
                        'name' => $addService->name ?? '',
                        'price' => (float) ($addService->pivot->price ?? $addService->price ?? 0),
                        'quantity' => (int) ($addService->pivot->quantity ?? 1),
                    ];
                })->values()->all()
                : [],
        ];
        
        // Добавляем адрес для offsite бронирований
        if (($booking->execution_type ?? 'onsite') === 'offsite' && $booking->location) {
            $data['location'] = [
                'address_line1' => $booking->location->address_line1,
                'city' => $booking->location->city,
                'state' => $booking->location->state,
                'zip' => $booking->location->zip,
                'lat' => $booking->location->lat,
                'lng' => $booking->location->lng,
                'notes' => $booking->location->notes,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $data,
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
            'booking_date' => 'required|date',
            'booking_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15',
            'specialist_id' => 'nullable|exists:team_members,id',
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

            // Уведомление владельцу бизнеса о новом бронировании
            $this->bookingService->notifyOwnerAboutNewBooking($booking);

            return response()->json([
                'success' => true,
                'message' => 'Бронирование успешно создано',
                'data' => $booking->load(['service', 'user.profile', 'specialist']),
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
            'specialist_id' => 'nullable|exists:team_members,id',
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

            // Сохраняем старый статус перед обновлением
            $oldStatus = $booking->status;
            
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
            
            // Если статус меняется на completed, генерируем токен для незарегистрированных клиентов
            if ($request->has('status') && $request->status === 'completed' && $oldStatus !== 'completed') {
                // Генерируем токен для отзыва, если клиент незарегистрирован
                // Проверяем, что user_id пустой (null или 0) и токен еще не сгенерирован
                if (empty($booking->user_id) && empty($booking->review_token)) {
                    $booking->generateReviewToken();
                    
                    \Log::info('BookingsController: Generated review token for unregistered client', [
                        'booking_id' => $booking->id,
                        'user_id' => $booking->user_id,
                        'client_email' => $booking->client_email,
                        'client_name' => $booking->client_name,
                        'review_token' => $booking->review_token,
                    ]);
                } else {
                    \Log::info('BookingsController: Skipped review token generation', [
                        'booking_id' => $booking->id,
                        'user_id' => $booking->user_id,
                        'has_review_token' => !empty($booking->review_token),
                    ]);
                }
            }
            
            // Отправляем уведомление клиенту при изменении статуса бронирования
            \Log::info('BookingsController: Checking notification conditions', [
                'booking_id' => $booking->id,
                'has_status' => $request->has('status'),
                'old_status' => $oldStatus,
                'new_status' => $request->status ?? 'not_set',
                'user_id' => $booking->user_id,
                'status_changed' => $oldStatus !== ($request->status ?? $oldStatus),
            ]);
            
            if ($request->has('status') && $oldStatus !== $request->status && $booking->user_id) {
                $this->sendBookingStatusNotification($booking, $oldStatus, $request->status);
            }

            if ($request->has('status') && $oldStatus !== $booking->status) {
                try {
                    $newStatus = $booking->status;
                    $fresh = $booking->fresh();
                    if ($newStatus === 'cancelled') {
                        ActivityService::logBookingCancelled($fresh, null, $oldStatus);
                    } elseif ($newStatus === 'completed') {
                        ActivityService::logBookingCompleted($fresh, null, $oldStatus);
                    } elseif ($newStatus === 'confirmed') {
                        ActivityService::logBookingConfirmed($fresh, null, $oldStatus);
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Activity log booking status: '.$e->getMessage());
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Бронирование успешно обновлено',
                'data' => $booking->load(['service', 'user.profile', 'specialist']),
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
    
    /**
     * Отправить уведомление клиенту об изменении статуса бронирования
     */
    private function sendBookingStatusNotification(Booking $booking, string $oldStatus, string $newStatus): void
    {
        $payload = ClientBookingNotificationTexts::forBookingStatusChange($booking, $newStatus);
        if ($payload === null) {
            return;
        }

        Notification::create([
            'user_id' => $booking->user_id,
            'type' => 'booking',
            'title' => $payload['title'],
            'message' => $payload['message'],
            'link' => $payload['link'],
            'read' => false,
        ]);

        ClientNotificationMailer::bookingStatusIfEnabled(
            $booking->user_id,
            $payload['title'],
            $payload['message'],
            $payload['link']
        );

        $this->bookingService->notifyOwnerAboutBookingStatusChange($booking, $newStatus);

        \Log::info('BookingsController: Notification sent to client', [
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'title' => $payload['title'],
        ]);
    }
}

