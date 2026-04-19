<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiV1ReadScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');
        if (! $user || ! $user->tokenCan('read')) {
            return response()->json([
                'error' => 'missing_ability',
                'message' => 'This token does not have read access.',
            ], 403);
        }

        return $next($request);
    }
}
