<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\PaginatesV1;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class BookingsController extends Controller
{
    use PaginatesV1;

    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        [$page, $perPage] = $this->v1Pagination($request);

        $query = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->with(['service', 'user.profile', 'specialist', 'location']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $dateFrom = $request->get('from', $request->get('date_from'));
        $dateTo = $request->get('to', $request->get('date_to'));
        if ($dateFrom) {
            $query->where('booking_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->where('booking_date', '<=', $dateTo);
        }

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->get('service_id'));
        }

        if ($request->filled('specialist_id')) {
            $query->where('specialist_id', $request->get('specialist_id'));
        }

        $total = (clone $query)->count();
        $bookings = $query->orderBy('booking_date', 'desc')
            ->orderBy('booking_time', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $data = $bookings->map(fn (Booking $booking) => $this->serializeBookingList($booking));

        return response()->json([
            'data' => $data,
            'meta' => $this->v1Meta($total, $page, $perPage),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $companyId = (int) $request->get('current_company_id');

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

        return response()->json([
            'data' => $this->serializeBookingDetail($booking),
        ]);
    }

    private function serializeBookingList(Booking $booking): array
    {
        $result = [
            'id' => $booking->id,
            'service' => [
                'id' => $booking->service->id ?? null,
                'name' => $booking->service->name ?? 'N/A',
            ],
            'client' => [
                'id' => $booking->user->id ?? null,
                'name' => $booking->user->name ?? $booking->user->profile->full_name ?? 'Guest',
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
            'duration_minutes' => (int) ($booking->duration_minutes ?? 60),
            'price' => (float) $booking->price,
            'status' => $booking->status,
            'notes' => $booking->notes,
            'client_notes' => $booking->client_notes,
            'created_at' => $booking->created_at?->toIso8601String(),
        ];

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
    }

    private function serializeBookingDetail(Booking $booking): array
    {
        $base = $this->serializeBookingList($booking);
        $base['total_price'] = (float) ($booking->total_price ?? $booking->price ?? 0);
        $base['discount_tier'] = $booking->discountTier ? ['id' => $booking->discountTier->id, 'name' => $booking->discountTier->name ?? null] : null;
        $base['promo_code'] = $booking->promoCode ? ['code' => $booking->promoCode->code ?? null] : null;
        $base['additional_services'] = $booking->additionalServices->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name ?? null,
            'price' => (float) ($s->pivot->price ?? 0),
        ])->values()->all();

        return $base;
    }
}
