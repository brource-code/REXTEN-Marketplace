<?php

namespace App\Providers;

use App\Services\SubscriptionLimitService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/home';

    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('ai_route_assist_user', function (Request $request) {
            $user = $request->user();
            if ($user === null) {
                return Limit::perMinute(3)->by('ai_route_assist_ip:'.$request->ip());
            }

            return Limit::perMinute(3)->by('ai_route_assist_user:'.$user->id);
        });

        RateLimiter::for('ai_route_apply', function (Request $request) {
            $user = $request->user();
            if ($user === null) {
                return Limit::perMinute(10)->by('ai_route_apply_ip:'.$request->ip());
            }

            return Limit::perMinute(10)->by('ai_route_apply_user:'.$user->id);
        });

        RateLimiter::for('api_v1', function (Request $request) {
            $perMinute = (int) config('api.v1.per_minute', 60);
            $perDay = (int) config('api.v1.per_day', 5000);

            $plan = null;
            $companyId = (int) ($request->input('current_company_id') ?? 0);
            if ($companyId > 0) {
                $plan = SubscriptionLimitService::getPlanForCompany($companyId);
            }
            if ($plan) {
                $pm = $plan->getFeature('api_rate_limit_per_minute');
                $pd = $plan->getFeature('api_rate_limit_per_day');
                if ($pm !== null && $pm !== '') {
                    $perMinute = max(1, (int) $pm);
                }
                if ($pd !== null && $pd !== '') {
                    $perDay = max(1, (int) $pd);
                }
            }

            $token = $request->user('sanctum')?->currentAccessToken();
            if (! $token) {
                return Limit::perMinute($perMinute)->by('api_v1_ip:'.$request->ip());
            }

            return [
                Limit::perMinute($perMinute)->by('api_v1_token:'.$token->id),
                Limit::perDay($perDay)->by('api_v1_company:'.$companyId),
            ];
        });
    }
}

