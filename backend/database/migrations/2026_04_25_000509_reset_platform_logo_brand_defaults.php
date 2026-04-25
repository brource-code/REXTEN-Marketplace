<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('platform_settings')->update([
            'logo_light' => null,
            'logo_dark' => null,
            'logo_icon_light' => null,
            'logo_icon_dark' => null,
            'logo_text' => 'REXTEN',
            'logo_color_light' => '#333333',
            'logo_color_dark' => '#ffffff',
            'logo_size' => 26,
            'logo_icon_color_light' => '#114fee',
            'logo_icon_color_dark' => '#114fee',
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('platform_settings')->update([
            'logo_color_light' => '#333333',
            'logo_color_dark' => '#ffffff',
            'logo_icon_color_light' => '#114fee',
            'logo_icon_color_dark' => '#114fee',
            'updated_at' => now(),
        ]);
    }
};
