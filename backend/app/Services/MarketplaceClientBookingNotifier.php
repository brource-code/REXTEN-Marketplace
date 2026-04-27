<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Support\MarketplaceClient;
use Illuminate\Support\Facades\Log;

/**
 * Клиент маркетплейса: in-app (колокольчик, если включён push в профиле), email и Telegram по настройкам профиля.
 */
final class MarketplaceClientBookingNotifier
{
    public static function notify(
        int $userId,
        ?int $companyId,
        string $type,
        string $title,
        string $message,
        string $link = '/booking'
    ): void {
        if (! MarketplaceClient::isClientUserId($userId)) {
            return;
        }

        $user = User::query()->with('profile')->find($userId);
        if (! $user) {
            return;
        }

        $profile = $user->profile;
        $pushOn = $profile ? (bool) ($profile->notification_push ?? true) : true;

        if ($pushOn) {
            try {
                Notification::create([
                    'user_id' => $userId,
                    'company_id' => $companyId,
                    'type' => $type,
                    'title' => $title,
                    'message' => $message,
                    'link' => $link,
                    'read' => false,
                ]);
            } catch (\Throwable $e) {
                Log::warning('MarketplaceClientBookingNotifier: in-app notification failed', [
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        ClientNotificationMailer::bookingStatusIfEnabled($userId, $title, $message, $link);
        TelegramClientNotifier::notifyIfEnabled($user, $title, $message, $link);
    }
}
