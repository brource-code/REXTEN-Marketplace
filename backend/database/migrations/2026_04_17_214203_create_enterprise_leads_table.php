<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enterprise_leads', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('email', 190);
            $table->string('phone', 50)->nullable();
            $table->string('company', 190)->nullable();
            $table->string('team_size', 32)->nullable();
            $table->text('message');
            $table->string('locale', 8)->nullable();
            $table->string('source', 64)->default('landing_pricing_enterprise');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('status', 32)->default('new');
            $table->timestamps();
            $table->timestamp('processed_at')->nullable();

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enterprise_leads');
    }
};
