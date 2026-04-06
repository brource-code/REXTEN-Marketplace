<?php

namespace App\Services;

use App\Models\Company;

/**
 * Настройки уведомлений владельца бизнеса (хранятся в companies).
 * In-app — колокольчик (notifications); письма — при включённом «Email» и соответствующей категории.
 */
class BusinessOwnerNotificationPreferences
{
    public const EVENT_NEW_BOOKING = 'new_booking';

    public const EVENT_BOOKING_CANCELLED = 'booking_cancelled';

    public const EVENT_REVIEW = 'review';

    public const EVENT_PAYMENT = 'payment';

    /**
     * In-app уведомление: только категории (новые брони, отмены, отзывы, платежи).
     */
    public static function allowsOwnerInAppNotification(Company $company, string $event): bool
    {
        return self::allowsOwnerCategory($company, $event);
    }

    /**
     * Письмо на email владельца: мастер «Email» + та же категория.
     */
    public static function allowsOwnerEmailNotification(Company $company, string $event): bool
    {
        if (! self::boolVal($company->notification_email_enabled ?? true, true)) {
            return false;
        }

        return self::allowsOwnerCategory($company, $event);
    }

    private static function allowsOwnerCategory(Company $company, string $event): bool
    {
        return match ($event) {
            self::EVENT_NEW_BOOKING => self::boolVal($company->notification_new_bookings ?? true, true),
            self::EVENT_BOOKING_CANCELLED => self::boolVal($company->notification_cancellations ?? true, true),
            self::EVENT_REVIEW => self::boolVal($company->notification_reviews ?? true, true),
            self::EVENT_PAYMENT => self::boolVal($company->notification_payments ?? true, true),
            default => true,
        };
    }

    private static function boolVal($value, bool $default): bool
    {
        if ($value === null) {
            return $default;
        }

        return (bool) $value;
    }
}
