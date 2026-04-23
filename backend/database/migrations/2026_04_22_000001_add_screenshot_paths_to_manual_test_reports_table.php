<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manual_test_reports', function (Blueprint $table) {
            $table->json('screenshot_paths')->nullable()->after('screenshot_path');
        });

        if (Schema::hasColumn('manual_test_reports', 'screenshot_path')) {
            $rows = DB::table('manual_test_reports')
                ->whereNotNull('screenshot_path')
                ->select('id', 'screenshot_path')
                ->get();
            foreach ($rows as $row) {
                DB::table('manual_test_reports')
                    ->where('id', $row->id)
                    ->update([
                        'screenshot_paths' => json_encode([$row->screenshot_path]),
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('manual_test_reports', function (Blueprint $table) {
            $table->dropColumn('screenshot_paths');
        });
    }
};
