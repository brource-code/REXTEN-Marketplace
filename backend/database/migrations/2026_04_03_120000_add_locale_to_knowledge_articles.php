<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Локаль статьи: показ в кабинете бизнеса только при совпадении с языком UI.
     * Уникальность: (topic, slug, locale).
     */
    public function up(): void
    {
        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->string('locale', 32)->default('en')->after('slug');
        });

        // Существующие строки: выставить locale по суффиксу slug (сидер dashboard-*-en и т.д.)
        $suffixToLocale = [
            '-uk-ua' => 'uk-UA',
            '-hy-am' => 'hy-AM',
            '-es-mx' => 'es-MX',
            '-ru' => 'ru',
            '-en' => 'en',
        ];
        foreach ($suffixToLocale as $suffix => $locale) {
            DB::table('knowledge_articles')
                ->where('slug', 'like', '%'.$suffix)
                ->update(['locale' => $locale]);
        }

        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->dropUnique(['knowledge_topic_id', 'slug']);
        });

        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->unique(['knowledge_topic_id', 'slug', 'locale'], 'knowledge_articles_topic_slug_locale_unique');
        });
    }

    public function down(): void
    {
        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->dropUnique('knowledge_articles_topic_slug_locale_unique');
        });

        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->unique(['knowledge_topic_id', 'slug']);
        });

        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
