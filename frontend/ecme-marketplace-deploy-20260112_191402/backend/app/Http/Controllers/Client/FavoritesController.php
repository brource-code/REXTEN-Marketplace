<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Service;
use App\Models\Company;
use App\Models\Advertisement;
use App\Models\Review;
use Illuminate\Http\Request;

class FavoritesController extends Controller
{
    /**
     * Get favorite services.
     */
    public function services()
    {
        $user = auth('api')->user();

        $favorites = Favorite::where('user_id', $user->id)
            ->where('favoriteable_type', 'service')
            ->get();

        $data = $favorites->map(function ($favorite) {
            // Manually load the service since morphTo doesn't work with string types
            $service = Service::with(['company', 'category'])->find($favorite->favoriteable_id);
            
            if (!$service) {
                // Если услуга не найдена, пропускаем её
                \Log::warning('Favorite service not found', [
                    'favorite_id' => $favorite->id,
                    'favoriteable_id' => $favorite->favoriteable_id,
                    'user_id' => $favorite->user_id,
                ]);
                return null;
            }
            
            // Форматируем цену
            $priceLabel = '';
            if ($service->price) {
                $priceLabel = '₽' . number_format($service->price, 0, '.', ' ');
            }
            
            // Вычисляем рейтинг из отзывов для этой услуги
            $serviceReviews = $service->reviews()->where('is_visible', true)->get();
            $companyReviews = Review::where('company_id', $service->company_id)
                ->where('is_visible', true)
                ->where(function($q) use ($service) {
                    // Отзывы для этой услуги или без указания услуги (общие отзывы на компанию)
                    $q->where('service_id', $service->id)
                      ->orWhere(function($q2) use ($service) {
                          $q2->whereNull('service_id')
                             ->where('company_id', $service->company_id);
                      });
                })
                ->get();
            
            // Объединяем отзывы, убирая дубликаты
            $allReviews = $serviceReviews->merge($companyReviews)->unique('id');
            
            $rating = $allReviews->count() > 0 
                ? round($allReviews->avg('rating'), 1) 
                : null; // Используем null вместо 0.0, чтобы фронтенд мог скрыть блок
            $reviewsCount = $allReviews->count();
            
            return [
                'id' => $favorite->id,
                'serviceId' => $service->id,
                'serviceName' => $service->name,
                'serviceSlug' => $service->slug ?? $service->company->slug ?? '',
                'businessName' => $service->company->name ?? 'N/A',
                'businessSlug' => $service->company->slug ?? '',
                'price' => (float) $service->price,
                'priceLabel' => $priceLabel,
                'rating' => $rating,
                'reviewsCount' => $reviewsCount,
                'image' => $service->image,
                'description' => $service->description ?? '',
                'category' => $service->category->name ?? '',
                'city' => $service->company->city ?? '',
                'state' => $service->company->state ?? '',
                'addedAt' => $favorite->created_at->toISOString(),
            ];
        })->filter();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get favorite businesses.
     */
    public function businesses()
    {
        $user = auth('api')->user();

        $favorites = Favorite::where('user_id', $user->id)
            ->where('favoriteable_type', 'business')
            ->get();

        $data = $favorites->map(function ($favorite) {
            // Manually load the company since morphTo doesn't work with string types
            $company = Company::find($favorite->favoriteable_id);
            
            if (!$company) {
                return null;
            }
            
            // Вычисляем рейтинг из отзывов для компании
            $companyReviews = Review::where('company_id', $company->id)
                ->where('is_visible', true)
                ->get();
            
            $rating = $companyReviews->count() > 0 
                ? round($companyReviews->avg('rating'), 1) 
                : null; // Используем null вместо 0.0, чтобы фронтенд мог скрыть блок
            $reviewsCount = $companyReviews->count();
            
            return [
                'id' => $favorite->id,
                'businessId' => $company->id,
                'businessName' => $company->name,
                'businessSlug' => $company->slug,
                'category' => $company->category,
                'rating' => $rating,
                'reviewsCount' => $reviewsCount,
                'image' => $company->logo,
                'addedAt' => $favorite->created_at->toISOString(),
            ];
        })->filter();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get favorite advertisements.
     */
    public function advertisements()
    {
        $user = auth('api')->user();

        $favorites = Favorite::where('user_id', $user->id)
            ->where('favoriteable_type', 'advertisement')
            ->get();

        $data = $favorites->map(function ($favorite) {
            // Manually load the advertisement
            $advertisement = Advertisement::with('company')->find($favorite->favoriteable_id);
            
            if (!$advertisement) {
                return null;
            }
            
            // Форматируем цену
            $priceLabel = '';
            if ($advertisement->price_from || $advertisement->price_to) {
                if ($advertisement->price_from && $advertisement->price_to) {
                    $priceLabel = '₽' . number_format($advertisement->price_from, 0, '.', ' ') . ' - ₽' . number_format($advertisement->price_to, 0, '.', ' ');
                } elseif ($advertisement->price_from) {
                    $priceLabel = 'от ₽' . number_format($advertisement->price_from, 0, '.', ' ');
                } elseif ($advertisement->price_to) {
                    $priceLabel = 'до ₽' . number_format($advertisement->price_to, 0, '.', ' ');
                }
            }
            
            // Получаем правильный slug из поля link объявления
            // link может быть в формате: 'cleaning-la2', '/marketplace/cleaning-la2', или полный URL
            $adSlug = '';
            if ($advertisement->link) {
                // Убираем префикс /marketplace/ если есть
                $adSlug = str_replace('/marketplace/', '', $advertisement->link);
                $adSlug = ltrim($adSlug, '/');
                // Убираем ведущий слеш если есть
                $adSlug = trim($adSlug, '/');
                // Если это полный URL, извлекаем только путь
                if (filter_var($adSlug, FILTER_VALIDATE_URL)) {
                    $parsedUrl = parse_url($adSlug);
                    $adSlug = ltrim($parsedUrl['path'] ?? '', '/');
                }
            }
            
            // Если slug не найден, используем fallback формат
            if (empty($adSlug)) {
                $adSlug = 'ad_' . $advertisement->id;
            }
            
            // Вычисляем рейтинг из отзывов для этого объявления
            // Используем advertisement_id для точной привязки
            $adReviews = Review::where('advertisement_id', $advertisement->id)
                ->where('is_visible', true)
                ->get();
            
            $rating = $adReviews->count() > 0 
                ? round($adReviews->avg('rating'), 1) 
                : null; // Используем null вместо 0.0, чтобы фронтенд мог скрыть блок
            $reviewsCount = $adReviews->count();
            
            return [
                'id' => $favorite->id,
                'advertisementId' => $advertisement->id,
                'advertisementName' => $advertisement->title ?? '',
                'title' => $advertisement->title ?? '', // Добавляем также поле title для совместимости
                'name' => $advertisement->title ?? '', // Добавляем также поле name для совместимости
                'advertisementSlug' => $adSlug,
                'slug' => $adSlug, // Добавляем также поле slug для совместимости
                'link' => $advertisement->link, // Добавляем оригинальный link для справки
                'businessName' => $advertisement->company->name ?? 'N/A',
                'businessSlug' => $advertisement->company->slug ?? '',
                'price' => (float) ($advertisement->price_from ?? 0),
                'priceLabel' => $priceLabel,
                'rating' => $rating,
                'reviewsCount' => $reviewsCount,
                'image' => $advertisement->image ?? '/img/others/placeholder.jpg',
                'description' => $advertisement->description ?? '',
                'category' => $advertisement->category_slug ?? '',
                'city' => $advertisement->city ?? $advertisement->company->city ?? '',
                'state' => $advertisement->state ?? $advertisement->company->state ?? '',
                'addedAt' => $favorite->created_at->toISOString(),
            ];
        })->filter();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Add to favorites.
     */
    public function add($type, $id)
    {
        $user = auth('api')->user();

        \Log::info('Adding to favorites', ['type' => $type, 'id' => $id, 'user_id' => $user->id ?? null]);

        if (!in_array($type, ['service', 'business', 'advertisement'])) {
            \Log::warning('Invalid favorite type', ['type' => $type]);
            return response()->json([
                'message' => 'Invalid type: ' . $type,
            ], 400);
        }

        $model = match($type) {
            'service' => Service::class,
            'business' => Company::class,
            'advertisement' => Advertisement::class,
            default => null,
        };
        
        if (!$model) {
            \Log::warning('Model not found for type', ['type' => $type]);
            return response()->json([
                'message' => 'Invalid type',
            ], 400);
        }
        
        try {
            $item = $model::findOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::warning('Item not found', ['type' => $type, 'id' => $id, 'model' => $model]);
            return response()->json([
                'message' => ucfirst($type) . ' not found',
            ], 404);
        }

        // Check if already favorited
        $existing = Favorite::where('user_id', $user->id)
            ->where('favoriteable_type', $type)
            ->where('favoriteable_id', $id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Already in favorites',
            ], 400);
        }

        $favorite = Favorite::create([
            'user_id' => $user->id,
            'favoriteable_type' => $type,
            'favoriteable_id' => $id,
        ]);

        return response()->json([
            'message' => 'Added to favorites',
            'data' => $favorite,
        ], 201);
    }

    /**
     * Remove from favorites.
     */
    public function remove($type, $id)
    {
        $user = auth('api')->user();

        // Проверяем валидность типа
        if (!in_array($type, ['service', 'business', 'advertisement'])) {
            return response()->json([
                'message' => 'Invalid type: ' . $type,
            ], 400);
        }

        $favorite = Favorite::where('user_id', $user->id)
            ->where('favoriteable_type', $type)
            ->where('favoriteable_id', $id)
            ->first();

        // Если избранное не найдено, считаем это успехом (уже удалено)
        if (!$favorite) {
            return response()->json([
                'message' => 'Already removed from favorites',
            ], 200);
        }

        $favorite->delete();

        return response()->json([
            'message' => 'Removed from favorites',
        ]);
    }
}

