<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_budget_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('period')->default(date('Y-m')); // YYYY-MM
            $table->integer('start_day')->default(1);
            $table->decimal('start_balance', 12, 2)->default(0);
            $table->decimal('safe_min_balance', 12, 2)->default(300);
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_budget_settings');
    }
};
