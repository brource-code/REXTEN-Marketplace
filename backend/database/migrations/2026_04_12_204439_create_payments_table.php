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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('booking_id')->nullable();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('stripe_payment_intent_id', 255)->unique();
            $table->string('stripe_charge_id', 255)->nullable();
            $table->string('stripe_transfer_id', 255)->nullable();
            $table->integer('amount');
            $table->integer('application_fee')->default(0);
            $table->string('currency', 3)->default('usd');
            $table->string('status', 20)->default('pending');
            $table->string('capture_status', 20)->default('pending');
            $table->integer('refunded_amount')->default(0);
            $table->text('refund_reason')->nullable();
            $table->string('refund_initiated_by', 20)->nullable();
            $table->timestamp('disputed_at')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('set null');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            $table->index('company_id');
            $table->index('booking_id');
            $table->index('status');
            $table->index('capture_status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
