<?php

namespace App\Support;

use App\Models\User;

/**
 * Маркетплейс-клиент: роль CLIENT.
 *
 * Используется чтобы:
 * - не слать клиентские in-app/email на аккаунты владельцев/админов;
 * - не хранить на брони user_id не-клиента (иначе утечки в inbox и ЛК).
 */
final class MarketplaceClient
{
    public static function isClientUserId(?int $userId): bool
    {
        if ($userId === null || $userId <= 0) {
            return false;
        }

        $user = User::query()->select('id', 'role')->find($userId);

        return $user && $user->role === 'CLIENT';
    }
}
