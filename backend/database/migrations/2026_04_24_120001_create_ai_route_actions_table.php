<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_route_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('user_id');
            $table->uuid('route_id')->nullable();
            $table->jsonb('actions');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('route_id')->references('id')->on('routes')->nullOnDelete();
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX ai_route_actions_company_id_created_at_index ON ai_route_actions (company_id, created_at DESC)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_route_actions');
    }
};
