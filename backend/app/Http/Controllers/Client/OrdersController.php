<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrdersController extends Controller
{
    /**
     * Get client orders.
     */
    public function index(Request $request)
    {
        $user = auth('api')->user();

        $query = Order::where('user_id', $user->id)
            ->with(['booking.service', 'company']);

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by date
        if ($request->has('dateFrom')) {
            $query->whereDate('created_at', '>=', $request->dateFrom);
        }

        if ($request->has('dateTo')) {
            $query->whereDate('created_at', '<=', $request->dateTo);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        $data = $orders->map(function ($order) {
            return [
                'id' => $order->id,
                'bookingId' => $order->booking_id,
                'serviceName' => $order->booking->service->name ?? 'N/A',
                'businessName' => $order->company->name ?? 'N/A',
                'timezone' => $order->company?->timezone ?? 'America/Los_Angeles',
                'date' => $order->created_at->format('Y-m-d'),
                'time' => $order->created_at->format('H:i'),
                'status' => $order->status,
                'price' => (float) $order->total,
                'createdAt' => $order->created_at->toISOString(),
            ];
        });

        return response()->json($data);
    }
}

