<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
                $table->string('token_prefix', 32)->nullable();
                $table->timestamps();
            });

            return;
        }

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            if (! Schema::hasColumn('personal_access_tokens', 'company_id')) {
                $table->foreignId('company_id')->nullable()->constrained()->cascadeOnDelete();
            }
            if (! Schema::hasColumn('personal_access_tokens', 'token_prefix')) {
                $table->string('token_prefix', 32)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                if (Schema::hasColumn('personal_access_tokens', 'company_id')) {
                    $table->dropForeign(['company_id']);
                }
            });
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                if (Schema::hasColumn('personal_access_tokens', 'token_prefix')) {
                    $table->dropColumn('token_prefix');
                }
            });
        }
    }
};
