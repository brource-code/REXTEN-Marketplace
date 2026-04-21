<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_google_pending_signups', function (Blueprint $table) {
            $table->id();
            $table->string('token_hash', 64)->unique();
            $table->json('payload');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_google_pending_signups');
    }
};
