<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth
     */
    public function redirect(Request $request)
    {
        // Сохраняем frontend URL в сессии для использования в callback
        $frontendUrl = $this->getFrontendUrl($request);
        $request->session()->put('oauth_frontend_url', $frontendUrl);
        
        // Сохраняем сессию явно
        $request->session()->save();
        
        // Динамически определяем redirect URI на основе текущего запроса
        $redirectUri = $this->getCallbackUrl($request);
        
        \Log::info('Google OAuth redirect', [
            'frontend_url' => $frontendUrl,
            'redirect_uri' => $redirectUri,
            'request_host' => $request->getHost(),
            'session_id' => $request->session()->getId(),
            'session_saved' => $request->session()->has('oauth_frontend_url'),
        ]);
        
        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirectUrl($redirectUri)
            ->stateless() // Отключаем проверку state (должно совпадать с callback)
            ->redirect();
    }
    
    /**
     * Получить callback URL для Google OAuth на основе текущего запроса
     */
    private function getCallbackUrl(Request $request)
    {
        // Для локальной разработки ВСЕГДА используем localhost:8000
        // Это должно совпадать с настройками в Google Cloud Console
        $callbackUrl = 'http://localhost:8000/api/auth/google/callback';
        
        \Log::info('Google OAuth callback URL', [
            'callback_url' => $callbackUrl,
            'request_host' => $request->getHost(),
            'request_port' => $request->getPort(),
        ]);
        
        return $callbackUrl;
    }
    
    /**
     * Проверить, является ли IP-адрес приватным
     */
    private function isPrivateIp($host)
    {
        // Проверяем, является ли host IP-адресом
        if (!filter_var($host, FILTER_VALIDATE_IP)) {
            return false;
        }
        
        // Проверяем, является ли IP приватным
        return !filter_var(
            $host,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }

    /**
     * Handle Google OAuth callback
     */
    public function callback(Request $request)
    {
        \Log::info('Google OAuth callback received', [
            'query' => $request->query(),
            'host' => $request->getHost(),
            'url' => $request->fullUrl(),
            'has_session' => $request->hasSession(),
            'session_id' => $request->hasSession() ? $request->session()->getId() : null,
            'session_has_oauth_url' => $request->hasSession() ? $request->session()->has('oauth_frontend_url') : false,
        ]);
        
        try {
            // Проверяем наличие ошибки от Google
            if ($request->has('error')) {
                \Log::error('Google OAuth error from callback: ' . $request->get('error'), [
                    'error_description' => $request->get('error_description'),
                    'query' => $request->query(),
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=' . urlencode($request->get('error')));
            }
            
            // Получаем пользователя от Google
            // ВАЖНО: используем тот же redirect URI, что и при redirect
            $redirectUri = $this->getCallbackUrl($request);
            
            // Используем stateless() для отключения проверки state
            // Это необходимо, т.к. сессия может быть потеряна между redirect и callback
            // (когда запрос идет на localhost, а сессия была создана с IP адреса)
            $googleUser = Socialite::driver('google')
                ->redirectUrl($redirectUri)
                ->stateless() // Отключаем проверку state (безопасно для локальной разработки)
                ->user();
            
            \Log::info('Google OAuth user received', [
                'email' => $googleUser->email,
                'id' => $googleUser->id,
            ]);
            
            // Проверяем, существует ли пользователь с таким email
            try {
                $user = User::where('email', $googleUser->email)->first();
                
                if ($user) {
                    \Log::info('Google OAuth: User exists', ['user_id' => $user->id]);
                    // Пользователь существует - обновляем google_id если его нет
                    if (!$user->google_id) {
                        $user->update([
                            'google_id' => $googleUser->id,
                            'provider' => 'google',
                        ]);
                    }
                    
                    // Обновляем аватар если он изменился
                    if ($googleUser->avatar && $user->profile) {
                        // Можно сохранить URL аватара или загрузить его
                        // Пока просто обновим, если нужно
                    }
                } else {
                    \Log::info('Google OAuth: Creating new user', ['email' => $googleUser->email]);
                    // Создаем нового пользователя
                    $nameParts = $this->parseName($googleUser->name);
                    
                    $user = User::create([
                        'email' => $googleUser->email,
                        'password' => Hash::make(Str::random(32)), // Случайный пароль, т.к. вход через Google
                        'role' => 'CLIENT', // По умолчанию CLIENT
                        'google_id' => $googleUser->id,
                        'provider' => 'google',
                        'is_active' => true,
                        'email_verified_at' => now(),
                    ]);
                    
                    // Создаем профиль пользователя
                    UserProfile::create([
                        'user_id' => $user->id,
                        'first_name' => $nameParts['first_name'],
                        'last_name' => $nameParts['last_name'],
                    ]);
                    \Log::info('Google OAuth: User created', ['user_id' => $user->id]);
                }
            } catch (\Exception $e) {
                \Log::error('Google OAuth: Error creating/updating user', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw $e; // Пробрасываем дальше для обработки в общем catch
            }
            
            // Проверяем, не заблокирован ли пользователь
            if ($user->is_blocked || !$user->is_active) {
                \Log::warning('Google OAuth: User blocked or inactive', ['user_id' => $user->id]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=blocked');
            }
            
            // Генерируем JWT токены
            try {
                \Log::info('Google OAuth: Generating tokens', ['user_id' => $user->id]);
                $accessToken = JWTAuth::fromUser($user);
                $refreshToken = JWTAuth::customClaims([
                    'type' => 'refresh',
                    'exp' => now()->addMinutes(config('jwt.refresh_ttl'))->timestamp,
                ])->fromUser($user);
                \Log::info('Google OAuth: Tokens generated', ['user_id' => $user->id]);
            } catch (\Exception $e) {
                \Log::error('Google OAuth: Error generating tokens', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw $e; // Пробрасываем дальше для обработки в общем catch
            }
            
            // Редиректим на фронтенд с токеном
            $frontendUrl = $this->getFrontendUrl($request);
            $redirectUrl = $frontendUrl . '/auth/google/callback?token=' . urlencode($accessToken);
            
            \Log::info('Google OAuth: Redirecting to frontend', [
                'frontend_url' => $frontendUrl,
                'redirect_url' => $redirectUrl,
            ]);
            
            $response = redirect($redirectUrl);
            
            // Устанавливаем refresh token в cookie
            return $response->cookie(
                'refresh_token',
                $refreshToken,
                config('jwt.refresh_ttl'),
                '/',
                config('cookie.domain', null),
                config('cookie.secure', false),
                true,
                false,
                config('cookie.same_site', 'lax')
            );
            
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage() ?: 'Unknown error';
            $errorClass = get_class($e);
            
            \Log::error('Google OAuth error', [
                'message' => $errorMessage,
                'class' => $errorClass,
                'code' => $e->getCode(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'query' => $request->query(),
                'host' => $request->getHost(),
                'url' => $request->fullUrl(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            $frontendUrl = $this->getFrontendUrl($request);
            
            // Если frontend URL не определен, используем дефолтный
            if (!$frontendUrl || $frontendUrl === 'http://localhost:3003') {
                // Пробуем получить из сессии
                if ($request->hasSession() && $request->session()->has('oauth_frontend_url')) {
                    $frontendUrl = $request->session()->get('oauth_frontend_url');
                } else {
                    // Используем дефолтный или из конфига
                    $frontendUrl = config('app.frontend_url', 'http://localhost:3003');
                }
            }
            
            return redirect($frontendUrl . '/sign-in?error=oauth_failed&message=' . urlencode($errorMessage));
        }
    }
    
    /**
     * Parse full name into first and last name
     */
    private function parseName($fullName)
    {
        $parts = explode(' ', trim($fullName), 2);
        return [
            'first_name' => $parts[0] ?? '',
            'last_name' => $parts[1] ?? '',
        ];
    }
    
    /**
     * Получить URL фронтенда из запроса или конфига
     * Определяет URL динамически на основе Referer, Origin заголовка или сессии
     */
    private function getFrontendUrl(Request $request)
    {
        // Сначала пробуем получить из сессии (сохранено перед редиректом на Google)
        if ($request->hasSession()) {
            $sessionId = $request->session()->getId();
            $hasOauthUrl = $request->session()->has('oauth_frontend_url');
            $allSessionKeys = $request->session()->all();
            
            \Log::info('Google OAuth: Checking session', [
                'session_id' => $sessionId,
                'has_oauth_frontend_url' => $hasOauthUrl,
                'session_keys' => array_keys($allSessionKeys),
            ]);
            
            if ($hasOauthUrl) {
                $frontendUrl = $request->session()->get('oauth_frontend_url');
                \Log::info('Google OAuth: Frontend URL from session', ['url' => $frontendUrl]);
                // НЕ удаляем из сессии сразу, может понадобиться в catch блоке
                return $frontendUrl;
            }
        }
        
        // Пробуем получить из Referer или Origin заголовка
        // ВАЖНО: игнорируем Referer от Google (accounts.google.com)
        $referer = $request->header('Referer');
        $origin = $request->header('Origin');
        
        \Log::info('Google OAuth: Frontend URL detection', [
            'has_session' => $request->hasSession(),
            'session_id' => $request->hasSession() ? $request->session()->getId() : null,
            'referer' => $referer,
            'origin' => $origin,
        ]);
        
        if ($referer) {
            try {
                $parsedUrl = parse_url($referer);
                // Игнорируем Referer от Google
                if (isset($parsedUrl['host']) && strpos($parsedUrl['host'], 'google.com') === false && strpos($parsedUrl['host'], 'googleusercontent.com') === false) {
                    if (isset($parsedUrl['scheme']) && isset($parsedUrl['host'])) {
                        $port = isset($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '';
                        $frontendUrl = $parsedUrl['scheme'] . '://' . $parsedUrl['host'] . $port;
                        \Log::info('Google OAuth: Frontend URL from referer', ['url' => $frontendUrl]);
                        return $frontendUrl;
                    }
                } else {
                    \Log::info('Google OAuth: Ignoring Google referer', ['referer' => $referer]);
                }
            } catch (\Exception $e) {
                \Log::warning('Google OAuth: Error parsing referer', ['error' => $e->getMessage()]);
            }
        }
        
        if ($origin) {
            // Также игнорируем Origin от Google
            if (strpos($origin, 'google.com') === false && strpos($origin, 'googleusercontent.com') === false) {
                \Log::info('Google OAuth: Frontend URL from origin', ['url' => $origin]);
                return $origin;
            } else {
                \Log::info('Google OAuth: Ignoring Google origin', ['origin' => $origin]);
            }
        }
        
        // Если не удалось определить из заголовков, используем конфиг
        $defaultUrl = config('app.frontend_url', 'http://localhost:3003');
        \Log::info('Google OAuth: Frontend URL from config', ['url' => $defaultUrl]);
        return $defaultUrl;
    }
}

