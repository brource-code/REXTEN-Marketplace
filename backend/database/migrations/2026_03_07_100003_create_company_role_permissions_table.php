<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_role_permissions', function (Blueprint $table) {
            $table->foreignId('company_role_id')->constrained()->onDelete('cascade');
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->primary(['company_role_id', 'permission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_role_permissions');
    }
};
