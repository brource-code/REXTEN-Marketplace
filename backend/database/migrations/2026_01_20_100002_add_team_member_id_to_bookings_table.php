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
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('team_member_id')->nullable()->after('specialist_id')->constrained('team_members')->onDelete('set null');
            $table->index('team_member_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['team_member_id']);
            $table->dropIndex(['team_member_id']);
            $table->dropColumn('team_member_id');
        });
    }
};
