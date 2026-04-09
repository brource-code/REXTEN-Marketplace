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
        Schema::create('geocoding_cache', function (Blueprint $table) {
            $table->id();
            $table->string('address_hash', 64)->unique();
            $table->text('original_address');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('formatted_address', 500)->nullable();
            $table->decimal('confidence', 3, 2)->nullable();
            $table->string('provider', 20)->default('here');
            $table->timestamp('created_at');
            $table->timestamp('expires_at');

            $table->index('address_hash');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('geocoding_cache');
    }
};
