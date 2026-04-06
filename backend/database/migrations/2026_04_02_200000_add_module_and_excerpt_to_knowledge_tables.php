<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('knowledge_topics', function (Blueprint $table) {
            $table->string('module_key', 120)->nullable()->after('description');
            $table->index('module_key');
        });

        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->text('excerpt')->nullable()->after('slug');
        });
    }

    public function down(): void
    {
        Schema::table('knowledge_topics', function (Blueprint $table) {
            $table->dropIndex(['module_key']);
            $table->dropColumn('module_key');
        });

        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->dropColumn('excerpt');
        });
    }
};
