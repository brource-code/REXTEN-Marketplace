<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * Получить информацию о бронировании по токену
     */
    public function showByToken($token)
    {
        // Ищем бронирование по токену
        // Токен генерируется ТОЛЬКО для завершенных бронирований (status = 'completed')
        // и ТОЛЬКО для незарегистрированных клиентов (user_id = null)
        $booking = Booking::where('review_token', $token)
            ->where('status', 'completed') // Токен работает только для завершенных бронирований
            ->whereNull('user_id') // Токен только для незарегистрированных клиентов
            ->where(function($q) {
                $q->whereNull('review_token_expires_at')
                  ->orWhere('review_token_expires_at', '>', now());
            })
            ->with(['company', 'service', 'advertisement'])
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Ссылка на отзыв недействительна или истекла',
            ], 404);
        }

        // Проверяем, нет ли уже отзыва
        $hasReview = Review::where('booking_id', $booking->id)->exists();

        // Определяем название услуги
        $serviceName = 'N/A';
        if ($booking->service) {
            $serviceName = $booking->service->name;
        } elseif ($booking->advertisement_id) {
            // Если услуга из объявления, берем из JSON
            $advertisement = $booking->advertisement;
            if ($advertisement) {
                $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                $serviceData = collect($services)->first(function ($s) use ($booking) {
                    return isset($s['id']) && (string)$s['id'] === (string)$booking->service_id;
                });
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }

        // Определяем название бизнеса
        $businessName = 'N/A';
        if ($booking->company) {
            $businessName = $booking->company->name;
        }

        return response()->json([
            'success' => true,
            'booking' => [
                'id' => $booking->id,
                'serviceName' => $serviceName,
                'businessName' => $businessName,
                'date' => $booking->booking_date ? $booking->booking_date->format('Y-m-d') : null,
                'time' => $booking->booking_time,
                'clientName' => $booking->client_name,
                'hasReview' => $hasReview,
            ],
        ]);
    }

    /**
     * Создать отзыв по токену (публичный, без авторизации)
     */
    public function storeByToken(Request $request, $token)
    {
        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10|max:1000',
            'clientName' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Находим бронирование по токену
        $booking = Booking::where('review_token', $token)
            ->where('status', 'completed')
            ->where(function($q) {
                $q->whereNull('review_token_expires_at')
                  ->orWhere('review_token_expires_at', '>', now());
            })
            ->with(['company', 'service', 'advertisement'])
            ->first();

        if (!$booking) {
            return response()->json([
                'message' => 'Ссылка на отзыв недействительна или истекла',
            ], 404);
        }

        // Проверяем, нет ли уже отзыва
        if (Review::where('booking_id', $booking->id)->exists()) {
            return response()->json([
                'message' => 'Отзыв на это бронирование уже оставлен',
            ], 409);
        }

        // Определяем advertisement_id
        $advertisementId = $booking->advertisement_id ?? null;
        
        // Если нет advertisement_id в бронировании, ищем объявление по service_id
        if (!$advertisementId && $booking->service_id) {
            $advertisement = \App\Models\Advertisement::where('company_id', $booking->company_id)
                ->where(function($q) {
                    $q->where('type', 'regular')
                      ->orWhere('type', 'marketplace')
                      ->orWhereNull('type');
                })
                ->where('is_active', true)
                ->where('status', 'approved')
                ->get()
                ->first(function ($ad) use ($booking) {
                    if (!$booking->service_id) {
                        return true; // Если нет service_id, берем первое объявление
                    }
                    
                    // Проверяем услуги в таблице services
                    $serviceExists = \App\Models\Service::where('advertisement_id', $ad->id)
                        ->where('id', $booking->service_id)
                        ->exists();
                    if ($serviceExists) {
                        return true;
                    }
                    
                    // Fallback: проверяем JSON поле для старых данных
                    $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                    foreach ($services as $svc) {
                        if (isset($svc['id']) && (string)$svc['id'] === (string)$booking->service_id) {
                            return true;
                        }
                    }
                    return false;
                });
            
            if ($advertisement) {
                $advertisementId = $advertisement->id;
            }
        }

        // Создаем отзыв БЕЗ user_id (для незарегистрированных клиентов)
        $review = Review::create([
            'user_id' => null, // Незарегистрированный клиент
            'company_id' => $booking->company_id,
            'service_id' => $booking->service_id,
            'booking_id' => $booking->id,
            'advertisement_id' => $advertisementId, // Может быть null, если объявления нет
            'rating' => $request->rating,
            'comment' => $request->comment,
            'is_visible' => true,
        ]);

        // Обновляем рейтинги
        $this->updateCompanyRating($booking->company_id);
        if ($booking->service_id) {
            $this->updateServiceRating($booking->service_id);
        }

        return response()->json([
            'message' => 'Отзыв успешно создан',
            'data' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
            ],
        ], 201);
    }

    /**
     * Update company average rating.
     */
    private function updateCompanyRating($companyId)
    {
        $avgRating = Review::where('company_id', $companyId)
            ->where('is_visible', true)
            ->avg('rating');

        // Можно сохранить в кеш или в таблицу companies
        // Пока просто возвращаем, можно добавить поле average_rating в companies
    }

    /**
     * Update service average rating.
     */
    private function updateServiceRating($serviceId)
    {
        $avgRating = Review::where('service_id', $serviceId)
            ->where('is_visible', true)
            ->avg('rating');

        // Можно сохранить в кеш или в таблицу services
    }
}
