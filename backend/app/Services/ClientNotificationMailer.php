<?php

namespace App\Services;

use App\Models\User;
use App\Support\PasswordResetMailLocale;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Email клиенту маркетплейса — тот же шаблон, что у бизнеса (mail.rexten.client-notification).
 */
class ClientNotificationMailer
{
    /**
     * Письмо о смене статуса бронирования, если в профиле включены email-уведомления.
     */
    public static function bookingStatusIfEnabled(
        ?int $userId,
        string $subjectLine,
        string $bodyText,
        string $actionPath = '/booking'
    ): void {
        if (! $userId) {
            return;
        }

        $user = User::query()->with('profile')->find($userId);
        if (! $user || ! $user->email) {
            return;
        }

        $profile = $user->profile;
        $emailOn = $profile ? (bool) ($profile->notification_email ?? true) : true;
        if (! $emailOn) {
            return;
        }

        $mailLang = PasswordResetMailLocale::toMailLang($user->locale ?? 'en') ?? 'en';
        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionUrl = $base === '' ? $actionPath : $base.$actionPath;
        $appName = (string) config('app.name');

        try {
            Mail::send(
                ['html' => 'mail.rexten.client-notification', 'text' => 'mail.rexten.client-notification-text'],
                [
                    'appName' => $appName,
                    'locale' => $mailLang,
                    'emailTitle' => $subjectLine,
                    'intro' => $bodyText,
                    'actionUrl' => $actionUrl,
                ],
                function ($message) use ($user, $subjectLine) {
                    $message->to($user->email)->subject($subjectLine);
                }
            );
        } catch (\Throwable $e) {
            Log::error('ClientNotificationMailer: failed to send email', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
