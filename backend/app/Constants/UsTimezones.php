<?php

namespace App\Constants;

class UsTimezones
{
    /**
     * Маппинг штатов США на таймзоны
     */
    public const TIMEZONES = [
        'AL' => 'America/Chicago',      // Alabama
        'AK' => 'America/Anchorage',    // Alaska
        'AZ' => 'America/Phoenix',      // Arizona (no DST)
        'AR' => 'America/Chicago',      // Arkansas
        'CA' => 'America/Los_Angeles',  // California
        'CO' => 'America/Denver',       // Colorado
        'CT' => 'America/New_York',     // Connecticut
        'DE' => 'America/New_York',     // Delaware
        'FL' => 'America/New_York',     // Florida (mostly Eastern, some Central)
        'GA' => 'America/New_York',     // Georgia
        'HI' => 'Pacific/Honolulu',     // Hawaii
        'ID' => 'America/Boise',        // Idaho (mostly Mountain, some Pacific)
        'IL' => 'America/Chicago',      // Illinois
        'IN' => 'America/Indiana/Indianapolis', // Indiana
        'IA' => 'America/Chicago',      // Iowa
        'KS' => 'America/Chicago',      // Kansas (mostly Central, some Mountain)
        'KY' => 'America/New_York',     // Kentucky (mostly Eastern, some Central)
        'LA' => 'America/Chicago',      // Louisiana
        'ME' => 'America/New_York',     // Maine
        'MD' => 'America/New_York',     // Maryland
        'MA' => 'America/New_York',     // Massachusetts
        'MI' => 'America/Detroit',      // Michigan
        'MN' => 'America/Chicago',      // Minnesota
        'MS' => 'America/Chicago',      // Mississippi
        'MO' => 'America/Chicago',      // Missouri
        'MT' => 'America/Denver',       // Montana
        'NE' => 'America/Chicago',      // Nebraska (mostly Central, some Mountain)
        'NV' => 'America/Los_Angeles',  // Nevada
        'NH' => 'America/New_York',     // New Hampshire
        'NJ' => 'America/New_York',     // New Jersey
        'NM' => 'America/Denver',       // New Mexico
        'NY' => 'America/New_York',     // New York
        'NC' => 'America/New_York',     // North Carolina
        'ND' => 'America/Chicago',      // North Dakota (mostly Central, some Mountain)
        'OH' => 'America/New_York',     // Ohio
        'OK' => 'America/Chicago',      // Oklahoma
        'OR' => 'America/Los_Angeles',  // Oregon
        'PA' => 'America/New_York',     // Pennsylvania
        'RI' => 'America/New_York',     // Rhode Island
        'SC' => 'America/New_York',     // South Carolina
        'SD' => 'America/Chicago',      // South Dakota (mostly Central, some Mountain)
        'TN' => 'America/Chicago',      // Tennessee (mostly Central, some Eastern)
        'TX' => 'America/Chicago',      // Texas (mostly Central, some Mountain)
        'UT' => 'America/Denver',       // Utah
        'VT' => 'America/New_York',     // Vermont
        'VA' => 'America/New_York',     // Virginia
        'WA' => 'America/Los_Angeles',  // Washington
        'WV' => 'America/New_York',     // West Virginia
        'WI' => 'America/Chicago',      // Wisconsin
        'WY' => 'America/Denver',       // Wyoming
        'DC' => 'America/New_York',     // Washington D.C.
    ];

    /**
     * Получить таймзону по коду штата
     * 
     * @param string $stateCode Код штата (например 'CA', 'NY')
     * @return string Таймзона (например 'America/Los_Angeles')
     */
    public static function getByState(string $stateCode): string
    {
        $stateCode = strtoupper(trim($stateCode));
        return self::TIMEZONES[$stateCode] ?? 'America/Los_Angeles';
    }

    /**
     * Получить все доступные таймзоны США
     * 
     * @return array Массив уникальных таймзон
     */
    public static function getAllTimezones(): array
    {
        return array_unique(array_values(self::TIMEZONES));
    }

    /**
     * Проверить, является ли таймзона валидной для США
     * 
     * @param string $timezone Таймзона для проверки
     * @return bool
     */
    public static function isValidUsTimezone(string $timezone): bool
    {
        return in_array($timezone, self::getAllTimezones());
    }
}
