<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Кэшируемое чтение platform_settings для middleware и контроллеров.
 */
class PlatformSettingsService
{
    public const CACHE_KEY = 'platform_settings.snapshot';

    public const CACHE_TTL_SECONDS = 30;

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public static function getRow(): ?object
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function () {
            return DB::table('platform_settings')->first();
        });
    }

    public static function isMaintenanceMode(): bool
    {
        $row = self::getRow();

        return $row && (bool) ($row->maintenance_mode ?? false);
    }

    public static function isRegistrationEnabled(): bool
    {
        $row = self::getRow();

        return ! $row || (bool) ($row->registration_enabled ?? true);
    }

    public static function isEmailVerificationRequired(): bool
    {
        $row = self::getRow();

        // Нет строки настроек — считаем, что подтверждение включено (как дефолт миграции),
        // иначе `$row && …` давало false и все регистрации проходили с email_verified_at сразу.
        if (! $row) {
            return true;
        }

        return (bool) ($row->email_verification ?? true);
    }

    public static function isStripePaymentsEnabled(): bool
    {
        $row = self::getRow();

        return ! $row || (bool) ($row->stripe_enabled ?? true);
    }

    public static function getApiRateLimitPerMinute(): int
    {
        $row = self::getRow();
        $v = (int) ($row->api_rate_limit ?? 100);

        return max(10, min(10000, $v));
    }
}
