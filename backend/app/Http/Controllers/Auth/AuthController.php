<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\IssuesAuthTokens;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPresenceSession;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Services\ActivityService;
use App\Services\EmailOtpService;
use App\Services\PlatformSettingsService;
use App\Support\PasswordResetMailLocale;

class AuthController extends Controller
{
    use IssuesAuthTokens;

    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        if (! PlatformSettingsService::isRegistrationEnabled()) {
            return response()->json([
                'success' => false,
                'code' => 'registration_disabled',
                'message' => 'Регистрация новых пользователей временно отключена администратором.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email,NULL,id,deleted_at,NULL', // Проверяем уникальность только среди неудаленных пользователей
            ],
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:CLIENT,BUSINESS_OWNER',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'locale' => 'nullable|string|in:en,ru,es-MX,hy-AM,uk-UA',
        ], [
            'email.unique' => 'Пользователь с таким email уже зарегистрирован',
            'email.email' => 'Введите корректный email адрес',
            'email.required' => 'Email обязателен для заполнения',
            'password.required' => 'Пароль обязателен для заполнения',
            'password.min' => 'Пароль должен быть не менее 8 символов',
            'password.confirmed' => 'Пароли не совпадают',
            'role.required' => 'Роль обязательна для заполнения',
            'role.in' => 'Неверная роль пользователя',
            'first_name.required' => 'Имя обязательно для заполнения',
            'last_name.required' => 'Фамилия обязательна для заполнения',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $verifyRequired = PlatformSettingsService::isEmailVerificationRequired();

        $uiLocale = PasswordResetMailLocale::normalizeUiLocale($request->input('locale'));

        $user = User::create([
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'locale' => $uiLocale,
            'email_verified_at' => $verifyRequired ? null : now(),
        ]);

        UserProfile::create([
            'user_id' => $user->id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'phone' => $request->phone,
        ]);

        try {
            ActivityService::logRegister($user->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Register activity: '.$e->getMessage());
        }

        if ($verifyRequired) {
            $otpResult = app(EmailOtpService::class)->issueAndSend($user, $request->input('locale'));
            $userData = $user->load('profile');
            $avatarPublic = $this->publicAvatarPathFromProfile($userData->profile);

            return response()->json([
                'requires_email_verification' => true,
                'code_sent' => (bool) ($otpResult['sent'] ?? false),
                'email' => $userData->email,
                'email_verified_at' => null,
                'user' => [
                    'id' => $userData->id,
                    'email' => $userData->email,
                    'role' => $userData->role,
                    'locale' => $userData->locale,
                    'name' => $userData->profile ? ($userData->profile->first_name.' '.$userData->profile->last_name) : null,
                    'firstName' => $userData->profile->first_name ?? null,
                    'lastName' => $userData->profile->last_name ?? null,
                    'phone' => $userData->profile->phone ?? null,
                    'avatar' => $avatarPublic,
                    'image' => $avatarPublic,
                ],
            ], 201);
        }

        return $this->tokenJsonResponse($user->fresh()->load('profile'))->setStatusCode(201);
    }

    /**
     * Login user.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
            'locale' => 'nullable|string|in:en,ru,es-MX,hy-AM,uk-UA',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json([
                'message' => 'Неверный email или пароль',
            ], 401);
        }

        $user = auth('api')->user();

        if (! $user->isSuperAdmin()
            && PlatformSettingsService::isEmailVerificationRequired()
            && ! $user->email_verified_at) {
            try {
                JWTAuth::invalidate($token);
            } catch (\Exception $e) {
                // ignore
            }

            $otpResult = app(EmailOtpService::class)->issueAndSend($user, $request->input('locale'));

            return response()->json([
                'success' => false,
                'code' => 'email_not_verified',
                'message' => 'Аккаунт не активирован. Введите 6-значный код из письма на странице подтверждения.',
                'email' => $user->email,
                'user_id' => $user->id,
                'code_sent' => (bool) ($otpResult['sent'] ?? false),
            ], 403);
        }

        // Проверяем блокировку
        if ($user->is_blocked) {
            // Инвалидируем токен, если пользователь заблокирован
            try {
                JWTAuth::invalidate($token);
            } catch (\Exception $e) {
                // Игнорируем ошибки инвалидации токена
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Ваш аккаунт заблокирован. Обратитесь к администратору для получения дополнительной информации.',
                'is_blocked' => true, // Явный флаг для фронтенда
            ], 403);
        }

        // Проверяем активность
        if (!$user->is_active) {
            // Инвалидируем токен, если пользователь неактивен
            try {
                JWTAuth::invalidate($token);
            } catch (\Exception $e) {
                // Игнорируем ошибки инвалидации токена
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Ваш аккаунт неактивен. Обратитесь к администратору.',
                'is_blocked' => true, // Неактивный = заблокирован для фронтенда
            ], 403);
        }

        try {
            $user->last_login_at = now();
            $user->saveQuietly();
            ActivityService::logLogin($user->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Login activity/log failed: '.$e->getMessage());
        }

        return $this->tokenJsonResponse($user->load('profile'), $token);
    }

    /**
     * Get authenticated user.
     */
    public function me()
    {
        $user = auth('api')->user()->load('profile');
        $userData = $user;

        $avatarUrl = $this->publicAvatarPathFromProfile($userData->profile);

        // Формируем имя пользователя из firstName и lastName
        $fullName = null;
        if ($userData->profile) {
            $firstName = trim($userData->profile->first_name ?? '');
            $lastName = trim($userData->profile->last_name ?? '');
            if ($firstName || $lastName) {
                $fullName = trim($firstName . ' ' . $lastName);
            }
        }

        // Получаем информацию о компаниях и правах
        $companies = [];
        $currentCompanyPermissions = [];
        
        // Компании, которыми владеет пользователь
        $ownedCompanies = $user->ownedCompanies()->select('id', 'name', 'slug')->get();
        foreach ($ownedCompanies as $company) {
            $companies[] = [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'is_owner' => true,
            ];
        }
        
        // Компании, где пользователь является staff
        $staffCompanies = $user->companyUsers()
            ->where('is_active', true)
            ->with('company:id,name,slug', 'role.permissions')
            ->get();
        foreach ($staffCompanies as $companyUser) {
            if ($companyUser->company && !$ownedCompanies->contains('id', $companyUser->company->id)) {
                $companies[] = [
                    'id' => $companyUser->company->id,
                    'name' => $companyUser->company->name,
                    'slug' => $companyUser->company->slug,
                    'is_owner' => false,
                    'role' => $companyUser->role ? [
                        'id' => $companyUser->role->id,
                        'name' => $companyUser->role->name,
                        'slug' => $companyUser->role->slug,
                    ] : null,
                ];
            }
        }
        
        // Если есть компании, получаем permissions для первой (или текущей)
        if (count($companies) > 0) {
            $currentCompanyId = $companies[0]['id'];
            $currentCompanyPermissions = $user->getPermissionsInCompany($currentCompanyId);
        }

        return response()->json([
            'id' => $userData->id,
            'email' => $userData->email,
            'role' => $userData->role,
            'locale' => $userData->locale,
            'email_verified_at' => $userData->email_verified_at?->toIso8601String(),
            'name' => $fullName,
            'firstName' => $userData->profile->first_name ?? null,
            'lastName' => $userData->profile->last_name ?? null,
            'phone' => $userData->profile->phone ?? null,
            'avatar' => $avatarUrl,
            'image' => $avatarUrl,
            'address' => $userData->profile->address ?? null,
            'city' => $userData->profile->city ?? null,
            'state' => $userData->profile->state ?? null,
            'zipCode' => $userData->profile->zip_code ?? null,
            'companies' => $companies,
            'permissions' => $currentCompanyPermissions,
        ]);
    }

    /**
     * Refresh token.
     * Получает refresh token из httpOnly cookie и обновляет access token.
     */
    public function refresh(Request $request)
    {
        try {
            // Получаем refresh token из cookie
            $refreshToken = $request->cookie('refresh_token');
            
            if (!$refreshToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Refresh token не найден',
                ], 401);
            }

            // Устанавливаем refresh token для проверки
            $token = JWTAuth::setToken($refreshToken);
            
            // Проверяем, что это действительно refresh token
            $payload = JWTAuth::getPayload($token);
            if ($payload->get('type') !== 'refresh') {
                return response()->json([
                    'success' => false,
                    'message' => 'Неверный тип токена',
                ], 401);
            }

            // Генерируем новый access token
            $user = JWTAuth::authenticate($token);
            $newAccessToken = JWTAuth::fromUser($user);
            
            // Генерируем новый refresh token
            $newRefreshToken = JWTAuth::customClaims([
                'type' => 'refresh',
                'exp' => now()->addMinutes(config('jwt.refresh_ttl'))->timestamp,
            ])->fromUser($user);

            // Инвалидируем старый refresh token
            try {
                JWTAuth::invalidate($token);
            } catch (\Exception $e) {
                // Игнорируем ошибки инвалидации
            }

            $response = response()->json([
                'success' => true,
                'access_token' => $newAccessToken,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
            ]);
            
            // Устанавливаем новый refresh token в httpOnly cookie
            return $response->cookie(
                'refresh_token',
                $newRefreshToken,
                config('jwt.refresh_ttl'),
                '/',
                config('cookie.domain'),
                config('cookie.secure'),
                true, // httpOnly = true (критично для безопасности)
                false, // raw = false (Laravel зашифрует)
                config('cookie.same_site')
            );
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Refresh token истек',
            ], 401);
        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Неверный refresh token',
            ], 401);
        } catch (\Exception $e) {
            \Log::error('Refresh token error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Не удалось обновить токен',
            ], 401);
        }
    }

    /**
     * Logout user.
     * Инвалидирует access token и удаляет refresh token cookie.
     */
    public function logout(Request $request)
    {
        try {
            $u = auth('api')->user();
            if ($u) {
                try {
                    ActivityService::logLogout($u);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Logout activity: '.$e->getMessage());
                }
                // Сразу снимаем с «онлайн», иначе запись жила бы до истечения порога last_seen
                try {
                    UserPresenceSession::query()->where('user_id', $u->id)->delete();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Presence cleanup on logout: '.$e->getMessage());
                }
            }
            // Инвалидируем access token из заголовка
            $token = JWTAuth::getToken();
            if ($token) {
                JWTAuth::invalidate($token);
            }
            
            // Инвалидируем refresh token из cookie
            $refreshToken = $request->cookie('refresh_token');
            if ($refreshToken) {
                try {
                    JWTAuth::setToken($refreshToken)->invalidate();
                } catch (\Exception $e) {
                    // Игнорируем ошибки инвалидации refresh token
                }
            }
        } catch (\Tymon\JWTAuth\Exceptions\TokenBlacklistedException $e) {
            // Token already blacklisted, ignore
        } catch (\Tymon\JWTAuth\Exceptions\JWTException $e) {
            // Token invalid or not found, ignore
        } catch (\Exception $e) {
            // Any other exception, log but don't fail
            \Log::warning('Logout error: ' . $e->getMessage());
        }

        // Удаляем refresh token cookie
        $response = response()->json([
            'success' => true,
            'message' => 'Успешный выход',
        ]);
        
        return $response->cookie(
            'refresh_token',
            '',
            -1, // Удаляем cookie (прошедшая дата)
            '/',
            config('cookie.domain'),
            config('cookie.secure'),
            true, // httpOnly = true
            false,
            config('cookie.same_site')
        );
    }

    /**
     * Отправка ссылки сброса пароля на email (публичный API).
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
            'locale' => 'nullable|string|max:32',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('email');
        $localeHint = PasswordResetMailLocale::toMailLang($request->input('locale'));

        if ($localeHint !== null) {
            app()->instance('password_reset_mail_locale', $localeHint);
        }

        try {
            Password::sendResetLink(['email' => $email]);
        } finally {
            if (app()->bound('password_reset_mail_locale')) {
                app()->forgetInstance('password_reset_mail_locale');
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'If an account exists for this email, we have sent password reset instructions.',
        ], 200);
    }

    /**
     * Установка нового пароля по токену из письма (публичный API).
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'message' => 'Your password has been reset.',
            ], 200);
        }

        $message = match ($status) {
            Password::INVALID_TOKEN => 'This password reset link is invalid or has expired.',
            Password::INVALID_USER => 'We could not find a user with that email address.',
            default => 'Unable to reset password. Please try again.',
        };

        return response()->json([
            'success' => false,
            'message' => $message,
            'code' => $status,
        ], 422);
    }
}

