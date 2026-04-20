<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\PaginatesV1;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    use PaginatesV1;

    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        [$page, $perPage] = $this->v1Pagination($request);

        $query = Booking::where('company_id', $companyId)
            ->whereNotNull('booking_date')
            ->whereNotNull('booking_time')
            ->withoutPendingPayment()
            ->with(['service', 'user.profile', 'specialist']);

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
        $bookings = $query->orderBy('booking_date')
            ->orderBy('booking_time')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $data = $bookings->map(function (Booking $booking) {
            [$start, $end] = $this->bookingWindow($booking);

            $title = $booking->title;
            if (! $title) {
                $client = $booking->client_name
                    ?? ($booking->user?->profile
                        ? trim(($booking->user->profile->first_name ?? '').' '.($booking->user->profile->last_name ?? ''))
                        : null)
                    ?? 'Client';
                $svc = $booking->service?->name ?? 'Service';
                $title = $client.' — '.$svc;
            }

            return [
                'id' => $booking->id,
                'title' => $title,
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
                'status' => $booking->status,
                'service_id' => $booking->service_id,
                'specialist_id' => $booking->specialist_id,
                'booking_date' => $booking->booking_date?->format('Y-m-d'),
                'booking_time' => $booking->booking_time,
                'duration_minutes' => (int) ($booking->duration_minutes ?? 60),
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => $this->v1Meta($total, $page, $perPage),
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function bookingWindow(Booking $booking): array
    {
        $raw = $booking->booking_date ?? now();
        if ($raw instanceof Carbon) {
            $day = Carbon::create(
                $raw->year,
                $raw->month,
                $raw->day,
                0,
                0,
                0,
                $raw->getTimezone()->getName()
            );
        } else {
            $day = Carbon::parse($raw)->startOfDay();
        }

        $time = $booking->booking_time ?? '00:00:00';
        if (strlen((string) $time) === 5) {
            $time .= ':00';
        }
        $start = $day->copy()->setTimeFromTimeString((string) $time);
        $duration = (int) ($booking->duration_minutes ?? 60);
        $duration = $duration > 0 ? $duration : 60;
        $end = $start->copy()->addMinutes($duration);

        return [$start, $end];
    }
}
