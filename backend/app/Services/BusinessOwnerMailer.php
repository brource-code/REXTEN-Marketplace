<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;
use App\Support\PasswordResetMailLocale;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Письма владельцу бизнеса — тот же визуальный шаблон, что и сброс пароля (mail.rexten.*).
 */
class BusinessOwnerMailer
{
    public static function notifyIfEnabled(
        Company $company,
        int $ownerId,
        string $event,
        string $subjectLine,
        string $bodyText,
        string $actionPath = '/business/schedule'
    ): void {
        if (! BusinessOwnerNotificationPreferences::allowsOwnerEmailNotification($company, $event)) {
            return;
        }

        $owner = User::find($ownerId);
        if (! $owner || ! $owner->email) {
            return;
        }

        $mailLang = PasswordResetMailLocale::toMailLang($owner->locale ?? 'en') ?? 'en';
        $base = rtrim((string) config('app.frontend_url'), '/');
        $actionUrl = $base === '' ? $actionPath : $base.$actionPath;
        $appName = (string) config('app.name');

        try {
            Mail::send(
                ['html' => 'mail.rexten.business-notification', 'text' => 'mail.rexten.business-notification-text'],
                [
                    'appName' => $appName,
                    'locale' => $mailLang,
                    'emailTitle' => $subjectLine,
                    'intro' => $bodyText,
                    'actionUrl' => $actionUrl,
                ],
                function ($message) use ($owner, $subjectLine) {
                    $message->to($owner->email)->subject($subjectLine);
                }
            );
        } catch (\Throwable $e) {
            Log::error('BusinessOwnerMailer: failed to send email', [
                'company_id' => $company->id,
                'owner_id' => $ownerId,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
