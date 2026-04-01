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
        Schema::table('advertisements', function (Blueprint $table) {
            // JSON поля для дополнительных данных
            $table->json('services')->nullable()->after('description');
            $table->json('team')->nullable()->after('services');
            $table->json('portfolio')->nullable()->after('team');
            $table->json('schedule')->nullable()->after('portfolio');
            // Поля для цен
            $table->decimal('price_from', 10, 2)->nullable()->after('schedule');
            $table->decimal('price_to', 10, 2)->nullable()->after('price_from');
            $table->string('currency', 3)->default('USD')->after('price_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advertisements', function (Blueprint $table) {
            $table->dropColumn(['services', 'team', 'portfolio', 'schedule', 'price_from', 'price_to', 'currency']);
        });
    }
};
