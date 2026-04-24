<?php

namespace App\Exceptions;

use Exception;

class AiQuotaExceededException extends Exception
{
    /**
     * @param  array<string, mixed>  $usage
     */
    public function __construct(
        public array $usage,
        public string $periodEndIso,
    ) {
        parent::__construct('AI quota exceeded for this month', 429);
    }
}
