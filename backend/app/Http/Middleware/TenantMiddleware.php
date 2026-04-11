<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Логируем запросы к salary для отладки
        $path = $request->path();
        if (str_contains($path, 'salary')) {
            \Log::info('TenantMiddleware: salary request', [
                'path' => $path,
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ]);
        }

        $user = auth('api')->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        // Суперадмин: используем current_company_id из запроса, если передан
        if ($user->isSuperAdmin()) {
            $company = null;
            $companyId = $request->input('current_company_id') ?? $request->header('X-Company-Id');
            if ($companyId) {
                $company = Company::find($companyId);
                if ($company) {
                    $request->merge(['current_company_id' => $company->id]);
                }
            }

            return $this->withCompanyTimezone($request, $next, $company);
        }

        // Для владельцев бизнеса и staff - изоляция по company_id
        if ($user->isBusinessOwner()) {
            $companyIdFromRequest = $request->input('current_company_id') ?? $request->header('X-Company-Id');
            $company = null;

            // Если передан company_id, проверяем что у пользователя есть доступ (owner или staff)
            if ($companyIdFromRequest) {
                if ($user->hasAccessToCompany((int) $companyIdFromRequest)) {
                    $company = Company::find($companyIdFromRequest);
                }
            }
            // Иначе используем первую компанию: owned или staff
            if (! $company) {
                $company = $user->ownedCompanies()->first();
                if (! $company) {
                    $companyUser = $user->companyUsers()->where('is_active', true)->with('company')->first();
                    $company = $companyUser?->company;
                }
            }

            // Разрешаем запросы на создание/обновление профиля компании, даже если компании еще нет
            $isProfileUpdate = (str_contains($path, 'business/settings/profile') ||
                               str_contains($path, 'api/business/settings/profile')) &&
                              in_array($request->method(), ['PUT', 'POST'], true);

            if (! $company && ! $isProfileUpdate) {
                \Log::warning('TenantMiddleware: Company not found', [
                    'path' => $path,
                    'method' => $request->method(),
                    'user_id' => $user->id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Бизнес не найден',
                ], 404);
            }

            // Добавляем company_id в request для использования в контроллерах (если компания есть)
            if ($company) {
                $request->merge(['current_company_id' => $company->id]);
            }

            return $this->withCompanyTimezone($request, $next, $company);
        }

        return $next($request);
    }

    /**
     * Выполняет запрос с date_default_timezone_set на таймзону компании (если есть) и восстанавливает app.timezone после.
     */
    private function withCompanyTimezone(Request $request, Closure $next, ?Company $company): Response
    {
        $appTz = (string) config('app.timezone');
        if ($company) {
            $tz = $company->resolveTimezone();
            date_default_timezone_set($tz);
            $request->merge(['current_company_timezone' => $tz]);
        }
        try {
            return $next($request);
        } finally {
            date_default_timezone_set($appTz);
        }
    }
}
