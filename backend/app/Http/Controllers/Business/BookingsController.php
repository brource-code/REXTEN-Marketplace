<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Services\ClientBookingNotificationTexts;
use App\Services\ClientNotificationMailer;
use App\Models\Booking;
use App\Models\Notification;
use App\Services\ActivityService;
use App\Services\BookingService;
use App\Support\MarketplaceClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

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
            ->withoutPendingPayment()
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
            ->withoutPendingPayment()
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
            'service_id' => 'nullable|exists:services,id',
            'title' => 'nullable|string|max:255',
            'event_type' => 'nullable|in:booking,block,task',
            'user_id' => ['nullable', Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'CLIENT'))],
            'booking_date' => 'required|date',
            'booking_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:15',
            'specialist_id' => 'nullable|exists:team_members,id',
            'price' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:new,pending,confirmed,completed,cancelled',
            'notes' => 'nullable|string|max:1000',
            'client_notes' => 'nullable|string|max:1000',
        ]);

        // Для обычных бронирований (event_type=booking, дефолт) обязательно либо service_id, либо title (custom event).
        // Для блок-времени (event_type=block) — обязателен только title.
        $eventType = $request->input('event_type', 'booking');
        if ($eventType === 'block') {
            if (! $request->filled('title')) {
                $validator->after(function ($v) {
                    $v->errors()->add('title', 'Title is required for block-time events');
                });
            }
        } elseif (! $request->filled('service_id') && ! $request->filled('title')) {
            $validator->after(function ($v) {
                $v->errors()->add('service_id', 'Either service_id or title is required');
            });
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Для custom/block событий доступность не проверяем — допускаем оверлап.
            $isCustomOrBlock = ! $request->filled('service_id') || $eventType === 'block';

            if (! $isCustomOrBlock) {
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
            }

            $booking = $this->bookingService->createBooking([
                'company_id' => $companyId,
                'user_id' => $request->user_id,
                'service_id' => $request->service_id,
                'title' => $request->title,
                'event_type' => $eventType,
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

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
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

        $booking = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'service_id' => 'sometimes|nullable|exists:services,id',
            'title' => 'sometimes|nullable|string|max:255',
            'event_type' => 'sometimes|in:booking,block,task',
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
            // Для блок-времени и custom событий (без service_id) пропускаем проверку — допускаем оверлап.
            $isBlockOrCustom = ($booking->event_type === 'block')
                || ($request->input('event_type') === 'block')
                || (! ($request->service_id ?? $booking->service_id));

            $serviceId = $request->service_id ?? $booking->service_id;
            $bookingDate = $request->booking_date ?? $booking->booking_date->format('Y-m-d');
            $bookingTimeRaw = $request->booking_time ?? $booking->booking_time;
            $bookingTime = (string) $bookingTimeRaw;
            if (strlen($bookingTime) === 8 && substr($bookingTime, -3) === ':00') {
                $bookingTime = substr($bookingTime, 0, 5);
            }
            $duration = (int) ($request->duration_minutes ?? $booking->duration_minutes ?? 60);

            // Эффективный исполнитель после PATCH: иначе смена specialist_id не проверялась на пересечения.
            $specialistForCheck = $request->exists('specialist_id')
                ? ($request->input('specialist_id') !== null && $request->input('specialist_id') !== ''
                    ? (int) $request->input('specialist_id')
                    : null)
                : ($booking->specialist_id !== null ? (int) $booking->specialist_id : null);

            $slotRelevantChange = $request->has('booking_date')
                || $request->has('booking_time')
                || $request->has('duration_minutes')
                || $request->exists('specialist_id');

            $skippingCancel = $request->has('status') && $request->status === 'cancelled';

            if (! $isBlockOrCustom && $slotRelevantChange && $booking->status !== 'cancelled' && ! $skippingCancel) {
                $serviceModel = $serviceId
                    ? \App\Models\Service::where('id', $serviceId)->where('company_id', $companyId)->first()
                    : null;

                $isAvailable = $this->bookingService->isSlotAvailable(
                    $companyId,
                    $serviceId,
                    $bookingDate,
                    $bookingTime,
                    $duration,
                    $booking->id,
                    $serviceModel,
                    $specialistForCheck
                );

                if (! $isAvailable) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Это время уже занято для выбранного исполнителя. Выберите другое время или исполнителя.',
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

            // user_id не обновляем массово: иначе при PATCH можно подменить клиента и увести чужие клиентские уведомления в inbox владельца.
            $booking->update($request->only([
                'service_id',
                'title',
                'event_type',
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
            
            // Если статус меняется на completed — авто-capture и генерация токена
            if ($request->has('status') && $request->status === 'completed' && $oldStatus !== 'completed') {
                // Auto-capture authorized payment
                if ($booking->payment_status === 'authorized') {
                    $user = auth('api')->user();
                    $captureResult = app(\App\Services\BookingService::class)
                        ->captureAuthorizedPayment($booking, $user?->id, $user?->role);
                    if ($captureResult['captured']) {
                        $booking->refresh();
                    }
                }

                // Генерируем токен для отзыва, если клиент незарегистрирован
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

            // Если статус меняется на cancelled — авто-refund или отмена hold
            if ($request->has('status') && $request->status === 'cancelled' && $oldStatus !== 'cancelled') {
                $booking->cancelled_at = now();
                $booking->cancellation_reason = $request->cancellation_reason ?? 'Отменено бизнесом';
                $booking->save();

                if (in_array($booking->payment_status, ['authorized', 'paid'])) {
                    $user = auth('api')->user();
                    app(\App\Services\BookingService::class)
                        ->refundOrCancelPayment($booking, $user?->id, $user?->role, $booking->cancellation_reason);
                    $booking->refresh();
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

        $booking = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->findOrFail($id);

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

        if (MarketplaceClient::isClientUserId((int) $booking->user_id)) {
            Notification::create([
                'user_id' => $booking->user_id,
                'company_id' => $booking->company_id,
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
        } else {
            \Log::warning('BookingsController: skip client booking status in-app/email — user_id is not a CLIENT', [
                'booking_id' => $booking->id,
                'user_id' => $booking->user_id,
                'new_status' => $newStatus,
            ]);
        }

        $this->bookingService->notifyOwnerAboutBookingStatusChange($booking, $newStatus);

        \Log::info('BookingsController: client booking status flow finished', [
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'title' => $payload['title'],
            'delivered_to_client_portal' => MarketplaceClient::isClientUserId((int) $booking->user_id),
        ]);
    }
}

