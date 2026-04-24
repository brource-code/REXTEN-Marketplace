<?php

namespace App\Http\Controllers\Api\Zapier;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Service;
use App\Services\BookingService;
use App\Services\Zapier\ZapierClientResolver;
use App\Support\MarketplaceClient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingsController extends Controller
{
    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        $tz = (string) $request->get('current_company_timezone');

        $validated = $request->validate([
            'since_id' => 'sometimes|integer|min:0',
            'since_created_at' => 'sometimes|date',
            'limit' => 'sometimes|integer|min:1|max:'.(int) config('api.zapier.max_limit', 100),
        ]);

        $limit = (int) ($validated['limit'] ?? 50);
        $limit = min($limit, (int) config('api.zapier.max_limit', 100));

        $query = Booking::query()
            ->where('company_id', $companyId)
            ->withoutPendingPayment()
            ->with(['service', 'user.profile']);

        if (! empty($validated['since_id'])) {
            $query->where('id', '>', (int) $validated['since_id']);
        }

        if (! empty($validated['since_created_at'])) {
            $query->where('created_at', '>', $validated['since_created_at']);
        }

        $bookings = $query
            ->orderBy('id', 'asc')
            ->limit($limit)
            ->get();

        $out = $bookings->map(fn (Booking $b) => $this->serializeBooking($b, $tz));

        return response()->json($out->values()->all());
    }

    public function store(Request $request, BookingService $bookingService)
    {
        $companyId = (int) $request->get('current_company_id');
        $tz = (string) $request->get('current_company_timezone');

        $validated = $request->validate([
            'client_id' => 'nullable|integer',
            'client_email' => 'nullable|email|max:255',
            'client_phone' => 'nullable|string|max:40',
            'service_id' => 'required|integer|exists:services,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'note' => 'nullable|string|max:1000',
            'status' => ['nullable', 'string', Rule::in(['new', 'pending', 'confirmed', 'completed', 'cancelled'])],
        ]);

        if (empty($validated['client_id']) && empty($validated['client_email']) && empty($validated['client_phone'])) {
            return response()->json([
                'error' => 'client_required',
                'message' => 'Provide client_id, client_email, or client_phone.',
            ], 422);
        }

        $service = Service::query()
            ->where('company_id', $companyId)
            ->where('id', (int) $validated['service_id'])
            ->where('is_active', true)
            ->first();
        if (! $service) {
            return response()->json([
                'error' => 'service_not_found',
                'message' => 'Service not found or inactive for this company.',
            ], 422);
        }

        $start = Carbon::parse($validated['start_time'])->timezone($tz);
        $end = Carbon::parse($validated['end_time'])->timezone($tz);
        $durationMinutes = (int) max(15, $end->diffInMinutes($start));

        $resolved = ZapierClientResolver::findClientInCompany(
            $companyId,
            $validated['client_id'] ? (int) $validated['client_id'] : null,
            $validated['client_email'] ?? null,
            $validated['client_phone'] ?? null
        );
        if ($resolved === null) {
            return response()->json([
                'error' => 'client_not_found',
                'message' => 'Client not found in this company. Create the client first or check email/phone.',
            ], 422);
        }
        /** @var \App\Models\User $clientUser */
        [$clientUserId, $clientUser] = $resolved;
        if (! MarketplaceClient::isClientUserId((int) $clientUserId)) {
            return response()->json([
                'error' => 'client_invalid',
                'message' => 'Resolved user is not a client account.',
            ], 422);
        }

        $clientName = $clientUser->profile
            ? trim(($clientUser->profile->first_name ?? '').' '.($clientUser->profile->last_name ?? ''))
            : null;
        if ($clientName === null || $clientName === '') {
            $clientName = $this->clientDisplayNameFallback($clientUser);
        }

        $clientEmailOut = $clientUser->email;
        if (str_contains((string) $clientEmailOut, '@local.local')) {
            $clientEmailOut = $validated['client_email'] ?? $clientUser->profile?->notification_email ?? null;
        }

        $data = [
            'company_id' => $companyId,
            'user_id' => (int) $clientUserId,
            'service_id' => (int) $service->id,
            'event_type' => 'booking',
            'specialist_id' => null,
            'booking_date' => $start->format('Y-m-d'),
            'booking_time' => $start->format('H:i'),
            'duration_minutes' => $durationMinutes,
            'price' => (float) $service->price,
            'status' => $validated['status'] ?? 'new',
            'notes' => $validated['note'] ?? null,
            'client_name' => $clientName,
            'client_email' => $this->stringOrNull($clientEmailOut),
            'client_phone' => $this->stringOrNull($clientUser->profile?->phone),
        ];

        try {
            $booking = $bookingService->createBooking($data);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'validation_error',
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'уже занято') || str_contains($msg, 'уже занят')) {
                return response()->json([
                    'error' => 'slot_occupied',
                    'message' => 'This time slot is not available.',
                ], 400);
            }

            return response()->json([
                'error' => 'create_failed',
                'message' => 'Could not create booking.',
            ], 500);
        }

        $booking->load(['service', 'user.profile']);
        $bookingService->notifyOwnerAboutNewBooking($booking->fresh());

        return response()->json(
            $this->serializeBooking($booking->fresh(['service', 'user.profile']), $tz),
            201
        );
    }

    private function serializeBooking(Booking $booking, string $tz): array
    {
        $dateStr = $booking->booking_date
            ? $booking->booking_date->format('Y-m-d')
            : null;
        $timeStr = (string) $booking->booking_time;
        if (strlen($timeStr) === 8) {
            $timeStr = substr($timeStr, 0, 5);
        }

        $startIso = null;
        $endIso = null;
        if ($dateStr) {
            $t = $timeStr;
            if (strlen($t) === 5) {
                $t .= ':00';
            }
            $startLocal = Carbon::parse($dateStr.' '.$t, $tz);
            $endLocal = $startLocal->copy()->addMinutes((int) ($booking->duration_minutes ?? 60));
            $startIso = $startLocal->utc()->toIso8601String();
            $endIso = $endLocal->utc()->toIso8601String();
        }

        $clientName = $booking->businessClientDisplayName();
        $clientEmail = $booking->user?->email ?? $booking->client_email;
        if ($clientEmail && str_contains((string) $clientEmail, '@local.local')) {
            $clientEmail = $booking->client_email;
        }
        if ($clientEmail && str_contains((string) $clientEmail, '@local.local')) {
            $clientEmail = null;
        }

        $serviceName = $booking->relationLoaded('service') && $booking->service
            ? (string) $booking->service->name
            : (string) $booking->businessServiceDisplayName();

        return [
            'id' => $booking->id,
            'created_at' => $booking->created_at?->utc()->toIso8601String(),
            'client_name' => $clientName,
            'client_email' => $this->stringOrNull($clientEmail),
            'service_name' => $serviceName,
            'start_time' => $startIso,
            'end_time' => $endIso,
            'status' => $booking->status,
        ];
    }

    private function clientDisplayNameFallback(\App\Models\User $u): string
    {
        $e = $u->email;
        if ($e && ! str_contains($e, '@local.local')) {
            return (string) $e;
        }

        return 'Client';
    }

    private function stringOrNull(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}
