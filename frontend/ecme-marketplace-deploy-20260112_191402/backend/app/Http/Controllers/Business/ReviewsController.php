<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Advertisement;
use Illuminate\Http\Request;

class ReviewsController extends Controller
{
    /**
     * Get reviews for company's advertisements.
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

        $reviews = Review::with([
            'user.profile',
            'service',
            'booking.specialist.profile',
            'booking', // Загружаем booking для получения client_name
            'order.booking.specialist.profile',
            'order.booking', // Загружаем order.booking для получения client_name
        ])
        ->where('company_id', $companyId)
        ->where('is_visible', true)
        ->orderBy('created_at', 'desc')
        ->get();

        // Группируем отзывы по объявлениям
        $groupedByAdvertisement = [];
        $reviewsWithoutAd = [];

        // Получаем все объявления компании
        $advertisements = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->get();

        foreach ($reviews as $review) {
            $advertisement = $this->findAdvertisementForReview($review, $advertisements);
            
            if ($advertisement) {
                $adId = $advertisement->id;
                if (!isset($groupedByAdvertisement[$adId])) {
                    $groupedByAdvertisement[$adId] = [
                        'advertisement' => [
                            'id' => $advertisement->id,
                            'title' => $advertisement->title,
                            'link' => $advertisement->link,
                            'image' => $advertisement->image,
                        ],
                        'reviews' => [],
                        'averageRating' => 0,
                        'totalReviews' => 0,
                    ];
                }
                
                $groupedByAdvertisement[$adId]['reviews'][] = $this->formatReview($review, $advertisement);
            } else {
                $reviewsWithoutAd[] = $this->formatReview($review, null);
            }
        }

        // Вычисляем средний рейтинг для каждого объявления
        foreach ($groupedByAdvertisement as $adId => &$group) {
            if (count($group['reviews']) > 0) {
                $group['averageRating'] = round(
                    collect($group['reviews'])->avg('rating'),
                    1
                );
                $group['totalReviews'] = count($group['reviews']);
            }
        }

        // Сортируем по количеству отзывов (по убыванию)
        uasort($groupedByAdvertisement, function ($a, $b) {
            return $b['totalReviews'] <=> $a['totalReviews'];
        });

        $allGroups = array_values($groupedByAdvertisement);
        
        // Добавляем reviewsWithoutAd как отдельную группу (если есть)
        if (count($reviewsWithoutAd) > 0) {
            $allGroups[] = [
                'advertisement' => null,
                'reviews' => $reviewsWithoutAd,
                'averageRating' => round(collect($reviewsWithoutAd)->avg('rating'), 1),
                'totalReviews' => count($reviewsWithoutAd),
            ];
        }

        // Пагинация групп
        $page = (int) $request->get('page', 1);
        $pageSize = (int) $request->get('pageSize', 10);
        $total = count($allGroups);
        
        $paginatedGroups = array_slice($allGroups, ($page - 1) * $pageSize, $pageSize);
        
        // Разделяем обратно на groupedByAdvertisement и reviewsWithoutAd
        $paginatedGroupedByAdvertisement = [];
        $paginatedReviewsWithoutAd = [];
        
        foreach ($paginatedGroups as $group) {
            if ($group['advertisement'] === null) {
                $paginatedReviewsWithoutAd = $group['reviews'];
            } else {
                $paginatedGroupedByAdvertisement[] = $group;
            }
        }

        return response()->json([
            'data' => [
                'groupedByAdvertisement' => $paginatedGroupedByAdvertisement,
                'reviewsWithoutAd' => $paginatedReviewsWithoutAd,
            ],
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Find advertisement for a review.
     */
    private function findAdvertisementForReview($review, $advertisements)
    {
        $serviceId = null;

        // Определяем service_id
        if ($review->order && $review->order->booking && $review->order->booking->service_id) {
            $serviceId = $review->order->booking->service_id;
        } elseif ($review->booking && $review->booking->service_id) {
            $serviceId = $review->booking->service_id;
        } elseif ($review->service_id) {
            $serviceId = $review->service_id;
        }

        if ($serviceId) {
            $advertisement = $advertisements->first(function ($ad) use ($serviceId) {
                $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                foreach ($services as $svc) {
                    if (isset($svc['id']) && (string)$svc['id'] === (string)$serviceId) {
                        return true;
                    }
                }
                return false;
            });
        } else {
            $advertisement = $advertisements->first();
        }

        return $advertisement;
    }

    /**
     * Format review data.
     */
    private function formatReview($review, $advertisement)
    {
        $user = $review->user;
        $profile = $user->profile ?? null;
        
        // Определяем название услуги
        $serviceName = null;
        if ($advertisement && !empty($advertisement->services)) {
            $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
            $serviceId = $review->service_id 
                ?? ($review->booking->service_id ?? null)
                ?? ($review->order->booking->service_id ?? null);
            
            if ($serviceId) {
                $serviceData = collect($services)->first(function ($s) use ($serviceId) {
                    return isset($s['id']) && (string)$s['id'] === (string)$serviceId;
                });
                if ($serviceData && isset($serviceData['name'])) {
                    $serviceName = $serviceData['name'];
                }
            }
        }
        
        if (!$serviceName && $review->service) {
            $serviceName = $review->service->name;
        }

        // Определяем исполнителя
        $specialistName = null;
        if ($review->order && $review->order->booking && $review->order->booking->specialist) {
            $specialist = $review->order->booking->specialist;
            $specialistProfile = $specialist->profile ?? null;
            $specialistName = $specialistProfile 
                ? ($specialistProfile->first_name . ' ' . $specialistProfile->last_name)
                : $specialist->name;
        } elseif ($review->booking && $review->booking->specialist) {
            $specialist = $review->booking->specialist;
            $specialistProfile = $specialist->profile ?? null;
            $specialistName = $specialistProfile 
                ? ($specialistProfile->first_name . ' ' . $specialistProfile->last_name)
                : $specialist->name;
        }

        // ОПРЕДЕЛЯЕМ ИМЯ ПОЛЬЗОВАТЕЛЯ
        $userName = 'Аноним';
        
        if ($user && $profile) {
            // Зарегистрированный пользователь - берем имя из профиля
            $userName = trim($profile->first_name . ' ' . $profile->last_name);
            if (empty($userName)) {
                $userName = $user->email ?? 'Аноним';
            }
        } else {
            // Незарегистрированный пользователь - берем имя из бронирования
            if ($review->order && $review->order->booking && $review->order->booking->client_name) {
                $userName = $review->order->booking->client_name . ' (не авторизован)';
            } elseif ($review->booking && $review->booking->client_name) {
                $userName = $review->booking->client_name . ' (не авторизован)';
            } else {
                $userName = 'Аноним (не авторизован)';
            }
        }

        return [
            'id' => $review->id,
            'userId' => $user ? $user->id : null, // ID пользователя для ссылки на профиль
            'userName' => $userName,
            'userAvatar' => ($user && $profile) ? ($profile->avatar ?? null) : null,
            'rating' => (float) $review->rating,
            'comment' => $review->comment ?? '',
            'serviceName' => $serviceName,
            'specialistName' => $specialistName,
            'response' => $review->response ?? null,
            'responseAt' => $review->response_at ? $review->response_at->toISOString() : null,
            'createdAt' => $review->created_at->toISOString(),
        ];
    }

    /**
     * Update review response.
     */
    public function updateResponse(Request $request, $id)
    {
        $companyId = $request->get('current_company_id');
        
        if (!$companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $review = Review::where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();
        
        $review->update([
            'response' => $request->input('response'),
            'response_at' => $request->input('response') ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ответ на отзыв обновлен',
        ]);
    }
}

