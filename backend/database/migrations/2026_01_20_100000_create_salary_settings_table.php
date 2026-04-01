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
        Schema::create('salary_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_member_id')->constrained('team_members')->onDelete('cascade');
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            $table->enum('payment_type', ['percent', 'fixed', 'fixed_plus_percent', 'hourly']);
            $table->decimal('percent_rate', 5, 2)->nullable(); // Для percent и fixed_plus_percent
            $table->decimal('fixed_amount', 10, 2)->nullable(); // Для fixed и fixed_plus_percent
            $table->decimal('hourly_rate', 10, 2)->nullable(); // Для hourly
            $table->boolean('is_active')->default(true);
            $table->date('effective_from'); // Дата начала действия
            $table->date('effective_to')->nullable(); // Дата окончания действия
            $table->timestamps();
            
            $table->index('team_member_id');
            $table->index('company_id');
            $table->index('is_active');
            $table->index(['team_member_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_settings');
    }
};
