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
        Schema::table('additional_services', function (Blueprint $table) {
            $table->string('service_json_id')->nullable()->after('service_id')->comment('ID виртуальной услуги из JSON объявления');
            $table->index(['advertisement_id', 'service_json_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('additional_services', function (Blueprint $table) {
            $table->dropIndex(['advertisement_id', 'service_json_id']);
            $table->dropColumn('service_json_id');
        });
    }
};
