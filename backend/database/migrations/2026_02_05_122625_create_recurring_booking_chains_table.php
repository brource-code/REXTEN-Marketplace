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
        Schema::create('recurring_booking_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('service_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('specialist_id')->nullable()->constrained('team_members')->onDelete('set null');
            $table->foreignId('advertisement_id')->nullable()->constrained()->onDelete('set null');
            
            // Настройки повторения
            $table->enum('frequency', ['weekly', 'biweekly', 'monthly', 'bimonthly']);
            $table->json('days_of_week')->nullable(); // [1, 3] для понедельника и среды (для weekly/biweekly)
            $table->integer('day_of_month')->nullable(); // 15 для 15-го числа (для monthly)
            $table->json('days_of_month')->nullable(); // [1, 15] для 1-го и 15-го (для bimonthly)
            
            $table->time('booking_time');
            $table->integer('duration_minutes')->default(60);
            $table->decimal('price', 10, 2)->default(0);
            
            // Период действия цепочки
            $table->date('start_date');
            $table->date('end_date')->nullable(); // null = бессрочно
            
            // Данные клиента (для незарегистрированных)
            $table->string('client_name')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_phone')->nullable();
            
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'paused', 'cancelled'])->default('active');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recurring_booking_chains');
    }
};
