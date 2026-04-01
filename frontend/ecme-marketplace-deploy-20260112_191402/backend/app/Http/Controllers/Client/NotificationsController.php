<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    /**
     * Get client notifications.
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
     * Get notification settings.
     */
    public function getSettings()
    {
        $user = auth('api')->user();
        $profile = $user->profile;

        // Если профиля нет, возвращаем настройки по умолчанию
        if (!$profile) {
            $settings = [
                'email' => true,
                'sms' => false,
                'telegram' => false,
                'push' => true,
            ];

            return response()->json([
                'success' => true,
                'data' => $settings,
                'message' => 'Настройки уведомлений получены',
            ]);
        }

        // Если настройки не установлены, используем значения по умолчанию
        $settings = [
            'email' => $profile->notification_email ?? true,
            'sms' => $profile->notification_sms ?? false,
            'telegram' => $profile->notification_telegram ?? false,
            'push' => $profile->notification_push ?? true,
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
            'message' => 'Настройки уведомлений получены',
        ]);
    }

    /**
     * Update notification settings.
     */
    public function updateSettings(Request $request)
    {
        $user = auth('api')->user();
        $profile = $user->profile;

        // Если профиля нет, возвращаем ошибку (профиль должен быть создан при регистрации)
        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Профиль пользователя не найден',
            ], 404);
        }

        // Обновляем настройки
        $profile->update([
            'notification_email' => $request->input('email', $profile->notification_email ?? true),
            'notification_sms' => $request->input('sms', $profile->notification_sms ?? false),
            'notification_telegram' => $request->input('telegram', $profile->notification_telegram ?? false),
            'notification_push' => $request->input('push', $profile->notification_push ?? true),
        ]);

        $settings = [
            'email' => (bool) $profile->notification_email,
            'sms' => (bool) $profile->notification_sms,
            'telegram' => (bool) $profile->notification_telegram,
            'push' => (bool) $profile->notification_push,
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
            'message' => 'Настройки уведомлений обновлены',
        ]);
    }
}

