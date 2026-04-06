<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('knowledge_topics')) {
            return;
        }

        Schema::table('knowledge_topics', function (Blueprint $table) {
            if (! Schema::hasColumn('knowledge_topics', 'module_key')) {
                $table->string('module_key')->nullable()->after('slug');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('knowledge_topics')) {
            return;
        }

        Schema::table('knowledge_topics', function (Blueprint $table) {
            if (Schema::hasColumn('knowledge_topics', 'module_key')) {
                $table->dropColumn('module_key');
            }
        });
    }
};
