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
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->string('timezone')->default('America/Los_Angeles')->after('contact_phone');
            $table->string('currency')->default('USD')->after('timezone');
            $table->string('default_language')->default('ru')->after('currency');

            $table->string('company_name')->nullable()->after('default_language');
            $table->string('company_address')->nullable()->after('company_name');
            $table->string('company_tax_id')->nullable()->after('company_address');

            $table->string('instagram_url')->nullable()->after('company_tax_id');
            $table->string('facebook_url')->nullable()->after('instagram_url');
            $table->string('twitter_url')->nullable()->after('facebook_url');

            $table->boolean('stripe_enabled')->default(true)->after('twitter_url');

            $table->boolean('subscription_enabled')->default(false)->after('stripe_enabled');
            $table->json('subscription_plans')->nullable()->after('subscription_enabled');

            $table->boolean('maintenance_mode')->default(false)->after('subscription_plans');
            $table->boolean('registration_enabled')->default(true)->after('maintenance_mode');
            $table->boolean('email_verification')->default(true)->after('registration_enabled');
            $table->boolean('sms_verification')->default(false)->after('email_verification');
            $table->boolean('two_factor_auth')->default(false)->after('sms_verification');
            $table->integer('session_timeout')->default(30)->after('two_factor_auth');
            $table->integer('max_upload_size')->default(10)->after('session_timeout');
            $table->boolean('cache_enabled')->default(true)->after('max_upload_size');
            $table->integer('cache_duration')->default(60)->after('cache_enabled');
            $table->string('log_level')->default('info')->after('cache_duration');
            $table->integer('api_rate_limit')->default(100)->after('log_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn([
                'timezone',
                'currency',
                'default_language',
                'company_name',
                'company_address',
                'company_tax_id',
                'instagram_url',
                'facebook_url',
                'twitter_url',
                'stripe_enabled',
                'subscription_enabled',
                'subscription_plans',
                'maintenance_mode',
                'registration_enabled',
                'email_verification',
                'sms_verification',
                'two_factor_auth',
                'session_timeout',
                'max_upload_size',
                'cache_enabled',
                'cache_duration',
                'log_level',
                'api_rate_limit',
            ]);
        });
    }
};
