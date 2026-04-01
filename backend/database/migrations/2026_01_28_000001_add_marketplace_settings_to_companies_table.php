<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Добавляет настройки маркетплейса в таблицу companies
     */
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            // Настройки видимости
            $table->boolean('show_in_search')->default(true)->after('is_visible_on_marketplace');
            $table->boolean('show_in_featured')->default(false)->after('show_in_search');
            $table->boolean('allow_booking')->default(true)->after('show_in_featured');
            
            // Настройки отображения контента
            $table->boolean('show_reviews')->default(true)->after('allow_booking');
            $table->boolean('show_portfolio')->default(true)->after('show_reviews');
            
            // SEO настройки
            $table->string('seo_title', 255)->nullable()->after('show_portfolio');
            $table->text('seo_description')->nullable()->after('seo_title');
            $table->string('meta_keywords', 500)->nullable()->after('seo_description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'show_in_search',
                'show_in_featured',
                'allow_booking',
                'show_reviews',
                'show_portfolio',
                'seo_title',
                'seo_description',
                'meta_keywords',
            ]);
        });
    }
};
