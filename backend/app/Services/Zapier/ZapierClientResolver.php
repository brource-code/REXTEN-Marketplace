<?php

namespace App\Services\Zapier;

use App\Models\Booking;
use App\Models\User;
use App\Support\MarketplaceClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Resolves a CRM client (user_id role CLIENT) scoped to a single company. Never trust raw IDs from Zapier
 * without verifying company membership.
 */
class ZapierClientResolver
{
    public static function normalizePhone(?string $phone): string
    {
        return preg_replace('/\D+/', '', (string) $phone) ?? '';
    }

    public static function clientUserBelongsToCompany(int $companyId, int $userId): bool
    {
        if (! MarketplaceClient::isClientUserId($userId)) {
            return false;
        }

        if (DB::table('company_clients')
            ->where('company_id', $companyId)
            ->where('user_id', $userId)
            ->exists()) {
            return true;
        }

        return Booking::query()
            ->where('company_id', $companyId)
            ->withoutPendingPayment()
            ->where('user_id', $userId)
            ->exists();
    }

    /**
     * @return ?array{0: int, 1: User} [userId, user]
     */
    public static function findClientInCompany(
        int $companyId,
        ?int $clientId,
        ?string $email,
        ?string $phone
    ): ?array {
        if ($clientId) {
            if (! self::clientUserBelongsToCompany($companyId, $clientId)) {
                return null;
            }

            $user = User::query()->with('profile')->find($clientId);
            if (! $user) {
                return null;
            }

            return [$user->id, $user];
        }

        if ($email) {
            $emailNorm = self::normalizeEmail($email);
            if ($emailNorm) {
                $byEmail = self::findInCompanyByEmail($companyId, $emailNorm);
                if ($byEmail) {
                    return $byEmail;
                }
            }
        }

        if ($phone) {
            $norm = self::normalizePhone($phone);
            if ($norm !== '') {
                $u = self::findInCompanyByPhoneNormalized($companyId, $norm);
                if ($u) {
                    return [$u->id, $u];
                }
            }
        }

        return null;
    }

    public static function normalizeEmail(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $e = Str::lower(trim($raw));
        if ($e === '' || str_contains($e, '@local.local')) {
            return null;
        }

        return $e;
    }

    private static function findInCompanyByEmail(int $companyId, string $emailLower): ?array
    {
        $clientIds = self::clientUserIdsInCompany($companyId);
        if ($clientIds->isEmpty()) {
            return null;
        }

        $u = User::query()
            ->whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->whereRaw('LOWER(email) = ?', [$emailLower])
            ->with('profile')
            ->first();
        if (! $u) {
            return null;
        }
        if (str_contains((string) $u->email, '@local.local')) {
            return null;
        }

        return [$u->id, $u];
    }

    public static function phoneExistsInCompany(int $companyId, string $digits): bool
    {
        if ($digits === '') {
            return false;
        }

        return self::findInCompanyByPhoneNormalized($companyId, $digits) !== null;
    }

    private static function findInCompanyByPhoneNormalized(int $companyId, string $digits): ?User
    {
        $clientIds = self::clientUserIdsInCompany($companyId);
        if ($clientIds->isEmpty()) {
            return null;
        }

        $candidates = User::query()
            ->whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->with('profile')
            ->get();

        foreach ($candidates as $u) {
            $p = self::normalizePhone($u->profile?->phone ?? null);
            if ($p === '' && $u->email) {
                $p = self::normalizePhone($u->email);
            }
            if ($p === $digits) {
                return $u;
            }
        }

        return null;
    }

    public static function clientUserIdsInCompany(int $companyId)
    {
        $fromTable = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->pluck('user_id');

        $fromBookings = Booking::query()
            ->where('company_id', $companyId)
            ->withoutPendingPayment()
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        return $fromTable->merge($fromBookings)->unique()->values();
    }
}
