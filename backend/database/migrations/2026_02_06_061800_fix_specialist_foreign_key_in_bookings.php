<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, clean up any specialist_id values that don't exist in team_members
        // Set them to NULL so the foreign key constraint can be added
        DB::statement('
            UPDATE bookings 
            SET specialist_id = NULL 
            WHERE specialist_id IS NOT NULL 
            AND specialist_id NOT IN (SELECT id FROM team_members)
        ');

        Schema::table('bookings', function (Blueprint $table) {
            // Drop the old foreign key constraint (references users)
            $table->dropForeign(['specialist_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            // Add new foreign key constraint referencing team_members
            $table->foreign('specialist_id')
                  ->references('id')
                  ->on('team_members')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['specialist_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreign('specialist_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }
};
