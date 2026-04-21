<?php

namespace App\Providers;

use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\BookingLocation;
use App\Models\UserProfile;
use App\Models\Company;
use App\Observers\AdvertisementEventObserver;
use App\Observers\BookingActivityObserver;
use App\Observers\BookingEventObserver;
use App\Observers\BookingLocationRouteObserver;
use App\Observers\BookingRouteObserver;
use App\Observers\UserProfileRouteObserver;
use App\Observers\BusinessEventObserver;
use App\Observers\CompanyObserver;
use App\Support\PasswordResetMailLocale;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        Sanctum::ignoreMigrations();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Sanctum::usePersonalAccessTokenModel(\App\Models\PersonalAccessToken::class);

        // Tymon\JWTAuth LaravelServiceProvider boots after Kernel and перерегистрирует
        // алиас 'jwt.auth' на свой Authenticate, из-за чего наш JwtAuthenticate
        // (с проверкой email_verified_at) переставал срабатывать на защищённых роутах.
        // Перебиваем алиас обратно после загрузки сторонних провайдеров.
        Route::aliasMiddleware('jwt.auth', \App\Http\Middleware\JwtAuthenticate::class);

        ResetPassword::createUrlUsing(function ($user, string $token) {
            $base = rtrim((string) config('app.frontend_url'), '/');

            return $base.'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);
        });

        ResetPassword::toMailUsing(function ($notifiable, string $token) {
            $resolveLocale = static function ($notifiable): string {
                // Язык страницы при сбросе пароля важнее профиля: пользователь сам выбрал язык формы
                if (app()->bound('password_reset_mail_locale')) {
                    $fromRequest = PasswordResetMailLocale::toMailLang(app('password_reset_mail_locale'));
                    if ($fromRequest !== null) {
                        return $fromRequest;
                    }
                }

                $fromUser = PasswordResetMailLocale::toMailLang($notifiable->locale ?? null);
                if ($fromUser !== null) {
                    return $fromUser;
                }

                return (string) config('app.locale');
            };

            $locale = $resolveLocale($notifiable);

            $base = rtrim((string) config('app.frontend_url'), '/');
            $url = $base.'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

            $expireMinutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire');
            $appName = (string) config('app.name');

            $data = [
                'appName' => $appName,
                'url' => $url,
                'expireMinutes' => $expireMinutes,
                'locale' => $locale,
            ];

            return (new MailMessage)
                ->subject(__('mail.reset_password.subject', ['app' => $appName], $locale))
                ->view([
                    'html' => 'mail.rexten.reset-password',
                    'text' => 'mail.rexten.reset-password-text',
                ], $data);
        });

        // Register observers for business events
        Company::observe(BusinessEventObserver::class);
        Company::observe(CompanyObserver::class);
        Booking::observe(BookingEventObserver::class);
        Booking::observe(BookingRouteObserver::class);
        Booking::observe(BookingActivityObserver::class);
        BookingLocation::observe(BookingLocationRouteObserver::class);
        UserProfile::observe(UserProfileRouteObserver::class);
        Advertisement::observe(AdvertisementEventObserver::class);
    }
}
