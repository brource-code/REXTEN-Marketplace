<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    /**
     * Get business user notifications.
     */
    public function index()
    {
        $user = auth('api')->user();

        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $data = $notifications->map(function ($notification) {
            return [
                'id' => $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'read' => (bool) $notification->read,
                'createdAt' => $notification->created_at ? $notification->created_at->toIso8601String() : null,
                'link' => $notification->link,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Уведомления получены',
        ]);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead($id)
    {
        $user = auth('api')->user();

        $notification = Notification::where('user_id', $user->id)
            ->findOrFail($id);

        $notification->update([
            'read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Уведомление помечено как прочитанное',
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead()
    {
        $user = auth('api')->user();

        Notification::where('user_id', $user->id)
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Все уведомления помечены как прочитанные',
        ]);
    }

    /**
     * Delete notification.
     */
    public function destroy($id)
    {
        $user = auth('api')->user();

        $notification = Notification::where('user_id', $user->id)
            ->findOrFail($id);

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Уведомление удалено',
        ]);
    }
}
