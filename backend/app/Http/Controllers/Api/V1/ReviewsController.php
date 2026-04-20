<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\PaginatesV1;
use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewsController extends Controller
{
    use PaginatesV1;

    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        [$page, $perPage] = $this->v1Pagination($request);

        $q = Review::where('company_id', $companyId)
            ->where('is_visible', true)
            ->with(['user.profile', 'service', 'booking.specialist', 'order.booking.specialist']);

        if ($request->filled('service_id')) {
            $q->where('service_id', $request->integer('service_id'));
        }

        if ($request->filled('rating')) {
            $q->where('rating', $request->integer('rating'));
        }

        $createdFrom = $request->get('created_from');
        $createdTo = $request->get('created_to');
        if ($createdFrom) {
            $q->where('created_at', '>=', $createdFrom);
        }
        if ($createdTo) {
            $q->where('created_at', '<=', $createdTo);
        }

        $total = (clone $q)->count();
        $rows = $q->orderByDesc('created_at')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $data = $rows->map(fn (Review $r) => $this->serialize($r));

        return response()->json([
            'data' => $data,
            'meta' => $this->v1Meta($total, $page, $perPage),
        ]);
    }

    private function serialize(Review $review): array
    {
        $profile = $review->user?->profile;
        $clientName = null;
        if ($profile) {
            $clientName = trim((string) ($profile->first_name ?? '').' '.(string) ($profile->last_name ?? ''));
        }
        if ($clientName === '' && $review->user) {
            $clientName = $review->user->email;
        }
        if ($clientName === '' || $clientName === null) {
            $clientName = $review->booking?->client_name
                ?? $review->order?->booking?->client_name
                ?? null;
        }

        $specialist = $review->booking?->specialist ?? $review->order?->booking?->specialist;

        return [
            'id' => $review->id,
            'rating' => (float) $review->rating,
            'comment' => $review->comment,
            'response' => $review->response,
            'response_at' => $review->response_at?->toIso8601String(),
            'created_at' => $review->created_at?->toIso8601String(),
            'service' => $review->service ? [
                'id' => $review->service->id,
                'name' => $review->service->name,
            ] : null,
            'booking_id' => $review->booking_id,
            'client_display_name' => $clientName,
            'specialist' => $specialist ? [
                'id' => $specialist->id,
                'name' => $specialist->name,
            ] : null,
        ];
    }
}
