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
        Schema::create('advertisement_displays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advertisement_id')->constrained('advertisements')->onDelete('cascade');
            $table->string('session_id')->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('placement')->index();
            $table->timestamp('displayed_at');
            $table->string('state')->nullable();
            $table->string('city')->nullable();
            $table->timestamps();
            
            // Индексы для оптимизации запросов
            $table->index(['session_id', 'placement']);
            $table->index(['user_id', 'placement']);
            $table->index(['advertisement_id']);
            $table->index(['state', 'city']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advertisement_displays');
    }
};
