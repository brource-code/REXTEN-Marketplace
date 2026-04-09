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
        Schema::create('route_stops', function (Blueprint $table) {
            $table->id();
            $table->uuid('route_id');
            $table->unsignedBigInteger('booking_id')->nullable();
            $table->smallInteger('sequence_order');
            $table->string('stop_type', 20);
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamp('eta')->nullable();
            $table->integer('distance_from_prev_meters')->nullable();
            $table->integer('duration_from_prev_seconds')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->unique(['route_id', 'sequence_order']);
            $table->foreign('route_id')->references('id')->on('routes')->onDelete('cascade');
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_stops');
    }
};
