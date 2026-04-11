<?php

use App\Support\UsStateCodes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (UsStateCodes::ids() as $id) {
            DB::table('companies')
                ->whereRaw('UPPER(TRIM(state)) = ?', [strtoupper($id)])
                ->update(['state' => $id]);
        }
        foreach (UsStateCodes::idToName() as $id => $name) {
            DB::table('companies')
                ->whereRaw('LOWER(TRIM(state)) = ?', [strtolower($name)])
                ->update(['state' => $id]);
        }

        foreach (UsStateCodes::ids() as $id) {
            DB::table('advertisements')
                ->whereRaw('UPPER(TRIM(state)) = ?', [strtoupper($id)])
                ->update(['state' => $id]);
        }
        foreach (UsStateCodes::idToName() as $id => $name) {
            DB::table('advertisements')
                ->whereRaw('LOWER(TRIM(state)) = ?', [strtolower($name)])
                ->update(['state' => $id]);
        }
    }

    public function down(): void
    {
        // Не откатываем: нельзя восстановить исходные строки без бэкапа.
    }
};
