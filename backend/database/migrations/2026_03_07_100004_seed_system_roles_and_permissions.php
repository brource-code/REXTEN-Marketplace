<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = [
            ['name' => 'Просмотр дашборда', 'slug' => 'view_dashboard', 'group' => 'dashboard'],
            ['name' => 'Просмотр расписания', 'slug' => 'view_schedule', 'group' => 'schedule'],
            ['name' => 'Управление расписанием', 'slug' => 'manage_schedule', 'group' => 'schedule'],
            ['name' => 'Просмотр клиентов', 'slug' => 'view_clients', 'group' => 'clients'],
            ['name' => 'Управление клиентами', 'slug' => 'manage_clients', 'group' => 'clients'],
            ['name' => 'Просмотр отзывов', 'slug' => 'view_reviews', 'group' => 'reviews'],
            ['name' => 'Управление отзывами', 'slug' => 'manage_reviews', 'group' => 'reviews'],
            ['name' => 'Просмотр отчётов', 'slug' => 'view_reports', 'group' => 'reports'],
            ['name' => 'Управление настройками', 'slug' => 'manage_settings', 'group' => 'settings'],
            ['name' => 'Управление пользователями', 'slug' => 'manage_users', 'group' => 'users'],
            ['name' => 'Управление ролями', 'slug' => 'manage_roles', 'group' => 'roles'],
        ];

        foreach ($permissions as $p) {
            DB::table('permissions')->insertOrIgnore(array_merge($p, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $ownerRole = DB::table('company_roles')->where('slug', 'owner')->whereNull('company_id')->first();
        if (!$ownerRole) {
            DB::table('company_roles')->insert([
                'company_id' => null,
                'name' => 'Владелец',
                'slug' => 'owner',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $ownerRoleId = DB::table('company_roles')->where('slug', 'owner')->whereNull('company_id')->value('id');

        $managerRole = DB::table('company_roles')->where('slug', 'manager')->whereNull('company_id')->first();
        if (!$managerRole) {
            DB::table('company_roles')->insert([
                'company_id' => null,
                'name' => 'Менеджер',
                'slug' => 'manager',
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $managerRoleId = DB::table('company_roles')->where('slug', 'manager')->whereNull('company_id')->value('id');

        $allPermissionIds = DB::table('permissions')->pluck('id');
        foreach ($allPermissionIds as $permId) {
            DB::table('company_role_permissions')->insertOrIgnore([
                'company_role_id' => $ownerRoleId,
                'permission_id' => $permId,
            ]);
        }

        $managerPermissions = ['view_dashboard', 'view_schedule', 'manage_schedule', 'view_clients', 'manage_clients', 'view_reviews', 'manage_reviews', 'view_reports'];
        $managerPermIds = DB::table('permissions')->whereIn('slug', $managerPermissions)->pluck('id');
        foreach ($managerPermIds as $permId) {
            DB::table('company_role_permissions')->insertOrIgnore([
                'company_role_id' => $managerRoleId,
                'permission_id' => $permId,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('company_role_permissions')->delete();
        DB::table('company_roles')->where('is_system', true)->delete();
        DB::table('permissions')->delete();
    }
};
