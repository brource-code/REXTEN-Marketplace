<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $ownerRoleId = DB::table('company_roles')->where('slug', 'owner')->whereNull('company_id')->value('id');
        $managerRoleId = DB::table('company_roles')->where('slug', 'manager')->whereNull('company_id')->value('id');

        Schema::table('company_users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('user_id')->constrained('company_roles')->onDelete('restrict');
        });

        if ($ownerRoleId) {
            DB::table('company_users')->where('role', 'owner')->update(['role_id' => $ownerRoleId]);
        }
        if ($managerRoleId) {
            DB::table('company_users')->whereIn('role', ['manager', 'employee'])->update(['role_id' => $managerRoleId]);
        }
        DB::table('company_users')->whereNull('role_id')->update(['role_id' => $managerRoleId ?? $ownerRoleId]);

        Schema::table('company_users', function (Blueprint $table) {
            $table->dropColumn('role');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE company_users ALTER COLUMN role_id SET NOT NULL');
        } else {
            Schema::table('company_users', function (Blueprint $table) {
                $table->unsignedBigInteger('role_id')->nullable(false)->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('company_users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
        });

        Schema::table('company_users', function (Blueprint $table) {
            $table->enum('role', ['owner', 'manager', 'employee'])->default('employee')->after('user_id');
        });
    }
};
