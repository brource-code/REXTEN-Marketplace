<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rows = [
            ['name' => 'Просмотр маршрутов', 'slug' => 'view_routes', 'group' => 'routes'],
            ['name' => 'Управление маршрутами', 'slug' => 'manage_routes', 'group' => 'routes'],
        ];

        foreach ($rows as $p) {
            DB::table('permissions')->insertOrIgnore(array_merge($p, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $ownerRoleId = DB::table('company_roles')->where('slug', 'owner')->whereNull('company_id')->value('id');
        if ($ownerRoleId) {
            foreach (['view_routes', 'manage_routes'] as $slug) {
                $pid = DB::table('permissions')->where('slug', $slug)->value('id');
                if ($pid) {
                    DB::table('company_role_permissions')->insertOrIgnore([
                        'company_role_id' => $ownerRoleId,
                        'permission_id' => $pid,
                    ]);
                }
            }
        }

        $managerRoleId = DB::table('company_roles')->where('slug', 'manager')->whereNull('company_id')->value('id');
        if ($managerRoleId) {
            foreach (['view_routes', 'manage_routes'] as $slug) {
                $pid = DB::table('permissions')->where('slug', $slug)->value('id');
                if ($pid) {
                    DB::table('company_role_permissions')->insertOrIgnore([
                        'company_role_id' => $managerRoleId,
                        'permission_id' => $pid,
                    ]);
                }
            }
        }

        $this->mirrorPermission('view_schedule', 'view_routes');
        $this->mirrorPermission('manage_schedule', 'manage_routes');
    }

    /**
     * Все роли, у которых есть $from, получают и $to (как у расписания).
     */
    private function mirrorPermission(string $from, string $to): void
    {
        $fromId = DB::table('permissions')->where('slug', $from)->value('id');
        $toId = DB::table('permissions')->where('slug', $to)->value('id');
        if (! $fromId || ! $toId) {
            return;
        }

        $roleIds = DB::table('company_role_permissions')
            ->where('permission_id', $fromId)
            ->pluck('company_role_id');

        foreach ($roleIds as $rid) {
            DB::table('company_role_permissions')->insertOrIgnore([
                'company_role_id' => $rid,
                'permission_id' => $toId,
            ]);
        }
    }

    public function down(): void
    {
        $ids = DB::table('permissions')->whereIn('slug', ['view_routes', 'manage_routes'])->pluck('id');
        DB::table('company_role_permissions')->whereIn('permission_id', $ids)->delete();
        DB::table('permissions')->whereIn('slug', ['view_routes', 'manage_routes'])->delete();
    }
};
