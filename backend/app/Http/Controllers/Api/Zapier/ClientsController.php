<?php

namespace App\Http\Controllers\Api\Zapier;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Zapier\ZapierClientResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ClientsController extends Controller
{
    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');

        $validated = $request->validate([
            'since_id' => 'sometimes|integer|min:0',
            'since_created_at' => 'sometimes|date',
            'limit' => 'sometimes|integer|min:1|max:'.(int) config('api.zapier.max_limit', 100),
        ]);

        $limit = (int) ($validated['limit'] ?? 50);
        $limit = min($limit, (int) config('api.zapier.max_limit', 100));

        $clientIds = ZapierClientResolver::clientUserIdsInCompany($companyId);
        if ($clientIds->isEmpty()) {
            return response()->json([]);
        }

        $query = User::query()
            ->whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->with('profile')
            ->orderBy('id', 'asc');

        if (! empty($validated['since_id'])) {
            $query->where('id', '>', (int) $validated['since_id']);
        }
        if (! empty($validated['since_created_at'])) {
            $query->where('created_at', '>', $validated['since_created_at']);
        }

        $users = $query->limit($limit)->get();

        $out = $users->map(function (User $u) {
            $email = $u->email;
            if (str_contains((string) $email, '@local.local')) {
                $email = null;
            }

            $name = $u->profile
                ? trim(($u->profile->first_name ?? '').' '.($u->profile->last_name ?? ''))
                : null;

            return [
                'id' => $u->id,
                'created_at' => $u->created_at?->utc()->toIso8601String(),
                'first_name' => $this->stringOrNull($u->profile?->first_name),
                'last_name' => $this->stringOrNull($u->profile?->last_name),
                'name' => $name !== null && $name !== '' ? $name : 'N/A',
                'email' => $this->stringOrNull($email),
                'phone' => $this->stringOrNull($u->profile?->phone),
                'address' => $this->stringOrNull($u->profile?->address),
            ];
        });

        return response()->json($out->values()->all());
    }

    public function store(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:40',
            'address' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:2000',
        ]);

        $emailNorm = ZapierClientResolver::normalizeEmail($validated['email'] ?? null);
        $phoneNorm = ZapierClientResolver::normalizePhone($validated['phone'] ?? null);

        if ($this->hasDuplicateInCompany($companyId, $emailNorm, $phoneNorm)) {
            return response()->json([
                'error' => 'duplicate_client',
                'message' => 'A client with this email or phone already exists for this company.',
            ], 409);
        }

        $requestedEmail = $emailNorm;
        $email = $requestedEmail;
        if (! empty($email)) {
            if (User::query()->where('email', $email)->exists()) {
                do {
                    $email = 'client_'.$companyId.'_'.time().'_'.uniqid('', true).'@local.local';
                } while (User::query()->where('email', $email)->exists());
            }
        } else {
            do {
                $email = 'client_'.$companyId.'_'.time().'_'.uniqid('', true).'@local.local';
            } while (User::query()->where('email', $email)->exists());
        }

        $user = null;
        try {
            $user = User::create([
                'email' => $email,
                'password' => Hash::make(Str::random(32)),
                'role' => 'CLIENT',
                'is_active' => true,
                'client_status' => 'regular',
            ]);
            $user->profile()->create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'] ?? '',
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
            ]);
            DB::table('company_clients')->insertOrIgnore([
                'company_id' => $companyId,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            if ($user) {
                $user->forceDelete();
            }

            return response()->json([
                'error' => 'create_failed',
                'message' => 'Could not create client.',
            ], 422);
        }

        if (! empty($validated['notes']) && Schema::hasTable('client_notes')) {
            DB::table('client_notes')->insert([
                'client_id' => $user->id,
                'company_id' => $companyId,
                'note' => $validated['notes'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $user->load('profile');
        $emailOut = $user->email;
        if (str_contains((string) $emailOut, '@local.local')) {
            $emailOut = $emailNorm;
        }

        return response()->json([
            'id' => $user->id,
            'created_at' => $user->created_at?->utc()->toIso8601String(),
            'first_name' => $user->profile?->first_name,
            'last_name' => $user->profile?->last_name,
            'email' => $this->stringOrNull($emailOut),
            'phone' => $this->stringOrNull($user->profile?->phone),
            'address' => $this->stringOrNull($user->profile?->address),
        ], 201);
    }

    private function hasDuplicateInCompany(int $companyId, ?string $emailLower, string $phoneDigits): bool
    {
        if ($emailLower) {
            $q = User::query()
                ->whereIn('id', ZapierClientResolver::clientUserIdsInCompany($companyId))
                ->where('role', 'CLIENT')
                ->whereRaw('LOWER(email) = ?', [Str::lower($emailLower)]);
            if ($q->exists()) {
                return true;
            }
        }
        if ($phoneDigits === '') {
            return false;
        }
        if (ZapierClientResolver::phoneExistsInCompany($companyId, $phoneDigits)) {
            return true;
        }

        return false;
    }

    private function stringOrNull(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}
