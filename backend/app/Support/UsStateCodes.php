<?php

namespace App\Support;

/**
 * Двухбуквенные коды штатов США + DC; полные имена для отображения и нормализации.
 */
final class UsStateCodes
{
    private const ID_TO_NAME = [
        'AL' => 'Alabama',
        'AK' => 'Alaska',
        'AZ' => 'Arizona',
        'AR' => 'Arkansas',
        'CA' => 'California',
        'CO' => 'Colorado',
        'CT' => 'Connecticut',
        'DE' => 'Delaware',
        'FL' => 'Florida',
        'GA' => 'Georgia',
        'HI' => 'Hawaii',
        'ID' => 'Idaho',
        'IL' => 'Illinois',
        'IN' => 'Indiana',
        'IA' => 'Iowa',
        'KS' => 'Kansas',
        'KY' => 'Kentucky',
        'LA' => 'Louisiana',
        'ME' => 'Maine',
        'MD' => 'Maryland',
        'MA' => 'Massachusetts',
        'MI' => 'Michigan',
        'MN' => 'Minnesota',
        'MS' => 'Mississippi',
        'MO' => 'Missouri',
        'MT' => 'Montana',
        'NE' => 'Nebraska',
        'NV' => 'Nevada',
        'NH' => 'New Hampshire',
        'NJ' => 'New Jersey',
        'NM' => 'New Mexico',
        'NY' => 'New York',
        'NC' => 'North Carolina',
        'ND' => 'North Dakota',
        'OH' => 'Ohio',
        'OK' => 'Oklahoma',
        'OR' => 'Oregon',
        'PA' => 'Pennsylvania',
        'RI' => 'Rhode Island',
        'SC' => 'South Carolina',
        'SD' => 'South Dakota',
        'TN' => 'Tennessee',
        'TX' => 'Texas',
        'UT' => 'Utah',
        'VT' => 'Vermont',
        'VA' => 'Virginia',
        'WA' => 'Washington',
        'WV' => 'West Virginia',
        'WI' => 'Wisconsin',
        'WY' => 'Wyoming',
        'DC' => 'District of Columbia',
    ];

    /**
     * @return list<string>
     */
    public static function ids(): array
    {
        return array_keys(self::ID_TO_NAME);
    }

    /**
     * @return array<string, string> id => English name
     */
    public static function idToName(): array
    {
        return self::ID_TO_NAME;
    }

    public static function nameFor(string $id): ?string
    {
        $u = strtoupper(trim($id));

        return self::ID_TO_NAME[$u] ?? null;
    }

    /**
     * Приводит значение из БД/запроса к коду (CA) или null.
     */
    public static function resolve(null|string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $t = trim($raw);
        if ($t === '') {
            return null;
        }
        $upper = strtoupper($t);
        if (in_array($upper, ['US', 'USA', 'U.S.', 'U.S.A.'], true)) {
            return null;
        }
        if (isset(self::ID_TO_NAME[$upper])) {
            return $upper;
        }
        foreach (self::ID_TO_NAME as $id => $name) {
            if (strcasecmp($name, $t) === 0) {
                return $id;
            }
        }

        return null;
    }

    /**
     * Для merge в Request: пустая строка → null, иначе resolve (неизвестное → null).
     */
    public static function normalizeNullableStateInput(mixed $input): ?string
    {
        if ($input === null) {
            return null;
        }
        if (! is_string($input)) {
            return null;
        }
        if (trim($input) === '') {
            return null;
        }

        return self::resolve($input);
    }
}
