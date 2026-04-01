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
        Schema::table('recurring_booking_chains', function (Blueprint $table) {
            // Добавляем все поля, если их еще нет
            if (!Schema::hasColumn('recurring_booking_chains', 'company_id')) {
                $table->foreignId('company_id')->constrained('companies')->onDelete('cascade')->after('id');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'service_id')) {
                $table->foreignId('service_id')->nullable()->constrained('services')->onDelete('set null')->after('company_id');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'user_id')) {
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->after('service_id');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'specialist_id')) {
                $table->foreignId('specialist_id')->nullable()->constrained('team_members')->onDelete('set null')->after('user_id');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'advertisement_id')) {
                $table->foreignId('advertisement_id')->nullable()->constrained('advertisements')->onDelete('set null')->after('specialist_id');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'frequency')) {
                $table->string('frequency', 50)->after('advertisement_id');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'interval_days')) {
                $table->integer('interval_days')->nullable()->after('frequency');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'days_of_week')) {
                $table->json('days_of_week')->nullable()->after('interval_days');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'day_of_month')) {
                $table->integer('day_of_month')->nullable()->after('days_of_week');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'days_of_month')) {
                $table->json('days_of_month')->nullable()->after('day_of_month');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'booking_time')) {
                $table->time('booking_time')->after('days_of_month');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'duration_minutes')) {
                $table->integer('duration_minutes')->default(60)->after('booking_time');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'price')) {
                $table->decimal('price', 10, 2)->default(0)->after('duration_minutes');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'start_date')) {
                $table->date('start_date')->after('price');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'client_name')) {
                $table->string('client_name')->nullable()->after('end_date');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'client_email')) {
                $table->string('client_email')->nullable()->after('client_name');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'client_phone')) {
                $table->string('client_phone')->nullable()->after('client_email');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'notes')) {
                $table->text('notes')->nullable()->after('client_phone');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'status')) {
                $table->enum('status', ['active', 'paused', 'cancelled'])->default('active')->after('notes');
            }
            if (!Schema::hasColumn('recurring_booking_chains', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recurring_booking_chains', function (Blueprint $table) {
            $columns = [
                'company_id', 'service_id', 'user_id', 'specialist_id', 'advertisement_id',
                'frequency', 'interval_days', 'days_of_week', 'day_of_month', 'days_of_month',
                'booking_time', 'duration_minutes', 'price', 'start_date', 'end_date',
                'client_name', 'client_email', 'client_phone', 'notes', 'status', 'deleted_at'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('recurring_booking_chains', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
