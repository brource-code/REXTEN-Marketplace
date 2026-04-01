<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Order;
use App\Models\Booking;
use App\Models\Advertisement;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReviewsController extends Controller
{
    /**
     * Get client reviews (completed reviews).
     */
    public function index()
    {
        $user = auth('api')->user();

        $reviews = Review::where('user_id', $user->id)
            ->with([
                'company',
                'service',
                'advertisement',
                'booking.company',
                'booking.service',
                'booking.advertisement',
                'booking.specialist',
                'order.company',
                'order.booking.company',
                'order.booking.service',
                'order.booking.advertisement',
                'order.booking.specialist',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $data = $reviews->map(function ($review) {
            // Определяем правильную компанию и услугу
            // Приоритет: из заказа -> из бронирования -> из отзыва
            $company = null;
            $service = null;
            $serviceName = 'N/A';
            $businessName = 'N/A';
            $businessSlug = '';
            $businessAvatar = null;
            $advertisement = null;
            
            if ($review->order && $review->order->company) {
                // Если есть заказ, берем компанию из заказа
                $company = $review->order->company;
                $booking = $review->order->booking;
                if ($booking && $booking->service) {
                    $service = $booking->service;
                }
            } elseif ($review->booking && $review->booking->company) {
                // Если есть бронирование, берем компанию из бронирования
                $company = $review->booking->company;
                if ($review->booking->service) {
                    $service = $review->booking->service;
                }
            } elseif ($review->company) {
                // Fallback: берем из отзыва
                $company = $review->company;
                if ($review->service) {
                    $service = $review->service;
                }
            }
            
            // Ищем объявление для этого отзыва
            // Приоритет: advertisement_id из отзыва -> advertisement_id из бронирования -> advertisement_id из order->booking
            if ($review->advertisement_id) {
                // Используем объявление из отзыва
                $advertisement = $review->advertisement;
            } elseif ($review->booking && $review->booking->advertisement_id) {
                // Используем объявление из бронирования
                $advertisement = $review->booking->advertisement;
            } elseif ($review->order && $review->order->booking && $review->order->booking->advertisement_id) {
                // Используем объявление из бронирования через заказ
                $advertisement = $review->order->booking->advertisement;
            }
            
            // Если не нашли объявление по advertisement_id, ищем по старой логике (для обратной совместимости)
            if (!$advertisement && $review->booking && $review->booking->company_id) {
                // Ищем объявление по company_id и service_id из бронирования
                $advertisement = \App\Models\Advertisement::where('company_id', $review->booking->company_id)
                    ->where(function($q) {
                        $q->where('type', 'regular')
                          ->orWhere('type', 'marketplace')
                          ->orWhereNull('type');
                    })
                    ->where('is_active', true)
                    ->where('status', 'approved')
                    ->get()
                    ->first(function ($ad) use ($review) {
                        if (!$review->booking->service_id) {
                            return true; // Если нет service_id, берем первое объявление
                        }
                        // Проверяем услуги в таблице services
                        $serviceExists = \App\Models\Service::where('advertisement_id', $ad->id)
                            ->where('id', $review->booking->service_id)
                            ->exists();
                        if ($serviceExists) {
                            return true;
                        }
                        // Fallback: проверяем JSON поле для старых данных
                        $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                        foreach ($services as $svc) {
                            if (isset($svc['id']) && (string)$svc['id'] === (string)$review->booking->service_id) {
                                return true;
                            }
                        }
                        return false;
                    });
            } elseif (!$advertisement && $review->order && $review->order->company_id) {
                $booking = $review->order->booking;
                if ($booking) {
                    $advertisement = \App\Models\Advertisement::where('company_id', $review->order->company_id)
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
                                return true;
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
                }
            }
            
            // Если не нашли объявление, ищем любое активное объявление компании
            if (!$advertisement && $company) {
                $advertisement = \App\Models\Advertisement::where('company_id', $company->id)
                    ->where(function($q) {
                        $q->where('type', 'regular')
                          ->orWhere('type', 'marketplace')
                          ->orWhereNull('type');
                    })
                    ->where('is_active', true)
                    ->where('status', 'approved')
                    ->first();
            }
            
            // Определяем slug для ссылки
            if ($advertisement && $advertisement->link) {
                $businessSlug = str_replace('/marketplace/', '', $advertisement->link);
                $businessSlug = ltrim($businessSlug, '/');
            } elseif ($company) {
                // Fallback: используем slug компании
                $businessSlug = $company->slug ?? '';
            }
            
            // Определяем название услуги из объявления
            // Сначала проверяем таблицу services
                $serviceId = null;
                if ($review->booking && $review->booking->service_id) {
                $serviceId = $review->booking->service_id;
                } elseif ($review->order && $review->order->booking && $review->order->booking->service_id) {
                $serviceId = $review->order->booking->service_id;
                } elseif ($review->service_id) {
                $serviceId = $review->service_id;
                }
                
            if ($serviceId && $advertisement) {
                // Ищем услугу в таблице services
                $serviceFromTable = \App\Models\Service::where('advertisement_id', $advertisement->id)
                    ->where('id', $serviceId)
                    ->first();
                if ($serviceFromTable) {
                    $serviceName = $serviceFromTable->name;
                } else {
                    // Fallback: проверяем JSON поле для старых данных
                    $services = is_array($advertisement->services) ? $advertisement->services : (json_decode($advertisement->services, true) ?? []);
                    if (!empty($services)) {
                    $serviceData = collect($services)->first(function ($s) use ($serviceId) {
                            return isset($s['id']) && (string)$s['id'] === (string)$serviceId;
                    });
                    if ($serviceData && isset($serviceData['name'])) {
                        $serviceName = $serviceData['name'];
                        }
                    }
                }
            }
            
            // Если не нашли в объявлении, используем из service
            if ($serviceName === 'N/A') {
                if ($service) {
                    $serviceName = $service->name;
                } elseif ($review->service) {
                    $serviceName = $review->service->name;
                }
            }
            
            // Определяем информацию о компании и объявлении
            if ($advertisement) {
                // Используем название объявления вместо названия компании
                $businessName = $advertisement->title;
                $businessAvatar = $advertisement->image ?? $company->logo ?? null;
            } elseif ($company) {
                $businessName = $company->name;
                $businessAvatar = $company->logo ?? null;
            }
            
            // Определяем исполнителя (специалиста) из команды объявления
            $specialistName = null;
            $bookingSpecialistId = null;
            
            // Получаем ID специалиста из бронирования
            if ($review->order && $review->order->booking && $review->order->booking->specialist_id) {
                $bookingSpecialistId = $review->order->booking->specialist_id;
            } elseif ($review->booking && $review->booking->specialist_id) {
                $bookingSpecialistId = $review->booking->specialist_id;
            }
            
            // Сначала ищем в team_members (основной источник)
            if ($bookingSpecialistId) {
                $teamMember = \App\Models\TeamMember::where('id', $bookingSpecialistId)
                    ->where('company_id', $company->id)
                    ->first();
                
                if ($teamMember) {
                    $specialistName = $teamMember->name;
                } else {
                    // Если не найден в БД, ищем в объявлении (для старых данных)
                    if ($advertisement && $advertisement->team) {
                        $team = is_array($advertisement->team) ? $advertisement->team : (json_decode($advertisement->team, true) ?? []);
                        
                        // Ищем специалиста в команде по ID
                        $teamMember = collect($team)->first(function ($member) use ($bookingSpecialistId) {
                            return isset($member['id']) && (int)$member['id'] === (int)$bookingSpecialistId;
                        });
                        
                        if ($teamMember && isset($teamMember['name'])) {
                            $specialistName = $teamMember['name'];
                        }
                    }
                }
            }
            
            // Fallback: если не нашли, используем имя из связи specialist (для старых данных)
            if (!$specialistName && $bookingSpecialistId) {
                $specialist = null;
                if ($review->order && $review->order->booking && $review->order->booking->specialist) {
                    $specialist = $review->order->booking->specialist;
                } elseif ($review->booking && $review->booking->specialist) {
                    $specialist = $review->booking->specialist;
                }
                
                if ($specialist) {
                    // specialist теперь это TeamMember, у которого есть только name
                    if ($specialist->name) {
                        $specialistName = $specialist->name;
                    }
                }
            }
            
            return [
                'id' => $review->id,
                'orderId' => $review->order_id,
                'bookingId' => $review->booking_id,
                'companyId' => $company ? $company->id : $review->company_id,
                'businessName' => $businessName,
                'businessSlug' => $businessSlug,
                'serviceId' => $service ? $service->id : $review->service_id,
                'serviceName' => $serviceName,
                'specialistName' => $specialistName,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'response' => $review->response,
                'responseAt' => $review->response_at ? $review->response_at->toISOString() : null,
                'createdAt' => $review->created_at->toISOString(),
                'businessAvatar' => $businessAvatar,
            ];
        });

        return response()->json($data);
    }

    /**
     * Get orders pending reviews (completed orders/bookings without reviews).
     */
    public function pending()
    {
        $user = auth('api')->user();

        $data = collect();

        // Получаем завершенные заказы без отзывов
        $orders = Order::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereDoesntHave('review')
            ->with(['booking.service', 'company', 'booking.advertisement'])
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($orders as $order) {
            $booking = $order->booking;
            $service = $booking->service ?? null;
            $company = $order->company;
            
            // Определяем объявление и slug
            $advertisement = $booking->advertisement ?? null;
            $businessSlug = '';
            $businessName = $company->name ?? 'N/A';
            
            if ($advertisement && $advertisement->link) {
                $businessSlug = str_replace('/marketplace/', '', $advertisement->link);
                $businessSlug = ltrim($businessSlug, '/');
                $businessName = $advertisement->title ?? $businessName;
            } elseif ($company) {
                $businessSlug = $company->slug ?? '';
            }

            $data->push([
                'id' => $order->id,
                'orderId' => $order->id,
                'bookingId' => $order->booking_id,
                'serviceName' => $service->name ?? 'N/A',
                'businessName' => $businessName,
                'businessSlug' => $businessSlug,
                'date' => $booking ? $booking->booking_date->format('Y-m-d') : $order->created_at->format('Y-m-d'),
                'time' => $booking ? $booking->booking_time : $order->created_at->format('H:i'),
                'price' => (float) $order->total,
                'completedAt' => $order->updated_at->toISOString(),
            ]);
        }

        // Получаем завершенные бронирования без заказов
        $bookings = Booking::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereDoesntHave('order')
            ->with(['service', 'company', 'advertisement'])
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($bookings as $booking) {
            // Проверяем, нет ли отзыва на это бронирование
            $hasReview = Review::where('booking_id', $booking->id)
                ->where('user_id', $user->id)
                ->exists();

            if (!$hasReview) {
                $service = $booking->service;
                $company = $booking->company;
                
                // Определяем объявление и slug
                $advertisement = $booking->advertisement ?? null;
                $businessSlug = '';
                $businessName = $company->name ?? 'N/A';
                
                if ($advertisement && $advertisement->link) {
                    $businessSlug = str_replace('/marketplace/', '', $advertisement->link);
                    $businessSlug = ltrim($businessSlug, '/');
                    $businessName = $advertisement->title ?? $businessName;
                } elseif ($company) {
                    $businessSlug = $company->slug ?? '';
                }

                $data->push([
                    'id' => $booking->id,
                    'orderId' => null,
                    'bookingId' => $booking->id,
                    'serviceName' => $service->name ?? 'N/A',
                    'businessName' => $businessName,
                    'businessSlug' => $businessSlug,
                    'date' => $booking->booking_date->format('Y-m-d'),
                    'time' => $booking->booking_time,
                    'price' => (float) $booking->price,
                    'completedAt' => $booking->updated_at->toISOString(),
                ]);
            }
        }

        return response()->json($data->values()->all());
    }

    /**
     * Create a new review.
     */
    public function store(Request $request)
    {
        $user = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'orderId' => 'required_without:bookingId|exists:orders,id',
            'bookingId' => 'required_without:orderId|exists:bookings,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Получаем заказ или бронирование
        $order = null;
        $booking = null;
        $company = null;
        $service = null;

        if ($request->orderId) {
            $order = Order::where('id', $request->orderId)
                ->where('user_id', $user->id)
                ->where('status', 'completed')
                ->with(['booking.advertisement', 'company'])
                ->first();

            if (!$order) {
                return response()->json([
                    'message' => 'Order not found or not completed',
                ], 404);
            }

            // Проверяем, нет ли уже отзыва на этот заказ
            if ($order->review) {
                return response()->json([
                    'message' => 'Review already exists for this order',
                ], 409);
            }

            $booking = $order->booking;
            $company = $order->company;
            $service = $booking->service ?? null;
        } elseif ($request->bookingId) {
            $booking = Booking::where('id', $request->bookingId)
                ->where('user_id', $user->id)
                ->where('status', 'completed')
                ->with(['advertisement', 'company', 'service'])
                ->first();

            if (!$booking) {
                return response()->json([
                    'message' => 'Booking not found or not completed',
                ], 404);
            }

            // Проверяем, нет ли уже отзыва на это бронирование
            $existingReview = Review::where('booking_id', $booking->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existingReview) {
                return response()->json([
                    'message' => 'Review already exists for this booking',
                ], 409);
            }

            $company = $booking->company;
            $service = $booking->service;
            $order = $booking->order;
        }

        if (!$company) {
            return response()->json([
                'message' => 'Company not found',
            ], 404);
        }

        // Определяем advertisement_id для отзыва
        // Приоритет: advertisement_id из бронирования -> поиск по service_id
        $advertisementId = null;
        if ($booking && $booking->advertisement_id) {
            // Используем объявление из бронирования
            $advertisementId = $booking->advertisement_id;
        } elseif ($service) {
            // Если нет advertisement_id в бронировании, ищем объявление по service_id
            // Сначала проверяем таблицу services
            $serviceWithAd = \App\Models\Service::where('id', $service->id)
                ->where('advertisement_id', '!=', null)
                ->first();
            
            if ($serviceWithAd && $serviceWithAd->advertisement_id) {
                $advertisementId = $serviceWithAd->advertisement_id;
            } else {
                // Fallback: ищем объявление по старой логике (для обратной совместимости)
            $advertisements = Advertisement::where('company_id', $company->id)
                    ->where(function($q) {
                        $q->where('type', 'regular')
                          ->orWhere('type', 'marketplace')
                          ->orWhereNull('type');
                    })
                ->where('is_active', true)
                ->where('status', 'approved')
                ->get();

            $advertisement = $advertisements->first(function ($ad) use ($service) {
                    // Проверяем услуги в таблице services
                    $serviceExists = \App\Models\Service::where('advertisement_id', $ad->id)
                        ->where('id', $service->id)
                        ->exists();
                    if ($serviceExists) {
                        return true;
                    }
                    // Fallback: проверяем JSON поле для старых данных
                $services = is_array($ad->services) ? $ad->services : (json_decode($ad->services, true) ?? []);
                foreach ($services as $svc) {
                    if (isset($svc['id']) && (string)$svc['id'] === (string)$service->id) {
                        return true;
                    }
                }
                return false;
            });

            if ($advertisement) {
                $advertisementId = $advertisement->id;
            } elseif ($advertisements->count() > 0) {
                // Если не нашли конкретное объявление, берем первое активное
                $advertisementId = $advertisements->first()->id;
                }
            }
        }

        // Создаем отзыв
        $review = Review::create([
            'user_id' => $user->id,
            'company_id' => $company->id,
            'service_id' => $service->id ?? null,
            'booking_id' => $booking->id ?? null,
            'order_id' => $order->id ?? null,
            'advertisement_id' => $advertisementId,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'is_visible' => true,
        ]);

        // Уведомление владельцу бизнеса о новом отзыве
        app(\App\Services\BookingService::class)->notifyOwnerAboutNewReview($review);

        // Обновляем средний рейтинг компании (можно сделать через job)
        $this->updateCompanyRating($company->id);
        if ($service) {
            $this->updateServiceRating($service->id);
        }

        // Определяем businessSlug из объявления, если оно найдено
        $businessSlug = $company->slug ?? '';
        $businessName = $company->name;
        if ($advertisementId) {
            $advertisement = Advertisement::find($advertisementId);
            if ($advertisement && $advertisement->link) {
                $businessSlug = str_replace('/marketplace/', '', $advertisement->link);
                $businessSlug = ltrim($businessSlug, '/');
                $businessName = $advertisement->title ?? $businessName;
            }
        }

        return response()->json([
            'message' => 'Review created successfully',
            'data' => [
                'id' => $review->id,
                'orderId' => $review->order_id,
                'bookingId' => $review->booking_id,
                'businessName' => $businessName,
                'businessSlug' => $businessSlug,
                'serviceName' => $service->name ?? 'N/A',
                'rating' => $review->rating,
                'comment' => $review->comment,
                'createdAt' => $review->created_at->toISOString(),
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

