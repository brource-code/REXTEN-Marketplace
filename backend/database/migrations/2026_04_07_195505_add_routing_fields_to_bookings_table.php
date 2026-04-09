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
        Schema::table('bookings', function (Blueprint $table) {
            $table->smallInteger('priority')->default(5);
            $table->decimal('cached_lat', 10, 8)->nullable();
            $table->decimal('cached_lng', 11, 8)->nullable();
            $table->timestamp('geocoded_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'priority',
                'cached_lat',
                'cached_lng',
                'geocoded_at',
            ]);
        });
    }
};
