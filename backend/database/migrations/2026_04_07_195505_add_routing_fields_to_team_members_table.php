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
        Schema::table('team_members', function (Blueprint $table) {
            $table->decimal('home_latitude', 10, 8)->nullable();
            $table->decimal('home_longitude', 11, 8)->nullable();
            $table->time('default_start_time')->default('08:00:00');
            $table->time('default_end_time')->default('18:00:00');
            $table->smallInteger('max_jobs_per_day')->default(10);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropColumn([
                'home_latitude',
                'home_longitude',
                'default_start_time',
                'default_end_time',
                'max_jobs_per_day',
            ]);
        });
    }
};
