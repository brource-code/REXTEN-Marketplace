<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum token must include zapier abilities; company must be active.
 * Mode: read | write (write implies read for GET).
 */
class EnsureZapierToken
{
    public function handle(Request $request, Closure $next, string $mode = 'read'): Response
    {
        $user = $request->user('sanctum');
        if (! $user) {
            return response()->json([
                'error' => 'unauthenticated',
                'message' => 'Unauthorized',
            ], 401);
        }

        $token = $user->currentAccessToken();
        if (! $token) {
            return response()->json([
                'error' => 'invalid_token',
                'message' => 'Invalid or missing access token.',
            ], 401);
        }

        $canWrite = $user->tokenCan('zapier:write');
        $canRead = $user->tokenCan('zapier:read') || $canWrite;

        if ($mode === 'write' && ! $canWrite) {
            return response()->json([
                'error' => 'missing_ability',
                'message' => 'This token does not have Zapier write access.',
            ], 403);
        }

        if ($mode === 'read' && ! $canRead) {
            return response()->json([
                'error' => 'missing_ability',
                'message' => 'This token does not have Zapier read access.',
            ], 403);
        }

        $companyId = (int) ($request->get('current_company_id') ?? 0);
        if ($companyId <= 0) {
            return response()->json([
                'error' => 'invalid_token',
                'message' => 'API token is missing company scope.',
            ], 401);
        }

        $company = Company::query()->whereKey($companyId)->first();
        if (! $company) {
            return response()->json([
                'error' => 'company_not_found',
                'message' => 'Company not found.',
            ], 404);
        }

        if ($company->status !== 'active') {
            return response()->json([
                'error' => 'company_inactive',
                'message' => 'This workspace is not active.',
            ], 403);
        }

        return $next($request);
    }
}
