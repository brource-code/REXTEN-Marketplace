<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Advertisement;
use Illuminate\Http\Request;

class ReviewsController extends Controller
{
    /**
     * Get all reviews grouped by advertisement.
     */
    public function index(Request $request)
    {
        $reviews = Review::with([
            'user.profile',
            'company',
            'service',
            'booking.specialist.profile',
            'order.booking.specialist.profile',
            'booking.company',
            'order.company',
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        // Группируем отзывы по объявлениям
        $groupedByAdvertisement = [];
        $reviewsWithoutAd = [];

        foreach ($reviews as $review) {
            $advertisement = $this->findAdvertisementForReview($review);
            
            if ($advertisement) {
                $adId = $advertisement->id;
                if (!isset($groupedByAdvertisement[$adId])) {
                    $groupedByAdvertisement[$adId] = [
                        'advertisement' => [
                            'id' => $advertisement->id,
                            'title' => $advertisement->title,
                            'link' => $advertisement->link,
                            'image' => $advertisement->image,
                            'company' => [
                                'id' => $advertisement->company->id ?? null,
                                'name' => $advertisement->company->name ?? 'N/A',
                                'slug' => $advertisement->company->slug ?? null,
                            ],
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
        
        // Добавляем reviewsWithoutAd как отдельные группы (если есть)
        if (count($reviewsWithoutAd) > 0) {
            // Создаем виртуальную группу для отзывов без объявлений
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
    private function findAdvertisementForReview($review)
    {
        $companyId = null;
        $serviceId = null;

        // Определяем company_id и service_id
        if ($review->order && $review->order->company_id) {
            $companyId = $review->order->company_id;
            $booking = $review->order->booking;
            if ($booking && $booking->service_id) {
                $serviceId = $booking->service_id;
            }
        } elseif ($review->booking && $review->booking->company_id) {
            $companyId = $review->booking->company_id;
            if ($review->booking->service_id) {
                $serviceId = $review->booking->service_id;
            }
        } elseif ($review->company_id) {
            $companyId = $review->company_id;
            if ($review->service_id) {
                $serviceId = $review->service_id;
            }
        }

        if (!$companyId) {
            return null;
        }

        // Ищем объявление по company_id и service_id
        $advertisements = Advertisement::where('company_id', $companyId)
            ->where('type', 'regular')
            ->where('is_active', true)
            ->where('status', 'approved')
            ->get();

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

        if ($advertisement) {
            $advertisement->load('company');
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

        return [
            'id' => $review->id,
            'userName' => $profile 
                ? ($profile->first_name . ' ' . $profile->last_name)
                : ($user->email ?? 'Аноним'),
            'userAvatar' => $profile->avatar ?? null,
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
        $review = Review::findOrFail($id);
        
        $review->update([
            'response' => $request->input('response'),
            'response_at' => $request->input('response') ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ответ на отзыв обновлен',
        ]);
    }

    /**
     * Delete review.
     */
    public function destroy($id)
    {
        $review = Review::findOrFail($id);
        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Отзыв удален',
        ]);
    }
}

