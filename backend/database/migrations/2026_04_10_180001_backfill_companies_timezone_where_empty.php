<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Гарантирует ненулевую таймзону для старых строк (колонка уже с дефолтом в миграции add_timezone).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('companies')
            ->where(function ($q) {
                $q->whereNull('timezone')->orWhere('timezone', '=', '');
            })
            ->update(['timezone' => 'America/Los_Angeles']);
    }

    public function down(): void
    {
        // необратимо
    }
};
