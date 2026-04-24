<?php

namespace App\Support;

use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * 12-hour US-style clock strings in a given IANA timezone (for route / AI assistant payloads).
 */
final class UsTimeWindowFormat
{
    public static function window(CarbonInterface $start, CarbonInterface $end): string
    {
        return $start->format('g:i A').'–'.$end->format('g:i A');
    }

    public static function clock(CarbonInterface $dt): string
    {
        return $dt->format('g:i A');
    }

    /**
     * DB time-of-day (H:i or H:i:s) on calendar date $dateYmd interpreted in $tz → "9:30 AM".
     */
    public static function wallTimeFromDb(string $dbTime, string $tz, string $dateYmd): string
    {
        $t = trim($dbTime);
        if ($t === '') {
            return '';
        }
        if (strlen($t) === 5) {
            $t .= ':00';
        }
        try {
            return Carbon::parse($dateYmd.' '.$t, $tz)->format('g:i A');
        } catch (\Throwable) {
            return $t;
        }
    }
}
