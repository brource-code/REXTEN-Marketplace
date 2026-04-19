<?php

namespace App\Http\Middleware;

use App\Models\ApiRequestLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogApiV1Request
{
    public function handle(Request $request, Closure $next): Response
    {
        $started = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        try {
            $user = $request->user('sanctum');
            $token = $user?->currentAccessToken();
            $companyId = $request->input('current_company_id');

            ApiRequestLog::create([
                'personal_access_token_id' => $token?->id,
                'company_id' => $companyId ? (int) $companyId : null,
                'method' => $request->method(),
                'path' => '/'.$request->path(),
                'status' => $response->getStatusCode(),
                'duration_ms' => (int) round((microtime(true) - $started) * 1000),
                'ip' => $request->ip(),
            ]);
        } catch (\Throwable) {
            // never break API response
        }

        return $response;
    }
}
