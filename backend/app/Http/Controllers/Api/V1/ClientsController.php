<?php

namespace App\Http\Controllers\Api\V1;

use App\Helpers\DatabaseHelper;
use App\Http\Controllers\Api\V1\Concerns\PaginatesV1;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientsController extends Controller
{
    use PaginatesV1;

    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        [$page, $perPage] = $this->v1Pagination($request);

        $clientIdsFromTable = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->pluck('user_id');

        $clientIdsFromBookings = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        $clientIds = $clientIdsFromTable->merge($clientIdsFromBookings)->unique();

        $query = User::whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->with('profile');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where(function ($emailQuery) use ($search) {
                    DatabaseHelper::whereLike($emailQuery, 'email', "%{$search}%");
                    $emailQuery->whereRaw("email NOT LIKE '%@local.local'");
                })
                    ->orWhereHas('profile', function ($profileQuery) use ($search) {
                        DatabaseHelper::whereLike($profileQuery, 'first_name', "%{$search}%");
                        DatabaseHelper::whereLike($profileQuery, 'last_name', "%{$search}%", 'or');
                        DatabaseHelper::whereLike($profileQuery, 'phone', "%{$search}%", 'or');
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('client_status', $request->get('status'));
        }

        if ($request->filled('created_from')) {
            $query->where('created_at', '>=', $request->get('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->where('created_at', '<=', $request->get('created_to'));
        }

        $total = (clone $query)->count();
        $clients = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        $data = $clients->map(function (User $client) use ($companyId) {
            $totalBookings = Booking::where('company_id', $companyId)
                ->withoutPendingPayment()
                ->where('user_id', $client->id)
                ->count();

            $totalSpentFromBookings = Booking::where('company_id', $companyId)
                ->withoutPendingPayment()
                ->where('user_id', $client->id)
                ->where('status', 'completed')
                ->get()
                ->sum(fn ($b) => (float) ($b->total_price ?? $b->price ?? 0));

            $totalSpentFromOrders = Order::where('company_id', $companyId)
                ->where('user_id', $client->id)
                ->where('payment_status', 'paid')
                ->sum('total');

            $lastVisitBooking = Booking::where('company_id', $companyId)
                ->withoutPendingPayment()
                ->where('user_id', $client->id)
                ->latest('created_at')
                ->first();

            return [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name.' '.($client->profile->last_name ?? '')) : 'N/A',
                'email' => str_contains((string) ($client->email ?? ''), '@local.local') ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'status' => $client->client_status ?? 'regular',
                'total_bookings' => $totalBookings,
                'total_spent' => (float) $totalSpentFromBookings + (float) $totalSpentFromOrders,
                'last_visit_at' => $lastVisitBooking?->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => $this->v1Meta($total, $page, $perPage),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $companyId = (int) $request->get('current_company_id');

        if (! $this->clientBelongsToCompany($companyId, $id)) {
            return response()->json([
                'error' => 'not_found',
                'message' => 'Client not found.',
            ], 404);
        }

        $client = User::with('profile')->findOrFail($id);

        $totalBookings = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->where('user_id', $client->id)
            ->count();

        $totalSpentFromBookings = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->where('user_id', $client->id)
            ->where('status', 'completed')
            ->get()
            ->sum(fn ($b) => (float) ($b->total_price ?? $b->price ?? 0));

        $totalSpentFromOrders = Order::where('company_id', $companyId)
            ->where('user_id', $client->id)
            ->where('payment_status', 'paid')
            ->sum('total');

        $lastVisitBooking = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->where('user_id', $client->id)
            ->latest('created_at')
            ->first();

        return response()->json([
            'data' => [
                'id' => $client->id,
                'name' => $client->profile ? trim($client->profile->first_name.' '.($client->profile->last_name ?? '')) : 'N/A',
                'email' => str_contains((string) ($client->email ?? ''), '@local.local') ? null : ($client->email ?? null),
                'phone' => $client->profile->phone ?? null,
                'address' => $client->profile->address ?? null,
                'city' => $client->profile->city ?? null,
                'state' => $client->profile->state ?? null,
                'zip_code' => $client->profile->zip_code ?? null,
                'status' => $client->client_status ?? 'regular',
                'total_bookings' => $totalBookings,
                'total_spent' => (float) $totalSpentFromBookings + (float) $totalSpentFromOrders,
                'last_visit_at' => $lastVisitBooking?->created_at?->toIso8601String(),
            ],
        ]);
    }

    private function clientBelongsToCompany(int $companyId, int $userId): bool
    {
        $inPivot = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->exists();

        if ($inPivot) {
            return true;
        }

        return Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
            ->where('user_id', $userId)
            ->exists();
    }
}
