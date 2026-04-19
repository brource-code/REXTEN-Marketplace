<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Permission "receive_notifications" — кому из staff приходят push/email/Telegram-уведомления компании.
 * По умолчанию выдаём системным ролям owner и manager.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('permissions')->insertOrIgnore([
            'name' => 'Получение уведомлений',
            'slug' => 'receive_notifications',
            'group' => 'notifications',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $permissionId = DB::table('permissions')->where('slug', 'receive_notifications')->value('id');
        if (! $permissionId) {
            return;
        }

        $systemRoleSlugs = ['owner', 'manager'];
        $systemRoleIds = DB::table('company_roles')
            ->whereIn('slug', $systemRoleSlugs)
            ->whereNull('company_id')
            ->pluck('id');

        foreach ($systemRoleIds as $roleId) {
            DB::table('company_role_permissions')->insertOrIgnore([
                'company_role_id' => $roleId,
                'permission_id' => $permissionId,
            ]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('slug', 'receive_notifications')->value('id');
        if ($permissionId) {
            DB::table('company_role_permissions')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
