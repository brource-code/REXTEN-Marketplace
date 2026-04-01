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
        Schema::table('services', function (Blueprint $table) {
            $table->foreignId('advertisement_id')->nullable()->after('company_id')
                ->constrained('advertisements')->onDelete('cascade');
            $table->index('advertisement_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign(['advertisement_id']);
            $table->dropIndex(['advertisement_id']);
            $table->dropColumn('advertisement_id');
        });
    }
};

