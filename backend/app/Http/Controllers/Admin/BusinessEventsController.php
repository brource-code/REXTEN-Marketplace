<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BusinessEvent;
use Illuminate\Http\Request;

class BusinessEventsController extends Controller
{
    /**
     * Get list of business events with pagination and filters.
     * 
     * GET /admin/business-events
     */
    public function index(Request $request)
    {
        $query = BusinessEvent::with(['company', 'user.profile']);

        // Filter by type
        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        // Filter by company
        if ($request->has('company_id') && $request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 20);
        $skip = ($page - 1) * $pageSize;

        $events = $query->orderBy('created_at', 'desc')
            ->skip($skip)
            ->take($pageSize)
            ->get();

        $data = $events->map(function ($event) {
            return [
                'id' => $event->id,
                'type' => $event->type,
                'title' => $event->title,
                'description' => $event->description,
                'company' => $event->company ? [
                    'id' => $event->company->id,
                    'name' => $event->company->name,
                ] : null,
                'user' => $event->user ? [
                    'id' => $event->user->id,
                    'name' => $event->user->profile 
                        ? ($event->user->profile->first_name . ' ' . $event->user->profile->last_name)
                        : $event->user->email,
                ] : null,
                'amount' => $event->amount,
                'metadata' => $event->metadata,
                'created_at' => $event->created_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }

    /**
     * Get business event details by ID.
     * 
     * GET /admin/business-events/{id}
     */
    public function show($id)
    {
        $event = BusinessEvent::with(['company', 'user.profile'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $event->id,
                'type' => $event->type,
                'title' => $event->title,
                'description' => $event->description,
                'company' => $event->company ? [
                    'id' => $event->company->id,
                    'name' => $event->company->name,
                    'email' => $event->company->email,
                ] : null,
                'user' => $event->user ? [
                    'id' => $event->user->id,
                    'name' => $event->user->profile 
                        ? ($event->user->profile->first_name . ' ' . $event->user->profile->last_name)
                        : $event->user->email,
                    'email' => $event->user->email,
                ] : null,
                'amount' => $event->amount,
                'metadata' => $event->metadata,
                'created_at' => $event->created_at->toISOString(),
            ],
        ]);
    }
}
