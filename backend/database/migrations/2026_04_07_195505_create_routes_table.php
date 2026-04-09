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
        Schema::create('routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('specialist_id');
            $table->date('route_date');
            $table->string('status', 20)->default('draft');
            $table->integer('total_distance_meters')->nullable();
            $table->integer('total_duration_seconds')->nullable();
            $table->decimal('start_latitude', 10, 8)->nullable();
            $table->decimal('start_longitude', 11, 8)->nullable();
            $table->integer('cache_version')->default(1);
            $table->timestamp('optimized_at')->nullable();
            $table->timestamps();

            $table->unique(['specialist_id', 'route_date']);
            $table->index(['company_id', 'route_date']);
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('specialist_id')->references('id')->on('team_members')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
