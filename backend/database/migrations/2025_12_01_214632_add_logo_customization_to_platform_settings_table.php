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
            $table->string('logo_text')->default('REXTEN')->after('logo_icon_dark');
            $table->string('logo_color_light')->default('#333333')->after('logo_text');
            $table->string('logo_color_dark')->default('#ffffff')->after('logo_color_light');
            $table->integer('logo_size')->default(26)->after('logo_color_dark');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn(['logo_text', 'logo_color_light', 'logo_color_dark', 'logo_size']);
        });
    }
};
