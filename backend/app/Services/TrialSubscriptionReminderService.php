<?php

namespace App\Services;

use App\Models\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Напоминания на почту владельцу: триал заканчивается через 3 и через 1 календарный день
 * (подписка без stripe_subscription_id, как в SubscriptionLifecycleService).
 */
class TrialSubscriptionReminderService
{
    public static function sendDueReminders(): int
    {
        $sent = 0;

        $ids = Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNull('stripe_subscription_id')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now())
            ->where(function ($q) {
                $q->whereNull('trial_reminder_3d_sent_at')
                    ->orWhereNull('trial_reminder_1d_sent_at');
            })
            ->pluck('id');

        foreach ($ids as $id) {
            DB::transaction(function () use ($id, &$sent) {
                /** @var Subscription|null $sub */
                $sub = Subscription::query()->whereKey($id)->lockForUpdate()->first();
                if (! $sub || ! $sub->trial_ends_at || $sub->trial_ends_at->isPast()) {
                    return;
                }
                if (filled($sub->stripe_subscription_id)) {
                    return;
                }
                if ($sub->status !== Subscription::STATUS_ACTIVE) {
                    return;
                }

                $daysLeft = self::calendarDaysUntilTrialEnd($sub);

                // Сначала окно «последний день» (<= 1 календарный день), иначе при daysLeft === 1
                // сработала бы только ветка «3d» (<= 3) и ушло бы неверное письмо / return без «1d».
                if ($daysLeft <= 1 && $sub->trial_reminder_1d_sent_at === null) {
                    if (SubscriptionMailer::notifyTrialReminder($sub, '1d')) {
                        $sub->trial_reminder_1d_sent_at = now();
                        $sub->save();
                        $sent++;
                    }

                    return;
                }

                if ($daysLeft <= 3 && $sub->trial_reminder_3d_sent_at === null) {
                    if (SubscriptionMailer::notifyTrialReminder($sub, '3d')) {
                        $sub->trial_reminder_3d_sent_at = now();
                        $sub->save();
                        $sent++;
                    }
                }
            });
        }

        if ($sent > 0) {
            Log::info('TrialSubscriptionReminderService: reminders sent', ['count' => $sent]);
        }

        return $sent;
    }

    /**
     * Полных календарных дней от начала сегодняшнего дня до начала дня окончания триала.
     */
    public static function calendarDaysUntilTrialEnd(Subscription $sub): int
    {
        $trialEnd = $sub->trial_ends_at;
        if (! $trialEnd) {
            return -1;
        }

        $today = now()->copy()->startOfDay();
        $endDay = $trialEnd->copy()->startOfDay();

        return (int) $today->diffInDays($endDay, false);
    }
}
