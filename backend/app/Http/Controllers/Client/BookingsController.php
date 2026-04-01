<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\ActivityService;
use Illuminate\Http\Request;

class BookingsController extends Controller
{
    /**
     * Get client bookings.
     */
    public function index(Request $request)
    {
        $user = auth('api')->user();

        $query = Booking::where('user_id', $user->id)
            ->with(['service', 'company', 'specialist', 'additionalServices', 'discountTier', 'promoCode']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by upcoming/past
        // Если upcoming=true, показываем только активные (не завершенные и не отмененные) с датой >= сегодня
        // Если upcoming=false, показываем завершенные или отмененные, либо с датой < сегодня
        if ($request->has('upcoming')) {
            $isUpcoming = filter_var($request->upcoming, FILTER_VALIDATE_BOOLEAN);
            if ($isUpcoming) {
                // Предстоящие: дата >= сегодня И статус не завершен/отменен
                $query->where('booking_date', '>=', now()->startOfDay())
                    ->whereNotIn('status', ['completed', 'cancelled']);
            } else {
                // Прошедшие: либо завершен/отменен, либо дата < сегодня
                $query->where(function($q) {
                    $q->whereIn('status', ['completed', 'cancelled'])
                      ->orWhere('booking_date', '<', now()->startOfDay());
                });
            }
        }

        $bookings = $query->orderBy('booking_date', 'desc')->get();

        $data = $bookings->map(function ($booking) {
            // Ищем объявление, связанное с этим бронированием
            $advertisement = null;
            $serviceName = 'N/A';
            
            // ВАЖНО: Если в бронировании есть advertisement_id, используем ТОЛЬКО это объявление!
            // Иначе может быть путаница, так как виртуальные ID могут совпадать между объявлениями
            if ($booking->advertisement_id) {
                $advertisement = \App\Models\Advertisement::find($booking->advertisement_id);
                if ($advertisement) {
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    $serviceData = collect($services)->first(function ($s) use ($booking) {
                        return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                    });
                    
                    if ($serviceData && isset($serviceData['name'])) {
                        $serviceName = $serviceData['name'];
                    }
                }
            } else {
                // Если advertisement_id не сохранен, ищем во всех объявлениях (старая логика)
                $advertisements = \App\Models\Advertisement::where('company_id', $booking->company_id)
                    ->where('type', 'regular')
                    ->where('is_active', true)
                    ->where('status', 'approved')
                    ->get();
                
                foreach ($advertisements as $ad) {
                    $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                    $serviceData = collect($services)->first(function ($s) use ($booking) {
                        return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                    });
                    
                    if ($serviceData && isset($serviceData['name'])) {
                        $serviceName = $serviceData['name'];
                        $advertisement = $ad;
                        break;
                    }
                }
            }
            
            // Если не нашли в объявлениях, проверяем таблицу services
            // Важно: проверяем, что услуга принадлежит компании из бронирования
            if ($serviceName === 'N/A' && $booking->service && $booking->service->company_id == $booking->company_id) {
                $serviceName = $booking->service->name;
            } elseif ($serviceName === 'N/A' && $booking->service) {
                // Если услуга существует, но принадлежит другой компании, используем её имя как fallback
                // Это может быть, если услуга была перенесена между компаниями
                $serviceName = $booking->service->name;
            }
            
            // Определяем slug объявления (приоритет - объявление, а не профиль бизнеса)
            $businessSlug = '';
            
            // Если объявление уже найдено выше, используем его
            if ($advertisement && $advertisement->link) {
                $businessSlug = str_replace('/marketplace/', '', $advertisement->link);
                $businessSlug = ltrim($businessSlug, '/');
            } else {
                // Если объявление не найдено, ищем любое активное объявление для этой компании
                $advertisement = \App\Models\Advertisement::where('company_id', $booking->company_id)
                    ->where('type', 'regular')
                    ->where('is_active', true)
                    ->where('status', 'approved')
                    ->first();
                
                if ($advertisement && $advertisement->link) {
                    $businessSlug = str_replace('/marketplace/', '', $advertisement->link);
                    $businessSlug = ltrim($businessSlug, '/');
                } else {
                    // Fallback: используем slug компании (если есть)
                    $businessSlug = $booking->company->slug ?? '';
                }
            }
            
            // Определяем имя мастера/исполнителя
            // Приоритет: мастер из команды объявления > пользователь из таблицы users
            $specialistName = null;
            
            if ($booking->specialist_id) {
                // Сначала ищем в team_members (основной источник)
                $teamMember = \App\Models\TeamMember::where('id', $booking->specialist_id)
                    ->where('company_id', $booking->company_id)
                    ->first();
                
                if ($teamMember) {
                    $specialistName = $teamMember->name;
                } else {
                    // Если не найден в БД, ищем в объявлении (для старых данных)
                    if ($advertisement && $advertisement->team) {
                        $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
                        $teamMember = collect($team)->first(function ($member) use ($booking) {
                            $memberId = $member['id'] ?? null;
                            return $memberId !== null && (
                                (string)$memberId === (string)$booking->specialist_id ||
                                (int)$memberId === (int)$booking->specialist_id
                            );
                        });
                        
                        if ($teamMember && isset($teamMember['name'])) {
                            $specialistName = $teamMember['name'];
                        }
                    }
                }
            }
            
            // Загружаем дополнительные услуги
            $additionalServices = $booking->additionalServices->map(function ($addService) {
                return [
                    'id' => $addService->id,
                    'name' => $addService->name,
                    'description' => $addService->description,
                    'pivot' => [
                        'quantity' => $addService->pivot->quantity ?? 1,
                        'price' => (float) ($addService->pivot->price ?? $addService->price ?? 0),
                    ],
                ];
            })->toArray();
            
            // Рассчитываем общую стоимость (с учётом скидок, сохранённых в бронировании)
            $basePrice = (float) ($booking->price ?? 0);
            $additionalTotal = $booking->additionalServices->sum(function ($service) {
                $price = (float) ($service->pivot->price ?? $service->price ?? 0);
                $quantity = (int) ($service->pivot->quantity ?? 1);
                return $price * $quantity;
            });
            $subtotal = $basePrice + $additionalTotal;
            $discountAmount = (float) ($booking->discount_amount ?? 0);
            $totalPrice = $booking->total_price !== null
                ? (float) $booking->total_price
                : max(0, $subtotal - $discountAmount);

            return [
                'id' => $booking->id,
                'serviceName' => $serviceName,
                'businessName' => $booking->company->name ?? 'N/A',
                'businessSlug' => $businessSlug,
                'date' => $booking->booking_date->format('Y-m-d'),
                'time' => $booking->booking_time,
                'status' => $booking->status,
                'price' => $basePrice,
                'total_price' => $totalPrice,
                'discount_amount' => $discountAmount,
                'discount_source' => $booking->discount_source,
                'discount_tier_name' => $booking->discountTier?->name,
                'promo_code' => $booking->promoCode?->code,
                'additional_services' => $additionalServices,
                'specialist' => $specialistName,
                'notes' => $booking->client_notes,
            ];
        });

        return response()->json($data);
    }

    /**
     * Cancel booking.
     */
    public function cancel($id)
    {
        $user = auth('api')->user();
        $booking = Booking::where('user_id', $user->id)->findOrFail($id);

        if (!in_array($booking->status, ['new', 'pending', 'confirmed'])) {
            return response()->json([
                'message' => 'Невозможно отменить это бронирование',
            ], 400);
        }

        $previousStatus = $booking->status;

        $booking->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => 'Отменено клиентом',
        ]);

        try {
            ActivityService::logBookingCancelled($booking->fresh(), $user, $previousStatus);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Activity log booking cancelled (client): '.$e->getMessage());
        }

        // Уведомление владельцу бизнеса об отмене бронирования клиентом
        app(\App\Services\BookingService::class)->notifyOwnerAboutBookingStatusChange($booking, 'cancelled');

        return response()->json([
            'message' => 'Бронирование отменено',
        ]);
    }
}

