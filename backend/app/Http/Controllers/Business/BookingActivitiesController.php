<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingActivity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BookingActivitiesController extends Controller
{
    private static function actorDisplayName(?User $user): ?string
    {
        if (! $user) {
            return null;
        }
        $p = $user->profile;
        if ($p) {
            $n = trim(($p->first_name ?? '').' '.($p->last_name ?? ''));
            if ($n !== '') {
                return $n;
            }
        }

        return $user->email;
    }

    /**
     * Список событий по бронированию (последние 100, новые сверху).
     */
    public function index(Request $request, $bookingId)
    {
        $companyId = $request->get('current_company_id');

        if (! $companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $booking = Booking::where('company_id', $companyId)->find($bookingId);
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found',
            ], 404);
        }

        $items = BookingActivity::where('booking_id', $booking->id)
            ->with(['actor:id,email', 'actor.profile:user_id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get()
            ->map(function (BookingActivity $a) {
                return [
                    'id' => $a->id,
                    'type' => $a->type,
                    'payload' => $a->payload,
                    'actor' => $a->actor ? [
                        'id' => $a->actor->id,
                        'name' => self::actorDisplayName($a->actor),
                    ] : null,
                    'created_at' => optional($a->created_at)->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Добавить комментарий к бронированию.
     */
    public function store(Request $request, $bookingId)
    {
        $companyId = $request->get('current_company_id');

        if (! $companyId) {
            return response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404);
        }

        $booking = Booking::where('company_id', $companyId)->find($bookingId);
        if (! $booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:comment',
            'payload' => 'required|array',
            'payload.text' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $activity = BookingActivity::create([
            'booking_id' => $booking->id,
            'actor_id' => Auth::id(),
            'type' => BookingActivity::TYPE_COMMENT,
            'payload' => [
                'text' => trim((string) $request->input('payload.text')),
            ],
        ]);

        $activity->load(['actor:id,email', 'actor.profile:user_id,first_name,last_name']);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $activity->id,
                'type' => $activity->type,
                'payload' => $activity->payload,
                'actor' => $activity->actor ? [
                    'id' => $activity->actor->id,
                    'name' => self::actorDisplayName($activity->actor),
                ] : null,
                'created_at' => optional($activity->created_at)->toIso8601String(),
            ],
        ], 201);
    }
}
