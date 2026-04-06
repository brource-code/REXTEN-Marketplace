<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait ResolvesKnowledgeLocale
{
    /** @var list<string> */
    public static function supportedKnowledgeLocales(): array
    {
        return ['en', 'ru', 'es-MX', 'hy-AM', 'uk-UA'];
    }

    public function resolveKnowledgeLocale(Request $request): string
    {
        $supported = self::supportedKnowledgeLocales();
        $q = $request->query('locale');
        if (is_string($q) && in_array($q, $supported, true)) {
            return $q;
        }

        $accept = $request->header('Accept-Language');
        if (is_string($accept) && $accept !== '') {
            $parts = preg_split('/[;,]/', $accept);
            $first = strtolower(trim($parts[0] ?? ''));
            $first = preg_replace('/^([a-z]{2})-([a-z]{2})$/i', '$1-$2', $first);
            if ($first === 'es' || str_starts_with($first, 'es-')) {
                return 'es-MX';
            }
            if ($first === 'hy' || str_starts_with($first, 'hy-')) {
                return 'hy-AM';
            }
            if ($first === 'uk' || str_starts_with($first, 'uk-')) {
                return 'uk-UA';
            }
            if ($first === 'ru' || str_starts_with($first, 'ru-')) {
                return 'ru';
            }
            if ($first === 'en' || str_starts_with($first, 'en-')) {
                return 'en';
            }
        }

        return 'en';
    }
}
