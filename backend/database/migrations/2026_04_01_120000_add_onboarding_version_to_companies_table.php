<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('onboarding_version', 32)->nullable()->after('onboarding_completed_at');
        });

        DB::table('companies')
            ->where('onboarding_completed', true)
            ->update(['onboarding_version' => 'v1']);
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('onboarding_version');
        });
    }
};
