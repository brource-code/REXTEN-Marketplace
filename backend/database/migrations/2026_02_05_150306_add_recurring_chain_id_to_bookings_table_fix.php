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
        if (!Schema::hasColumn('bookings', 'recurring_chain_id')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->unsignedBigInteger('recurring_chain_id')->nullable()->after('advertisement_id');
            });
            
            // Добавляем foreign key отдельно
            Schema::table('bookings', function (Blueprint $table) {
                $table->foreign('recurring_chain_id')
                    ->references('id')
                    ->on('recurring_booking_chains')
                    ->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('bookings', 'recurring_chain_id')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropForeign(['recurring_chain_id']);
                $table->dropColumn('recurring_chain_id');
            });
        }
    }
};
