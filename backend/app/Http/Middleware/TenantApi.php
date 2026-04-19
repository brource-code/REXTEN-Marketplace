<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantApi
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');
        if (! $user) {
            return response()->json([
                'error' => 'unauthenticated',
                'message' => 'Unauthorized',
            ], 401);
        }

        $token = $user->currentAccessToken();
        if (! $token || ! $token->company_id) {
            return response()->json([
                'error' => 'invalid_token',
                'message' => 'API token is missing company scope.',
            ], 401);
        }

        $companyId = (int) $token->company_id;
        if (! $user->hasAccessToCompany($companyId) && ! $user->isSuperAdmin()) {
            return response()->json([
                'error' => 'forbidden',
                'message' => 'You no longer have access to this workspace.',
            ], 403);
        }

        $company = Company::find($companyId);
        if (! $company) {
            return response()->json([
                'error' => 'company_not_found',
                'message' => 'Company not found.',
            ], 401);
        }

        $request->merge(['current_company_id' => $companyId]);

        $appTz = (string) config('app.timezone');
        $tz = $company->resolveTimezone();
        date_default_timezone_set($tz);
        $request->merge(['current_company_timezone' => $tz]);

        try {
            return $next($request);
        } finally {
            date_default_timezone_set($appTz);
        }
    }
}
