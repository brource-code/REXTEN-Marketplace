<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->string('logo_icon_color_light')->default('#2563EB')->after('logo_size');
            $table->string('logo_icon_color_dark')->default('#696cff')->after('logo_icon_color_light');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn(['logo_icon_color_light', 'logo_icon_color_dark']);
        });
    }
};
