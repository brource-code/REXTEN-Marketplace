<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Services\PlatformSettingsService;

class SettingsController extends Controller
{
    /**
     * Get public platform settings (for logo customization, no auth required).
     */
    public function getPublicSettings(Request $request)
    {
        try {
            $settings = $this->getSettingsRow();

            return response()->json([
                'success' => true,
                'data' => [
                    'logoText' => $settings->logo_text ?? 'REXTEN',
                    'logoColorLight' => $settings->logo_color_light ?? '#0F172A',
                    'logoColorDark' => $settings->logo_color_dark ?? '#FFFFFF',
                    'logoSize' => $settings->logo_size ?? 26,
                    'logoIconColorLight' => $settings->logo_icon_color_light ?? '#0ea5e9',
                    'logoIconColorDark' => $settings->logo_icon_color_dark ?? '#0ea5e9',
                    'maintenanceMode' => (bool) ($settings->maintenance_mode ?? false),
                    'registrationEnabled' => (bool) ($settings->registration_enabled ?? true),
                    'stripePaymentsEnabled' => (bool) ($settings->stripe_enabled ?? true),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get platform general settings.
     */
    public function getGeneral(Request $request)
    {
        try {
            $settings = $this->getSettingsRow();

            return response()->json([
                'success' => true,
                'data' => [
                    'siteName' => $settings->site_name,
                    'siteDescription' => $settings->site_description,
                    'contactEmail' => $settings->contact_email,
                    'contactPhone' => $settings->contact_phone,
                    'timezone' => $settings->timezone ?? 'America/Los_Angeles',
                    'currency' => $settings->currency ?? 'USD',
                    'defaultLanguage' => $settings->default_language ?? 'ru',
                    'companyName' => $settings->company_name,
                    'companyAddress' => $settings->company_address,
                    'companyTaxId' => $settings->company_tax_id,
                    'instagramUrl' => $settings->instagram_url,
                    'facebookUrl' => $settings->facebook_url,
                    'twitterUrl' => $settings->twitter_url,
                    'logoLight' => $settings->logo_light,
                    'logoDark' => $settings->logo_dark,
                    'logoIconLight' => $settings->logo_icon_light,
                    'logoIconDark' => $settings->logo_icon_dark,
                    'logoText' => $settings->logo_text ?? 'REXTEN',
                    'logoColorLight' => $settings->logo_color_light ?? '#0F172A',
                    'logoColorDark' => $settings->logo_color_dark ?? '#FFFFFF',
                    'logoSize' => $settings->logo_size ?? 26,
                    'logoIconColorLight' => $settings->logo_icon_color_light ?? '#0ea5e9',
                    'logoIconColorDark' => $settings->logo_icon_color_dark ?? '#0ea5e9',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update platform general settings.
     */
    public function updateGeneral(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'siteName' => 'sometimes|string|max:255',
                'siteDescription' => 'nullable|string',
                'contactEmail' => 'nullable|email|max:255',
                'contactPhone' => 'nullable|string|max:20',
                'timezone' => 'sometimes|string|max:64',
                'currency' => 'sometimes|string|max:8',
                'defaultLanguage' => 'sometimes|string|max:8',
                'companyName' => 'nullable|string|max:255',
                'companyAddress' => 'nullable|string|max:255',
                'companyTaxId' => 'nullable|string|max:64',
                'instagramUrl' => 'nullable|url|max:255',
                'facebookUrl' => 'nullable|url|max:255',
                'twitterUrl' => 'nullable|url|max:255',
                'logoText' => 'sometimes|string|max:50',
                'logoColorLight' => 'sometimes|string|max:20',
                'logoColorDark' => 'sometimes|string|max:20',
                'logoSize' => 'sometimes|integer|min:12|max:48',
                'logoIconColorLight' => 'sometimes|string|max:20',
                'logoIconColorDark' => 'sometimes|string|max:20',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $settings = $this->getSettingsRow();
            $data = [
                'updated_at' => now(),
            ];

            $map = [
                'siteName' => 'site_name',
                'siteDescription' => 'site_description',
                'contactEmail' => 'contact_email',
                'contactPhone' => 'contact_phone',
                'timezone' => 'timezone',
                'currency' => 'currency',
                'defaultLanguage' => 'default_language',
                'companyName' => 'company_name',
                'companyAddress' => 'company_address',
                'companyTaxId' => 'company_tax_id',
                'instagramUrl' => 'instagram_url',
                'facebookUrl' => 'facebook_url',
                'twitterUrl' => 'twitter_url',
                'logoText' => 'logo_text',
                'logoColorLight' => 'logo_color_light',
                'logoColorDark' => 'logo_color_dark',
                'logoSize' => 'logo_size',
                'logoIconColorLight' => 'logo_icon_color_light',
                'logoIconColorDark' => 'logo_icon_color_dark',
            ];

            foreach ($map as $input => $column) {
                if ($request->has($input)) {
                    $data[$column] = $request->input($input);
                }
            }

            DB::table('platform_settings')->where('id', $settings->id)->update($data);
            PlatformSettingsService::forgetCache();

            return response()->json([
                'success' => true,
                'message' => 'Настройки успешно обновлены',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обновлении настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get integration settings (Stripe + technical logs).
     */
    public function getIntegrations(Request $request)
    {
        try {
            $settings = $this->getSettingsRow();

            return response()->json([
                'success' => true,
                'data' => [
                    'stripeEnabled' => (bool) ($settings->stripe_enabled ?? true),
                    'stripeConfigured' => !empty(config('services.stripe.secret')),
                    'stripePublicConfigured' => !empty(config('services.stripe.key')),
                    'stripeWebhookConfigured' => !empty(config('services.stripe.webhook_secret')),
                    'emailConfigured' => !empty(config('mail.mailers.smtp.host')),
                    'smsConfigured' => false,
                    'logChannels' => [
                        'default' => config('logging.default'),
                        'channels' => array_keys(config('logging.channels', [])),
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке интеграций',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update integration settings.
     */
    public function updateIntegrations(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'stripeEnabled' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $settings = $this->getSettingsRow();

            DB::table('platform_settings')
                ->where('id', $settings->id)
                ->update([
                    'stripe_enabled' => $request->boolean('stripeEnabled'),
                    'updated_at' => now(),
                ]);
            PlatformSettingsService::forgetCache();

            return response()->json([
                'success' => true,
                'message' => 'Интеграции успешно обновлены',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обновлении интеграций',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get subscription settings (decorative for now).
     */
    public function getSubscriptions(Request $request)
    {
        try {
            $settings = $this->getSettingsRow();
            $plansRaw = $settings->subscription_plans ? json_decode($settings->subscription_plans, true) : null;

            $defaultPlans = [
                [
                    'key' => 'starter',
                    'name' => 'Starter',
                    'price' => 0,
                    'currency' => 'USD',
                    'period' => 'month',
                    'features' => ['Профиль бизнеса', 'Базовые бронирования', 'Отзывы'],
                ],
                [
                    'key' => 'professional',
                    'name' => 'Professional',
                    'price' => 39,
                    'currency' => 'USD',
                    'period' => 'month',
                    'features' => ['Все из Starter', 'Расширенная аналитика', 'Реклама'],
                ],
                [
                    'key' => 'enterprise',
                    'name' => 'Enterprise',
                    'price' => 129,
                    'currency' => 'USD',
                    'period' => 'month',
                    'features' => ['Все из Professional', 'Приоритетная поддержка', 'Команда и роли'],
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'enabled' => (bool) ($settings->subscription_enabled ?? false),
                    'plans' => is_array($plansRaw) ? $plansRaw : $defaultPlans,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке подписок',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update subscription settings (still decorative).
     */
    public function updateSubscriptions(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'enabled' => 'required|boolean',
                'plans' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $settings = $this->getSettingsRow();

            DB::table('platform_settings')
                ->where('id', $settings->id)
                ->update([
                    'subscription_enabled' => $request->boolean('enabled'),
                    'subscription_plans' => $request->has('plans') ? json_encode($request->input('plans')) : $settings->subscription_plans,
                    'updated_at' => now(),
                ]);
            PlatformSettingsService::forgetCache();

            return response()->json([
                'success' => true,
                'message' => 'Подписки успешно обновлены',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обновлении подписок',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get system settings.
     */
    public function getSystem(Request $request)
    {
        try {
            $settings = $this->getSettingsRow();

            return response()->json([
                'success' => true,
                'data' => [
                    'maintenanceMode' => (bool) ($settings->maintenance_mode ?? false),
                    'registrationEnabled' => (bool) ($settings->registration_enabled ?? true),
                    'emailVerification' => (bool) ($settings->email_verification ?? true),
                    'smsVerification' => (bool) ($settings->sms_verification ?? false),
                    'twoFactorAuth' => (bool) ($settings->two_factor_auth ?? false),
                    'sessionTimeout' => (int) ($settings->session_timeout ?? 30),
                    'maxUploadSize' => (int) ($settings->max_upload_size ?? 10),
                    'cacheEnabled' => (bool) ($settings->cache_enabled ?? true),
                    'cacheDuration' => (int) ($settings->cache_duration ?? 60),
                    'logLevel' => $settings->log_level ?? 'info',
                    'apiRateLimit' => (int) ($settings->api_rate_limit ?? 100),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке системных настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update system settings.
     */
    public function updateSystem(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'maintenanceMode' => 'sometimes|boolean',
                'registrationEnabled' => 'sometimes|boolean',
                'emailVerification' => 'sometimes|boolean',
                'smsVerification' => 'sometimes|boolean',
                'twoFactorAuth' => 'sometimes|boolean',
                'sessionTimeout' => 'sometimes|integer|min:5|max:1440',
                'maxUploadSize' => 'sometimes|integer|min:1|max:100',
                'cacheEnabled' => 'sometimes|boolean',
                'cacheDuration' => 'sometimes|integer|min:1|max:1440',
                'logLevel' => 'sometimes|string|in:debug,info,warning,error,critical',
                'apiRateLimit' => 'sometimes|integer|min:10|max:10000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $settings = $this->getSettingsRow();
            $data = ['updated_at' => now()];

            $map = [
                'maintenanceMode' => 'maintenance_mode',
                'registrationEnabled' => 'registration_enabled',
                'emailVerification' => 'email_verification',
                'smsVerification' => 'sms_verification',
                'twoFactorAuth' => 'two_factor_auth',
                'sessionTimeout' => 'session_timeout',
                'maxUploadSize' => 'max_upload_size',
                'cacheEnabled' => 'cache_enabled',
                'cacheDuration' => 'cache_duration',
                'logLevel' => 'log_level',
                'apiRateLimit' => 'api_rate_limit',
            ];

            foreach ($map as $input => $column) {
                if ($request->has($input)) {
                    $data[$column] = $request->input($input);
                }
            }

            DB::table('platform_settings')->where('id', $settings->id)->update($data);
            PlatformSettingsService::forgetCache();

            return response()->json([
                'success' => true,
                'message' => 'Системные настройки успешно обновлены',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обновлении системных настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear Laravel cache from settings page.
     */
    public function clearCache(Request $request)
    {
        try {
            \Artisan::call('cache:clear');
            \Artisan::call('config:clear');

            return response()->json([
                'success' => true,
                'message' => 'Кэш очищен',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при очистке кэша',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload logo (light or dark version).
     */
    public function uploadLogo(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
                'type' => 'required|in:light,dark,iconLight,iconDark',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $type = $request->input('type');
            $file = $request->file('logo');
            $path = $file->store('logos', 'public');
            $url = Storage::disk('public')->url($path);

            $settings = $this->getSettingsRow();
            $columnName = match ($type) {
                'light' => 'logo_light',
                'dark' => 'logo_dark',
                'iconLight' => 'logo_icon_light',
                'iconDark' => 'logo_icon_dark',
            };

            $oldPath = $settings->$columnName;
            if ($oldPath && Storage::disk('public')->exists(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)))) {
                Storage::disk('public')->delete(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)));
            }

            DB::table('platform_settings')
                ->where('id', $settings->id)
                ->update([
                    $columnName => $url,
                    'updated_at' => now(),
                ]);
            PlatformSettingsService::forgetCache();

            return response()->json([
                'success' => true,
                'url' => $url,
                'path' => $path,
                'message' => 'Логотип успешно загружен',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке логотипа',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove logo.
     */
    public function removeLogo(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|in:light,dark,iconLight,iconDark',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $type = $request->input('type');
            $settings = DB::table('platform_settings')->first();

            if (!$settings) {
                return response()->json([
                    'success' => false,
                    'message' => 'Настройки не найдены',
                ], 404);
            }

            $columnName = match ($type) {
                'light' => 'logo_light',
                'dark' => 'logo_dark',
                'iconLight' => 'logo_icon_light',
                'iconDark' => 'logo_icon_dark',
            };

            $oldPath = $settings->$columnName;
            if ($oldPath && Storage::disk('public')->exists(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)))) {
                Storage::disk('public')->delete(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)));
            }

            DB::table('platform_settings')
                ->where('id', $settings->id)
                ->update([
                    $columnName => null,
                    'updated_at' => now(),
                ]);
            PlatformSettingsService::forgetCache();

            return response()->json([
                'success' => true,
                'message' => 'Логотип успешно удален',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при удалении логотипа',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function getSettingsRow()
    {
        $settings = DB::table('platform_settings')->first();

        if ($settings) {
            return $settings;
        }

        $id = DB::table('platform_settings')->insertGetId([
            'site_name' => 'Ecme Marketplace',
            'site_description' => 'Платформа для управления бизнесом',
            'timezone' => 'America/Los_Angeles',
            'currency' => 'USD',
            'default_language' => 'ru',
            'stripe_enabled' => true,
            'subscription_enabled' => false,
            'maintenance_mode' => false,
            'registration_enabled' => true,
            'email_verification' => true,
            'sms_verification' => false,
            'two_factor_auth' => false,
            'session_timeout' => 30,
            'max_upload_size' => 10,
            'cache_enabled' => true,
            'cache_duration' => 60,
            'log_level' => 'info',
            'api_rate_limit' => 100,
            'logo_text' => 'REXTEN',
            'logo_color_light' => '#0F172A',
            'logo_color_dark' => '#FFFFFF',
            'logo_size' => 26,
            'logo_icon_color_light' => '#0ea5e9',
            'logo_icon_color_dark' => '#0ea5e9',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('platform_settings')->where('id', $id)->first();
    }
}
