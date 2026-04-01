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
        Schema::create('discount_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('min_bookings')->default(0);
            $table->unsignedInteger('max_bookings')->nullable();
            $table->string('discount_type', 20); // percentage | fixed
            $table->decimal('discount_value', 10, 2);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'is_active', 'min_bookings']);
        });

        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 64);
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->string('discount_type', 20); // percentage | fixed
            $table->decimal('discount_value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->nullable();
            $table->decimal('max_discount_amount', 10, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_per_user')->nullable()->default(1);
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'is_active']);
        });

        Schema::create('promo_code_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promo_code_id')->constrained()->cascadeOnDelete();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('client_phone', 32)->nullable();
            $table->decimal('discount_amount', 10, 2);
            $table->timestamps();

            $table->index(['promo_code_id', 'user_id']);
            $table->index(['promo_code_id', 'client_phone']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->string('loyalty_booking_count_rule', 32)->default('completed');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->string('discount_source', 32)->nullable();
            $table->foreignId('discount_tier_id')->nullable()->constrained('discount_tiers')->nullOnDelete();
            $table->foreignId('promo_code_id')->nullable()->constrained('promo_codes')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['discount_tier_id']);
            $table->dropForeign(['promo_code_id']);
            $table->dropColumn(['discount_amount', 'discount_source', 'discount_tier_id', 'promo_code_id']);
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('loyalty_booking_count_rule');
        });

        Schema::dropIfExists('promo_code_usages');
        Schema::dropIfExists('promo_codes');
        Schema::dropIfExists('discount_tiers');
    }
};
