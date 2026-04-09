<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('route_stops', function (Blueprint $table) {
            $table->timestamp('arrived_at')->nullable()->after('eta');
            $table->unsignedInteger('wait_before_seconds')->default(0)->after('arrived_at');
        });
    }

    public function down(): void
    {
        Schema::table('route_stops', function (Blueprint $table) {
            $table->dropColumn(['arrived_at', 'wait_before_seconds']);
        });
    }
};
