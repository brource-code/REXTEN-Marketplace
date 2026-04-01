<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Company;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        // Суперадмин имеет доступ ко всем данным
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Для владельцев бизнеса - изоляция по company_id
        if ($user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();

            // Разрешаем запросы на создание/обновление профиля компании, даже если компании еще нет
            $path = $request->path();
            $isProfileUpdate = (str_contains($path, 'business/settings/profile') || 
                               str_contains($path, 'api/business/settings/profile')) && 
                              in_array($request->method(), ['PUT', 'POST']);
            
            if (!$company && !$isProfileUpdate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Бизнес не найден',
                ], 404);
            }

            // Добавляем company_id в request для использования в контроллерах (если компания есть)
            if ($company) {
                $request->merge(['current_company_id' => $company->id]);
            }
        }

        return $next($request);
    }
}

