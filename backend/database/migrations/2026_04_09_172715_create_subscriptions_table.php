<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->string('plan', 50); // starter, professional, enterprise
            $table->string('status', 30)->default('active'); // active, canceled, past_due, trialing
            $table->string('stripe_session_id')->nullable();
            $table->string('stripe_subscription_id')->nullable();
            $table->integer('price_cents');
            $table->string('currency', 10)->default('usd');
            $table->string('interval', 20)->default('month'); // month, year
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
