<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('knowledge_topics')) {
            return;
        }

        Schema::table('knowledge_topics', function (Blueprint $table) {
            if (! Schema::hasColumn('knowledge_topics', 'locale')) {
                $table->string('locale', 32)->nullable()->after('id');
            }
            if (! Schema::hasColumn('knowledge_topics', 'topic_key')) {
                $table->string('topic_key', 120)->nullable()->after('slug');
            }
        });

        DB::table('knowledge_topics')->update([
            'locale' => 'en',
            'topic_key' => DB::raw('slug'),
        ]);

        try {
            Schema::table('knowledge_topics', function (Blueprint $table) {
                $table->dropUnique(['slug']);
            });
        } catch (\Throwable) {
        }

        $enRows = DB::table('knowledge_topics')->where('locale', 'en')->get();
        $otherLocales = ['ru', 'es-MX', 'hy-AM', 'uk-UA'];

        foreach ($enRows as $row) {
            foreach ($otherLocales as $loc) {
                $exists = DB::table('knowledge_topics')
                    ->where('topic_key', $row->topic_key)
                    ->where('locale', $loc)
                    ->exists();
                if ($exists) {
                    continue;
                }
                DB::table('knowledge_topics')->insert([
                    'title' => $row->title,
                    'slug' => $row->slug,
                    'description' => $row->description,
                    'module_key' => $row->module_key,
                    'sort_order' => $row->sort_order,
                    'is_published' => $row->is_published,
                    'locale' => $loc,
                    'topic_key' => $row->topic_key,
                    'created_at' => $row->created_at ?? now(),
                    'updated_at' => $row->updated_at ?? now(),
                ]);
            }
        }

        $articles = DB::table('knowledge_articles')->get();
        foreach ($articles as $a) {
            $topicRow = DB::table('knowledge_topics')->where('id', $a->knowledge_topic_id)->first();
            if (! $topicRow || ! $topicRow->topic_key) {
                continue;
            }
            $articleLocale = $a->locale ?? 'en';
            $correct = DB::table('knowledge_topics')
                ->where('topic_key', $topicRow->topic_key)
                ->where('locale', $articleLocale)
                ->first();
            if ($correct && (int) $correct->id !== (int) $a->knowledge_topic_id) {
                DB::table('knowledge_articles')->where('id', $a->id)->update([
                    'knowledge_topic_id' => $correct->id,
                ]);
            }
        }

        Schema::table('knowledge_topics', function (Blueprint $table) {
            $table->unique(['locale', 'slug'], 'knowledge_topics_locale_slug_unique');
        });

        Schema::table('knowledge_topics', function (Blueprint $table) {
            $table->unique(['topic_key', 'locale'], 'knowledge_topics_topic_key_locale_unique');
            $table->index('topic_key', 'knowledge_topics_topic_key_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('knowledge_topics')) {
            return;
        }

        try {
            Schema::table('knowledge_topics', function (Blueprint $table) {
                $table->dropUnique('knowledge_topics_locale_slug_unique');
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('knowledge_topics', function (Blueprint $table) {
                $table->dropUnique('knowledge_topics_topic_key_locale_unique');
            });
        } catch (\Throwable) {
        }

        try {
            Schema::table('knowledge_topics', function (Blueprint $table) {
                $table->dropIndex('knowledge_topics_topic_key_index');
            });
        } catch (\Throwable) {
        }

        if (Schema::hasColumn('knowledge_topics', 'locale')) {
            DB::table('knowledge_topics')->whereIn('locale', ['ru', 'es-MX', 'hy-AM', 'uk-UA'])->delete();
        }

        Schema::table('knowledge_topics', function (Blueprint $table) {
            if (Schema::hasColumn('knowledge_topics', 'locale')) {
                $table->dropColumn('locale');
            }
            if (Schema::hasColumn('knowledge_topics', 'topic_key')) {
                $table->dropColumn('topic_key');
            }
        });

        Schema::table('knowledge_topics', function (Blueprint $table) {
            $table->unique('slug');
        });
    }
};
