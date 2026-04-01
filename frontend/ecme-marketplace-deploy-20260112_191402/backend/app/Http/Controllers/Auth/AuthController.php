<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
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

        $user = User::create([
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        UserProfile::create([
            'user_id' => $user->id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'phone' => $request->phone,
        ]);

        // Генерируем access token (короткоживущий)
        $accessToken = JWTAuth::fromUser($user);
        
        // Генерируем refresh token (долгоживущий) с увеличенным TTL
        $refreshToken = JWTAuth::customClaims([
            'type' => 'refresh',
            'exp' => now()->addMinutes(config('jwt.refresh_ttl'))->timestamp,
        ])->fromUser($user);

        $userData = $user->load('profile');
        
        // Возвращаем access token в ответе, refresh token в httpOnly cookie
        $response = response()->json([
            'access_token' => $accessToken,
            'user' => [
                'id' => $userData->id,
                'email' => $userData->email,
                'role' => $userData->role,
                'name' => $userData->profile ? ($userData->profile->first_name . ' ' . $userData->profile->last_name) : null,
                'firstName' => $userData->profile->first_name ?? null,
                'lastName' => $userData->profile->last_name ?? null,
                'phone' => $userData->profile->phone ?? null,
                'avatar' => $userData->profile->avatar ?? null,
                'image' => $userData->profile->avatar ?? null,
            ],
        ], 201);
        
        // Устанавливаем refresh token в httpOnly cookie
        // Используем cookie() helper с явными параметрами
        return $response->cookie(
            'refresh_token',
            $refreshToken,
            config('jwt.refresh_ttl'), // Время жизни в минутах
            '/',
            config('cookie.domain'), // Domain из конфига
            config('cookie.secure'), // Secure flag из конфига
            true, // httpOnly = true (критично для безопасности)
            false, // raw = false (Laravel зашифрует через EncryptCookies middleware)
            config('cookie.same_site') // SameSite из конфига ('lax')
        );
    }

    /**
     * Login user.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
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

        // Генерируем access token (короткоживущий)
        $accessToken = $token;
        
        // Генерируем refresh token (долгоживущий) с увеличенным TTL
        $refreshToken = JWTAuth::customClaims([
            'type' => 'refresh',
            'exp' => now()->addMinutes(config('jwt.refresh_ttl'))->timestamp,
        ])->fromUser($user);

        $userData = $user->load('profile');
        
        // Возвращаем access token в ответе, refresh token в httpOnly cookie
        $response = response()->json([
            'access_token' => $accessToken,
            'user' => [
                'id' => $userData->id,
                'email' => $userData->email,
                'role' => $userData->role,
                'name' => $userData->profile ? ($userData->profile->first_name . ' ' . $userData->profile->last_name) : null,
                'firstName' => $userData->profile->first_name ?? null,
                'lastName' => $userData->profile->last_name ?? null,
                'phone' => $userData->profile->phone ?? null,
                'avatar' => $userData->profile->avatar ?? null,
                'image' => $userData->profile->avatar ?? null,
            ],
        ]);
        
        // Устанавливаем refresh token в httpOnly cookie
        return $response->cookie(
            'refresh_token',
            $refreshToken,
            config('jwt.refresh_ttl'), // Время жизни в минутах
            '/',
            config('cookie.domain'), // Domain из конфига
            config('cookie.secure'), // Secure flag из конфига
            true, // httpOnly = true (критично для безопасности)
            false, // raw = false (Laravel зашифрует через EncryptCookies middleware)
            config('cookie.same_site') // SameSite из конфига ('lax')
        );
    }

    /**
     * Get authenticated user.
     */
    public function me()
    {
        $user = auth('api')->user()->load('profile');
        $userData = $user;

        // Формируем относительный путь для аватара (фронтенд сам добавит правильный базовый URL)
        $avatarUrl = null;
        if ($userData->profile && $userData->profile->avatar) {
            // Возвращаем относительный путь, чтобы фронтенд мог использовать правильный базовый URL
            $avatarPath = \Illuminate\Support\Facades\Storage::disk('public')->url($userData->profile->avatar);
            // Если это уже полный URL, извлекаем только путь
            if (str_starts_with($avatarPath, 'http://') || str_starts_with($avatarPath, 'https://')) {
                $parsedUrl = parse_url($avatarPath);
                $avatarUrl = $parsedUrl['path'] ?? $avatarPath;
            } else {
                // Это уже относительный путь
                $avatarUrl = $avatarPath;
            }
        }

        // Формируем имя пользователя из firstName и lastName
        $fullName = null;
        if ($userData->profile) {
            $firstName = trim($userData->profile->first_name ?? '');
            $lastName = trim($userData->profile->last_name ?? '');
            if ($firstName || $lastName) {
                $fullName = trim($firstName . ' ' . $lastName);
            }
        }

        return response()->json([
            'id' => $userData->id,
            'email' => $userData->email,
            'role' => $userData->role,
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
}

