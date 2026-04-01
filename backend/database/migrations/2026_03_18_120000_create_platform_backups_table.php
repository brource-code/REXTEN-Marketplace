<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_backups', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('disk_path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('status')->default('pending');
            $table->string('trigger')->default('manual');
            $table->boolean('local_ok')->default(false);
            $table->boolean('s3_ok')->default(false);
            $table->string('s3_key')->nullable();
            $table->text('error_message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_backups');
    }
};
