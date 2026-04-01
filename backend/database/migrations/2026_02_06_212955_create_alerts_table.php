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
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // AlertType enum
            $table->string('severity', 20); // AlertSeverity enum: critical, warning, info
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('source', 50); // cron, observer, manual
            $table->boolean('is_resolved')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            
            // Foreign key
            $table->foreign('resolved_by')->references('id')->on('users')->onDelete('set null');
            
            // Indexes
            $table->index('type');
            $table->index('severity');
            $table->index('is_resolved');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
