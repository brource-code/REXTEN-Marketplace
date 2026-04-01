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
        // Добавляем колонки по одной с проверкой
        $tableName = 'recurring_booking_chains';
        
        if (!Schema::hasColumn($tableName, 'company_id')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->after('id');
            });
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'service_id')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('service_id')->nullable();
            });
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('service_id')->references('id')->on('services')->onDelete('set null');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'user_id')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable();
            });
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'specialist_id')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('specialist_id')->nullable();
            });
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('specialist_id')->references('id')->on('team_members')->onDelete('set null');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'advertisement_id')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('advertisement_id')->nullable();
            });
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('advertisement_id')->references('id')->on('advertisements')->onDelete('set null');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'frequency')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('frequency', 50)->default('weekly');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'days_of_week')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->json('days_of_week')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'day_of_month')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->integer('day_of_month')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'days_of_month')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->json('days_of_month')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'booking_time')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->time('booking_time')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'duration_minutes')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->integer('duration_minutes')->default(60);
            });
        }
        
        if (!Schema::hasColumn($tableName, 'price')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->decimal('price', 10, 2)->default(0);
            });
        }
        
        if (!Schema::hasColumn($tableName, 'start_date')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->date('start_date')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'end_date')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->date('end_date')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'client_name')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('client_name')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'client_email')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('client_email')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'client_phone')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('client_phone')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'notes')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->text('notes')->nullable();
            });
        }
        
        if (!Schema::hasColumn($tableName, 'status')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('status', 20)->default('active');
            });
        }
        
        if (!Schema::hasColumn($tableName, 'deleted_at')) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tableName = 'recurring_booking_chains';
        $columns = [
            'company_id', 'service_id', 'user_id', 'specialist_id', 'advertisement_id',
            'frequency', 'days_of_week', 'day_of_month', 'days_of_month',
            'booking_time', 'duration_minutes', 'price', 'start_date', 'end_date',
            'client_name', 'client_email', 'client_phone', 'notes', 'status', 'deleted_at'
        ];
        
        foreach ($columns as $column) {
            if (Schema::hasColumn($tableName, $column)) {
                Schema::table($tableName, function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
