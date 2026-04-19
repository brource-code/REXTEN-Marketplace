<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\PersonalAccessToken;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ApiTokensController extends Controller
{
    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        $user = auth('api')->user();

        $tokens = PersonalAccessToken::query()
            ->where('tokenable_type', $user->getMorphClass())
            ->where('tokenable_id', $user->id)
            ->where('company_id', $companyId)
            ->orderByDesc('id')
            ->get(['id', 'name', 'token_prefix', 'abilities', 'last_used_at', 'expires_at', 'created_at']);

        return response()->json([
            'data' => $tokens->map(fn (PersonalAccessToken $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'prefix' => $t->token_prefix,
                'abilities' => $t->abilities,
                'last_used_at' => $t->last_used_at?->toIso8601String(),
                'expires_at' => $t->expires_at?->toIso8601String(),
                'created_at' => $t->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        $user = auth('api')->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'expires_in_days' => ['nullable', Rule::in([30, 90, 365, 'never'])],
        ]);

        $expiresAt = null;
        if (! empty($validated['expires_in_days']) && $validated['expires_in_days'] !== 'never') {
            $expiresAt = Carbon::now()->addDays((int) $validated['expires_in_days']);
        }

        $newAccessToken = $user->createToken($validated['name'], ['read'], $expiresAt);
        $plain = $newAccessToken->plainTextToken;
        $accessToken = $newAccessToken->accessToken;

        $secretPart = Str::contains($plain, '|') ? Str::after($plain, '|') : $plain;
        $prefix = 'rxt_'.Str::substr($secretPart, 0, 8);

        $accessToken->forceFill([
            'company_id' => $companyId,
            'token_prefix' => $prefix,
        ])->save();

        return response()->json([
            'token' => $plain,
            'meta' => [
                'id' => $accessToken->id,
                'name' => $accessToken->name,
                'prefix' => $prefix,
                'expires_at' => $accessToken->expires_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function destroy(Request $request, int $id)
    {
        $companyId = (int) $request->get('current_company_id');
        $user = auth('api')->user();

        $token = PersonalAccessToken::query()
            ->where('tokenable_type', $user->getMorphClass())
            ->where('tokenable_id', $user->id)
            ->where('company_id', $companyId)
            ->whereKey($id)
            ->firstOrFail();

        $token->delete();

        return response()->json(['success' => true]);
    }
}
