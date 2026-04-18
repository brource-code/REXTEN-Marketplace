<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->unsignedSmallInteger('cancellation_free_hours')->default(12)->after('online_payment_enabled');
            $table->unsignedTinyInteger('cancellation_late_fee_percent')->default(50)->after('cancellation_free_hours');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['cancellation_free_hours', 'cancellation_late_fee_percent']);
        });
    }
};
