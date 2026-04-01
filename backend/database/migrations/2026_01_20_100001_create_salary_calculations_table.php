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
        Schema::create('salary_calculations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_member_id')->constrained('team_members')->onDelete('cascade');
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->date('period_start'); // Начало периода
            $table->date('period_end'); // Конец периода
            $table->integer('total_bookings')->default(0); // Количество бронирований
            $table->decimal('total_hours', 8, 2)->default(0); // Общее количество часов для почасовой оплаты
            $table->decimal('base_amount', 10, 2)->default(0); // Базовая сумма - фикс или почасовая
            $table->decimal('percent_amount', 10, 2)->default(0); // Сумма с процентов
            $table->decimal('total_salary', 10, 2)->default(0); // Итоговая ЗП
            $table->json('calculation_details')->nullable(); // Детали расчета: список бронирований с расчетами
            $table->timestamps();
            
            $table->index('team_member_id');
            $table->index('company_id');
            $table->index('period_start');
            $table->index('period_end');
            $table->index(['company_id', 'period_start', 'period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_calculations');
    }
};
