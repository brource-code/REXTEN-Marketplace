<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE platform_backups ALTER COLUMN disk_path DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement("UPDATE platform_backups SET disk_path = '' WHERE disk_path IS NULL");
        DB::statement('ALTER TABLE platform_backups ALTER COLUMN disk_path SET NOT NULL');
    }
};
