<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Reviews Controller для суперадминки
 */
class ReviewsController extends Controller
{
    /**
     * Получить список отзывов (для таблицы суперадмина)
     */
    public function index(Request $request)
    {
        $page = max(1, (int) $request->input('page', 1));
        $pageSize = min(100, max(5, (int) $request->input('pageSize', 10)));

        $companyId = $request->input('company_id');
        $status = $request->input('status', 'all'); // published | pending | rejected | all
        $minRating = $request->input('min_rating');

        $query = Review::query()
            ->with([
                'company',
                'user.profile',
                'service',
                'booking',
                'booking.service',
                'booking.advertisement',
                'booking.specialist',
                'order.booking',
                'order.booking.service',
                'order.booking.advertisement',
                'order.booking.specialist',
                'advertisement',
            ]);

        if ($companyId !== null && $companyId !== '') {
            $query->where('company_id', (int) $companyId);
        }

        if ($status && $status !== 'all') {
            // В текущей модели есть только is_visible, поэтому rejected = pending
            if ($status === 'published') {
                $query->where('is_visible', true);
            } elseif ($status === 'pending' || $status === 'rejected') {
                $query->where('is_visible', false);
            }
        }

        if ($minRating !== null && $minRating !== '') {
            $query->where('rating', '>=', (int) $minRating);
        }

        $total = (clone $query)->count();

        $rows = $query
            ->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        $data = $rows->map(fn (Review $review) => $this->formatReviewRow($review));

        return response()->json([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * KPI-статистика по отзывам
     */
    public function stats(Request $request)
    {
        $totalReviews = Review::count();
        $publishedReviews = Review::where('is_visible', true)->count();
        $pendingReviews = $totalReviews - $publishedReviews;

        $respondedReviews = Review::whereNotNull('response')
            ->where('response', '!=', '')
            ->count();
        $withoutResponseReviews = $totalReviews - $respondedReviews;

        $avgRating = Review::where('is_visible', true)->avg('rating');
        $avgRatingOut = $avgRating !== null ? round((float) $avgRating, 2) : 0;

        $now = now();
        $thisMonthStart = $now->copy()->startOfMonth();
        $thisMonthEnd = $now->copy()->endOfDay();

        $lastMonthStart = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonthNoOverflow()->endOfMonth();

        $newReviewsThisMonth = Review::whereBetween('created_at', [$thisMonthStart, $thisMonthEnd])->count();
        $newReviewsLastMonth = Review::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count();

        $growthPct = null;
        if ($newReviewsLastMonth > 0) {
            $growthPct = round((($newReviewsThisMonth - $newReviewsLastMonth) / $newReviewsLastMonth) * 100, 2);
        }

        return response()->json([
            'total_reviews' => $totalReviews,
            'average_rating' => $avgRatingOut,
            'published_reviews' => $publishedReviews,
            'pending_reviews' => $pendingReviews,
            'responded_reviews' => $respondedReviews,
            'without_response_reviews' => $withoutResponseReviews,
            'new_reviews_this_month' => $newReviewsThisMonth,
            'new_reviews_last_month' => $newReviewsLastMonth,
            'new_reviews_growth_pct' => $growthPct,
        ]);
    }

    /**
     * Распределение рейтинга (только опубликованные)
     */
    public function ratingDistribution(Request $request)
    {
        $companyId = $request->input('company_id');

        $base = Review::query()
            ->where('is_visible', true);

        if ($companyId !== null && $companyId !== '') {
            $base->where('company_id', (int) $companyId);
        }

        $total = (clone $base)->count();

        $rows = $base
            ->select('rating', DB::raw('count(*) as cnt'))
            ->groupBy('rating')
            ->get();

        $counts = [];
        for ($i = 1; $i <= 5; $i++) {
            $counts[$i] = 0;
        }
        foreach ($rows as $row) {
            $r = (int) $row->rating;
            if ($r >= 1 && $r <= 5) {
                $counts[$r] = (int) $row->cnt;
            }
        }

        return response()->json([
            'total' => $total,
            'counts' => $counts,
        ]);
    }

    /**
     * Обновить ответ на отзыв
     */
    public function updateResponse(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'response' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $review = Review::findOrFail($id);

        $responseText = $request->input('response');

        $review->update([
            'response' => $responseText,
            'response_at' => $responseText ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ответ на отзыв обновлен',
        ]);
    }

    /**
     * Удалить отзыв
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

    private function formatReviewRow(Review $review): array
    {
        $company = $review->company;
        $companyId = $review->company_id;
        $companyName = $company ? ($company->name ?? "N/A") : null;

        $user = $review->user;
        $profile = $user ? ($user->profile ?? null) : null;

        $userId = $user ? $user->id : null;
        $userAvatar = ($profile && isset($profile->avatar)) ? ($profile->avatar ?? null) : null;

        // Имя клиента
        $userName = 'Аноним';

        if ($user && $profile) {
            $first = $profile->first_name ?? '';
            $last = $profile->last_name ?? '';
            $userName = trim($first . ' ' . $last);
            if (empty($userName)) {
                $userName = $user->email ?? 'Аноним';
            }
        } else {
            $clientName = null;
            if ($review->order && $review->order->booking && $review->order->booking->client_name) {
                $clientName = $review->order->booking->client_name;
            } elseif ($review->booking && $review->booking->client_name) {
                $clientName = $review->booking->client_name;
            }

            if ($clientName) {
                $userName = $clientName . ' (не авторизован)';
            } else {
                $userName = 'Аноним (не авторизован)';
            }
        }

        // Сервис
        $serviceName = $review->service ? ($review->service->name ?? null) : null;
        if (!$serviceName && $review->booking && $review->booking->service) {
            $serviceName = $review->booking->service->name ?? null;
        }
        if (!$serviceName && $review->order && $review->order->booking && $review->order->booking->service) {
            $serviceName = $review->order->booking->service->name ?? null;
        }

        // Специалист
        $specialistName = null;
        if ($review->order && $review->order->booking && $review->order->booking->specialist) {
            $specialistName = $review->order->booking->specialist->name ?? null;
        } elseif ($review->booking && $review->booking->specialist) {
            $specialistName = $review->booking->specialist->name ?? null;
        }

        // Объявление (если нет advertisement_id в старых данных)
        $advertisement = $review->advertisement;
        if (!$advertisement) {
            if ($review->booking && $review->booking->advertisement) {
                $advertisement = $review->booking->advertisement;
            } elseif ($review->order && $review->order->booking && $review->order->booking->advertisement) {
                $advertisement = $review->order->booking->advertisement;
            }
        }

        $advertisementTitle = $advertisement ? ($advertisement->title ?? null) : null;
        $advertisementLink = $advertisement ? ($advertisement->link ?? null) : null;
        $advertisementImage = $advertisement ? ($advertisement->image ?? null) : null;

        $status = $review->is_visible ? 'published' : 'pending';

        return [
            'id' => (int) $review->id,
            'companyId' => $companyId !== null ? (int) $companyId : null,
            'companyName' => $companyName,
            'userId' => $userId !== null ? (int) $userId : null,
            'userName' => $userName,
            'userAvatar' => $userAvatar,
            'rating' => (float) $review->rating,
            'comment' => $review->comment ?? '',
            'serviceName' => $serviceName,
            'specialistName' => $specialistName,
            'advertisementTitle' => $advertisementTitle,
            'advertisementLink' => $advertisementLink,
            'advertisementImage' => $advertisementImage,
            'response' => $review->response ?? null,
            'responseAt' => $review->response_at ? $review->response_at->toISOString() : null,
            'createdAt' => $review->created_at ? $review->created_at->toISOString() : null,
            'status' => $status,
            'isVisible' => (bool) $review->is_visible,
        ];
    }
}
