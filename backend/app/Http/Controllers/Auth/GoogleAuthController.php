<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\IssuesAuthTokens;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Models\UserProfile;
use App\Constants\UsTimezones;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Socialite\Facades\Socialite;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Str;
use App\Services\ActivityService;
use App\Services\PlatformSettingsService;

class GoogleAuthController extends Controller
{
    use IssuesAuthTokens;

    private const GOOGLE_SIGNUP_PURPOSE = 'google_signup_completion';

    /**
     * Pending Google sign-up хранится в БД (не в Cache), чтобы запись переживала
     * следующий HTTP-запрос и была видна всем инстансам API за балансировщиком.
     */
    private function putGoogleSignupPending(string $rawToken, array $payload): void
    {
        $tokenHash = hash('sha256', $rawToken);
        DB::table('oauth_google_pending_signups')->where('token_hash', $tokenHash)->delete();
        DB::table('oauth_google_pending_signups')->insert([
            'token_hash' => $tokenHash,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function getGoogleSignupPendingPayload(string $rawToken): ?array
    {
        $row = DB::table('oauth_google_pending_signups')
            ->where('token_hash', hash('sha256', $rawToken))
            ->where('expires_at', '>', now())
            ->first();

        if ($row === null) {
            return null;
        }

        $decoded = json_decode($row->payload, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function forgetGoogleSignupPending(string $rawToken): void
    {
        DB::table('oauth_google_pending_signups')->where('token_hash', hash('sha256', $rawToken))->delete();
    }

    /**
     * Redirect to Google OAuth
     */
    public function redirect(Request $request)
    {
        // Сохраняем frontend URL в сессии для использования в callback
        $frontendUrl = $this->getFrontendUrl($request);
        $request->session()->put('oauth_frontend_url', $frontendUrl);
        $request->session()->put(
            'oauth_locale',
            $request->getPreferredLanguage() ?: (string) config('app.locale', 'en'),
        );

        // Сохраняем сессию явно
        $request->session()->save();
        
        // ПРИНУДИТЕЛЬНО: для production всегда используем значение из конфига
        $appEnv = config('app.env');
        if ($appEnv === 'production') {
            // Для production ВСЕГДА используем production URL
            $redirectUri = 'https://api.rexten.live/api/auth/google/callback';
            // Переопределяем конфиг напрямую, чтобы Socialite использовал правильный URL
            Config::set('services.google.redirect', $redirectUri);
        } else {
            // Для локальной разработки определяем динамически
            $redirectUri = $this->getCallbackUrl($request);
        }
        
        \Log::info('Google OAuth redirect', [
            'frontend_url' => $frontendUrl,
            'redirect_uri' => $redirectUri,
            'request_host' => $request->getHost(),
            'app_env' => $appEnv,
            'config_redirect_before' => config('services.google.redirect'),
            'config_redirect_after' => Config::get('services.google.redirect'),
            'session_id' => $request->session()->getId(),
            'session_saved' => $request->session()->has('oauth_frontend_url'),
        ]);
        
        // Принудительно устанавливаем redirect URL
        // ВАЖНО: используем тот же URL, что и в Google Cloud Console
        // ВАЖНО: НЕ используем stateless() - это небезопасно и может привести к авторизации под чужим аккаунтом
        // Вместо этого используем обычную проверку state через сессию
        $socialite = Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirectUrl($redirectUri);
        
        return $socialite->redirect();
    }
    
    /**
     * Получить callback URL для Google OAuth на основе текущего запроса
     */
    private function getCallbackUrl(Request $request)
    {
        // Этот метод вызывается ТОЛЬКО для локальной разработки
        // Для production используется прямой URL в методе redirect()
        $host = $request->getHost();
        if ($host === 'localhost' || $host === '127.0.0.1' || $this->isPrivateIp($host)) {
            $callbackUrl = 'http://localhost:8000/api/auth/google/callback';
        } else {
            // Для других случаев используем домен из запроса
            $scheme = $request->getScheme();
            $port = $request->getPort();
            $portStr = ($port && $port != 80 && $port != 443) ? ':' . $port : '';
            $callbackUrl = $scheme . '://' . $host . $portStr . '/api/auth/google/callback';
        }
        
        \Log::info('Google OAuth callback URL (local/dev)', [
            'callback_url' => $callbackUrl,
            'request_host' => $host,
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
            $appEnv = config('app.env');
            if ($appEnv === 'production') {
                // Для production ВСЕГДА используем production URL
                $redirectUri = 'https://api.rexten.live/api/auth/google/callback';
                Config::set('services.google.redirect', $redirectUri);
            } else {
                $redirectUri = $this->getCallbackUrl($request);
            }
            
            \Log::info('Google OAuth callback - using redirect URI', [
                'redirect_uri' => $redirectUri,
                'app_env' => $appEnv,
                'has_state' => $request->has('state'),
                'state_value' => $request->get('state'),
            ]);
            
            // ВАЖНО: НЕ используем stateless() - это небезопасно!
            // stateless() отключает проверку state параметра, что может привести к:
            // 1. CSRF атакам
            // 2. Авторизации под чужим аккаунтом, если callback URL перехвачен
            // Используем обычную проверку state через сессию для безопасности
            try {
                $googleUser = Socialite::driver('google')
                    ->redirectUrl($redirectUri)
                    ->user();
            } catch (\Exception $e) {
                // Если проверка state не прошла из-за проблем с сессией,
                // пробуем использовать stateless() только как fallback для локальной разработки
                if ($appEnv !== 'production' && strpos($e->getMessage(), 'state') !== false) {
                    \Log::warning('Google OAuth: State check failed, using stateless fallback (local dev only)', [
                        'error' => $e->getMessage(),
                    ]);
                    $googleUser = Socialite::driver('google')
                        ->redirectUrl($redirectUri)
                        ->stateless()
                        ->user();
                } else {
                    throw $e;
                }
            }
            
            // ВАЛИДАЦИЯ: Проверяем, что Google вернул все необходимые данные
            if (empty($googleUser->id)) {
                \Log::error('Google OAuth: Missing google_id from Google', [
                    'google_user_data' => [
                        'email' => $googleUser->email ?? 'null',
                        'id' => $googleUser->id ?? 'null',
                        'name' => $googleUser->name ?? 'null',
                    ],
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=missing_google_id');
            }
            
            if (empty($googleUser->email)) {
                \Log::error('Google OAuth: Missing email from Google', [
                    'google_id' => $googleUser->id,
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=missing_email');
            }
            
            // Валидация email формата
            if (!filter_var($googleUser->email, FILTER_VALIDATE_EMAIL)) {
                \Log::error('Google OAuth: Invalid email format from Google', [
                    'google_id' => $googleUser->id,
                    'email' => $googleUser->email,
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=invalid_email');
            }
            
            \Log::info('Google OAuth user received', [
                'email' => $googleUser->email,
                'id' => $googleUser->id,
                'name' => $googleUser->name ?? 'null',
            ]);
            
            // Проверяем, существует ли пользователь
            // ВАЖНО: сначала ищем по google_id для безопасности
            // Используем транзакцию для защиты от race condition
            try {
                $user = null;
                $googleSignupRawToken = null;

                // Используем транзакцию для атомарности операций
                DB::transaction(function () use (&$user, $googleUser, &$googleSignupRawToken, $request) {
                
                    // 1. Сначала ищем по google_id (самый надежный способ)
                    // Включаем soft deleted записи, чтобы проверить все возможные совпадения
                    // Используем lockForUpdate() для защиты от race condition
                    $user = User::withTrashed()
                        ->where('google_id', $googleUser->id)
                        ->lockForUpdate()
                        ->first();
                    
                    if ($user) {
                        // Если пользователь найден, но он soft deleted - восстанавливаем его
                        if ($user->trashed()) {
                            \Log::info('Google OAuth: Restoring soft deleted user', [
                                'user_id' => $user->id,
                                'email' => $user->email,
                            ]);
                            $user->restore();
                        }
                        
                        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что email совпадает
                        // Это защита от случаев, когда google_id был изменен или есть дубликаты
                        if ($user->email && strtolower(trim($user->email)) !== strtolower(trim($googleUser->email))) {
                            \Log::warning('Google OAuth: Email mismatch for user found by google_id', [
                                'user_id' => $user->id,
                                'db_email' => $user->email,
                                'google_email' => $googleUser->email,
                                'google_id' => $googleUser->id,
                            ]);
                            // Обновляем email, если он изменился в Google аккаунте
                            $user->update(['email' => $googleUser->email]);
                        }
                        
                        \Log::info('Google OAuth: User found by google_id', [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'google_id' => $googleUser->id,
                            'google_email' => $googleUser->email,
                            'email_match' => strtolower(trim($user->email ?? '')) === strtolower(trim($googleUser->email)),
                        ]);
                    } else {
                        // 2. Если не найден по google_id, ищем по email (включая soft deleted)
                        // ВАЖНО: Поиск по email менее надежен, чем по google_id
                        // Поэтому добавляем дополнительные проверки безопасности
                        // Используем lockForUpdate() для защиты от race condition
                        $user = User::withTrashed()
                            ->where('email', $googleUser->email)
                            ->lockForUpdate()
                            ->first();
                    
                    if ($user) {
                        // Если пользователь найден, но он soft deleted - полностью удаляем его перед созданием нового
                        if ($user->trashed()) {
                            \Log::info('Google OAuth: Force deleting soft deleted user before creating new', [
                                'user_id' => $user->id,
                                'email' => $user->email,
                                'google_id_from_oauth' => $googleUser->id,
                            ]);
                            // Удаляем профиль если есть
                            if ($user->profile) {
                                $user->profile->delete();
                            }
                            // Полностью удаляем пользователя
                            $user->forceDelete();
                            $user = null; // Сбрасываем, чтобы создать нового
                        } else {
                            // КРИТИЧЕСКАЯ ПРОВЕРКА БЕЗОПАСНОСТИ:
                            // Если пользователь найден по email, но у него УЖЕ есть другой google_id
                            // это означает попытку взлома или ошибку конфигурации
                            if ($user->google_id && $user->google_id !== $googleUser->id) {
                                \Log::error('Google OAuth: Security violation - email exists with different google_id', [
                                    'user_id' => $user->id,
                                    'user_email' => $user->email,
                                    'existing_google_id' => $user->google_id,
                                    'attempted_google_id' => $googleUser->id,
                                    'google_user_email' => $googleUser->email,
                                ]);
                                
                                // Выбрасываем исключение вместо return, чтобы транзакция откатилась
                                throw new \Exception('Email already linked to different Google account');
                            }
                            
                            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что email действительно совпадает
                            // (на случай, если в базе есть опечатки или изменения)
                            if (strtolower(trim($user->email)) !== strtolower(trim($googleUser->email))) {
                                \Log::error('Google OAuth: Email mismatch between database and Google', [
                                    'user_id' => $user->id,
                                    'db_email' => $user->email,
                                    'google_email' => $googleUser->email,
                                ]);
                                
                                // Выбрасываем исключение вместо return, чтобы транзакция откатилась
                                throw new \Exception('Email mismatch between database and Google');
                            }
                            
                            // Если google_id нет, привязываем текущий Google аккаунт
                            if (!$user->google_id) {
                                \Log::info('Google OAuth: Linking Google account to existing user', [
                                    'user_id' => $user->id,
                                    'email' => $user->email,
                                    'google_id' => $googleUser->id,
                                ]);
                                
                                // Проверяем, не занят ли этот google_id другим пользователем
                                $existingUserWithGoogleId = User::withTrashed()
                                    ->where('google_id', $googleUser->id)
                                    ->where('id', '!=', $user->id)
                                    ->first();
                                
                                if ($existingUserWithGoogleId) {
                                    \Log::error('Google OAuth: google_id already used by another user', [
                                        'current_user_id' => $user->id,
                                        'existing_user_id' => $existingUserWithGoogleId->id,
                                        'google_id' => $googleUser->id,
                                    ]);
                                    throw new \Exception('Google ID already linked to another account');
                                }
                                
                                $user->update([
                                    'google_id' => $googleUser->id,
                                    'provider' => 'google',
                                ]);
                                
                                // Обновляем email_verified_at, если еще не установлен
                                if (!$user->email_verified_at) {
                                    $user->update(['email_verified_at' => now()]);
                                }
                            } else {
                                // Если google_id уже установлен и совпадает, просто логируем
                                \Log::info('Google OAuth: User already linked to this Google account', [
                                    'user_id' => $user->id,
                                    'email' => $user->email,
                                    'google_id' => $user->google_id,
                                ]);
                            }
                        }
                        } else {
                            // 3. Пользователь не найден - создаем нового
                            // Дополнительная проверка: убеждаемся, что google_id не занят
                            // (на случай race condition)
                            $existingUserWithGoogleId = User::withTrashed()
                                ->where('google_id', $googleUser->id)
                                ->lockForUpdate()
                                ->first();
                            
                            if ($existingUserWithGoogleId) {
                                \Log::warning('Google OAuth: User with google_id found during creation (race condition)', [
                                    'existing_user_id' => $existingUserWithGoogleId->id,
                                    'google_id' => $googleUser->id,
                                ]);
                                $user = $existingUserWithGoogleId;
                                if ($user->trashed()) {
                                    $user->restore();
                                }
                            } else {
                                if (! PlatformSettingsService::isRegistrationEnabled()) {
                                    throw new \Exception('Регистрация новых пользователей отключена администратором.');
                                }
                                if (PlatformSettingsService::isMaintenanceMode()) {
                                    throw new \Exception('Платформа на обслуживании, создание новых аккаунтов недоступно.');
                                }

                                // Новый пользователь: не создаём User в callback — выбор роли на фронте + POST /auth/google/complete
                                $googleSignupRawToken = Str::random(64);
                                $nameParts = $this->parseName($googleUser->name ?? '');

                                $this->putGoogleSignupPending($googleSignupRawToken, [
                                    'purpose' => self::GOOGLE_SIGNUP_PURPOSE,
                                    'email' => $googleUser->email,
                                    'google_id' => $googleUser->id,
                                    'first_name' => $nameParts['first_name'] ?? '',
                                    'last_name' => $nameParts['last_name'] ?? '',
                                    'avatar' => $googleUser->avatar ?? null,
                                    'locale' => $request->hasSession()
                                        ? $request->session()->get('oauth_locale', (string) config('app.locale', 'en'))
                                        : (string) config('app.locale', 'en'),
                                    'created_at' => now()->toIso8601String(),
                                ]);

                                \Log::info('oauth_google_pending_created', [
                                    'email' => $googleUser->email,
                                ]);

                                $user = null;
                            }
                        }
                    }
                });

                // Новый Google-пользователь: редирект на выбор роли (User ещё не создан)
                if ($googleSignupRawToken !== null && $user === null) {
                    $frontendUrl = $this->getFrontendUrl($request);

                    return redirect($frontendUrl . '/auth/google/choose-role?pending=' . urlencode($googleSignupRawToken));
                }

                // КРИТИЧЕСКАЯ ПРОВЕРКА: Убеждаемся, что пользователь был найден или создан
                if (!$user) {
                    \Log::error('Google OAuth: User is null after transaction', [
                        'google_id' => $googleUser->id,
                        'email' => $googleUser->email,
                    ]);
                    throw new \Exception('Failed to create or find user');
                }
                
                // КРИТИЧЕСКАЯ ПРОВЕРКА БЕЗОПАСНОСТИ: Убеждаемся, что найденный пользователь соответствует Google аккаунту
                // Это первая линия защиты после транзакции
                if ($user->google_id !== $googleUser->id) {
                    \Log::error('Google OAuth: CRITICAL - User google_id mismatch immediately after transaction', [
                        'user_id' => $user->id,
                        'user_email' => $user->email,
                        'user_google_id' => $user->google_id,
                        'google_oauth_id' => $googleUser->id,
                        'google_oauth_email' => $googleUser->email,
                    ]);
                    throw new \Exception('Security violation: User google_id does not match OAuth google_id');
                }
                
                // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что email совпадает
                if (strtolower(trim($user->email ?? '')) !== strtolower(trim($googleUser->email))) {
                    \Log::error('Google OAuth: CRITICAL - User email mismatch immediately after transaction', [
                        'user_id' => $user->id,
                        'user_email' => $user->email,
                        'user_google_id' => $user->google_id,
                        'google_oauth_email' => $googleUser->email,
                        'google_oauth_id' => $googleUser->id,
                    ]);
                    throw new \Exception('Security violation: User email does not match OAuth email');
                }
                
                \Log::info('Google OAuth: User verified after transaction', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_role' => $user->role,
                    'google_id' => $user->google_id,
                    'google_oauth_id' => $googleUser->id,
                    'google_oauth_email' => $googleUser->email,
                ]);
                
                // Обновляем аватар если он изменился
                if ($googleUser->avatar && $user->profile) {
                    // Можно сохранить URL аватара или загрузить его
                    // Пока просто обновим, если нужно
                }
            } catch (\Exception $e) {
                \Log::error('Google OAuth: Error creating/updating user', [
                    'error' => $e->getMessage(),
                    'error_code' => $e->getCode(),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                // Обрабатываем специальные ошибки безопасности
                $errorMessage = $e->getMessage();
                if (strpos($errorMessage, 'Email already linked') !== false) {
                    $frontendUrl = $this->getFrontendUrl($request);
                    return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=email_already_linked');
                }
                
                if (strpos($errorMessage, 'Email mismatch') !== false) {
                    $frontendUrl = $this->getFrontendUrl($request);
                    return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=email_mismatch');
                }
                
                if (strpos($errorMessage, 'Google ID already linked') !== false) {
                    $frontendUrl = $this->getFrontendUrl($request);
                    return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=google_id_already_linked');
                }
                
                throw $e; // Пробрасываем дальше для обработки в общем catch
            }
            
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что пользователь существует и валиден
            if (!$user || !$user->id) {
                \Log::error('Google OAuth: Invalid user object after processing', [
                    'user_exists' => $user !== null,
                    'user_id' => $user->id ?? 'null',
                    'google_id' => $googleUser->id,
                    'google_email' => $googleUser->email,
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=user_creation_failed');
            }
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА БЕЗОПАСНОСТИ: Убеждаемся, что найденный пользователь соответствует Google аккаунту
            // Это финальная защита от авторизации под чужим аккаунтом
            if ($user->google_id !== $googleUser->id) {
                \Log::error('Google OAuth: CRITICAL SECURITY VIOLATION - User google_id mismatch before token generation', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_google_id' => $user->google_id,
                    'google_oauth_id' => $googleUser->id,
                    'google_oauth_email' => $googleUser->email,
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=security_violation');
            }
            
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Убеждаемся, что email совпадает
            if (strtolower(trim($user->email ?? '')) !== strtolower(trim($googleUser->email))) {
                \Log::error('Google OAuth: CRITICAL SECURITY VIOLATION - User email mismatch before token generation', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_google_id' => $user->google_id,
                    'google_oauth_email' => $googleUser->email,
                    'google_oauth_id' => $googleUser->id,
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=oauth_failed&reason=email_mismatch');
            }
            
            // Проверяем, не заблокирован ли пользователь
            if ($user->is_blocked || !$user->is_active) {
                \Log::warning('Google OAuth: User blocked or inactive', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'is_blocked' => $user->is_blocked,
                    'is_active' => $user->is_active,
                ]);
                $frontendUrl = $this->getFrontendUrl($request);
                return redirect($frontendUrl . '/sign-in?error=blocked');
            }

            try {
                $user->last_login_at = now();
                $user->saveQuietly();
                ActivityService::logLogin($user->fresh());
            } catch (\Throwable $e) {
                \Log::warning('Google login activity: '.$e->getMessage());
            }

            // Генерируем JWT токены
            // ВАЖНО: Логируем все данные перед генерацией токена для отладки
            try {
                \Log::info('Google OAuth: Generating tokens - FINAL VERIFICATION', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_role' => $user->role,
                    'user_google_id' => $user->google_id,
                    'google_oauth_id' => $googleUser->id,
                    'google_oauth_email' => $googleUser->email,
                    'google_id_match' => $user->google_id === $googleUser->id,
                    'email_match' => strtolower(trim($user->email ?? '')) === strtolower(trim($googleUser->email)),
                ]);
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
     * Данные ожидающего Google sign-up (минимальный набор для UI выбора роли).
     */
    public function pending(Request $request)
    {
        $token = $request->query('token');
        if (! is_string($token) || $token === '') {
            return response()->json([
                'success' => false,
                'message' => 'Token is required',
            ], 422);
        }

        $payload = $this->getGoogleSignupPendingPayload($token);

        if (! is_array($payload) || ($payload['purpose'] ?? '') !== self::GOOGLE_SIGNUP_PURPOSE) {
            \Log::info('oauth_google_pending_expired', [
                'reason' => 'pending_miss_or_invalid',
            ]);

            return response()->json([
                'success' => false,
                'code' => 'pending_expired',
                'message' => 'This sign-up session has expired. Please sign in with Google again.',
            ], 410);
        }

        return response()->json([
            'email' => $payload['email'],
            'first_name' => $payload['first_name'] ?? '',
            'last_name' => $payload['last_name'] ?? '',
            'avatar' => $payload['avatar'] ?? null,
        ]);
    }

    /**
     * Завершение регистрации после выбора роли (и данных компании для BUSINESS_OWNER).
     */
    public function complete(Request $request)
    {
        if (! PlatformSettingsService::isRegistrationEnabled()) {
            return response()->json([
                'success' => false,
                'code' => 'registration_disabled',
                'message' => 'Регистрация новых пользователей временно отключена администратором.',
            ], 403);
        }

        if (PlatformSettingsService::isMaintenanceMode()) {
            return response()->json([
                'success' => false,
                'code' => 'maintenance',
                'message' => 'Платформа на обслуживании, создание новых аккаунтов недоступно.',
            ], 503);
        }

        $input = $request->all();
        if (isset($input['company']) && is_array($input['company'])) {
            $w = $input['company']['website'] ?? null;
            if (is_string($w) && trim($w) === '') {
                $input['company']['website'] = null;
            }
        }

        $validator = Validator::make($input, [
            'token' => 'required|string',
            'role' => 'required|in:CLIENT,BUSINESS_OWNER',
            'company' => 'nullable|array',
            'company.name' => 'required_if:role,BUSINESS_OWNER|string|max:255',
            'company.address' => 'required_if:role,BUSINESS_OWNER|string|max:2000',
            'company.phone' => 'required_if:role,BUSINESS_OWNER|string|max:30',
            'company.description' => 'nullable|string|max:10000',
            'company.email' => 'nullable|email|max:255',
            'company.website' => 'nullable|url|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $token = $input['token'];
        $payload = $this->getGoogleSignupPendingPayload($token);

        if (! is_array($payload) || ($payload['purpose'] ?? '') !== self::GOOGLE_SIGNUP_PURPOSE) {
            \Log::info('oauth_google_pending_expired', [
                'reason' => 'complete_pending_miss',
            ]);

            return response()->json([
                'success' => false,
                'code' => 'pending_expired',
                'message' => 'This sign-up session has expired. Please sign in with Google again.',
            ], 410);
        }

        $role = $input['role'];
        $companyInput = is_array($input['company'] ?? null) ? $input['company'] : [];

        if ($role === 'BUSINESS_OWNER' && $companyInput === []) {
            return response()->json([
                'success' => false,
                'message' => 'Company data is required for a business account.',
            ], 422);
        }

        $conflict = false;

        try {
            $user = DB::transaction(function () use ($payload, $role, $companyInput, $token, &$conflict) {
                $exists = User::query()
                    ->where(function ($q) use ($payload) {
                        $q->where('email', $payload['email'])
                            ->orWhere('google_id', (string) $payload['google_id']);
                    })
                    ->lockForUpdate()
                    ->exists();

                if ($exists) {
                    $this->forgetGoogleSignupPending($token);
                    $conflict = true;

                    return null;
                }

                $user = User::create([
                    'email' => $payload['email'],
                    'password' => Hash::make(Str::random(32)),
                    'role' => $role,
                    'google_id' => (string) $payload['google_id'],
                    'provider' => 'google',
                    'is_active' => true,
                    'email_verified_at' => now(),
                    'locale' => is_string($payload['locale'] ?? null) ? $payload['locale'] : null,
                ]);

                UserProfile::create([
                    'user_id' => $user->id,
                    'first_name' => $payload['first_name'] ?? '',
                    'last_name' => $payload['last_name'] ?? '',
                    'avatar' => is_string($payload['avatar'] ?? null) ? $payload['avatar'] : null,
                ]);

                if ($role === 'BUSINESS_OWNER') {
                    $slug = $this->generateCompanySlug((string) $companyInput['name']);
                    Company::create([
                        'owner_id' => $user->id,
                        'name' => $companyInput['name'],
                        'slug' => $slug,
                        'description' => $companyInput['description'] ?? null,
                        'address' => $companyInput['address'],
                        'phone' => $companyInput['phone'],
                        'email' => $companyInput['email'] ?? $user->email,
                        'website' => $companyInput['website'] ?? null,
                        'timezone' => UsTimezones::getByState(''),
                        'status' => 'pending',
                    ]);
                }

                $this->forgetGoogleSignupPending($token);

                return $user;
            });
        } catch (\Illuminate\Database\QueryException $e) {
            $msg = $e->getMessage();
            if ($e->getCode() == 23000 || strpos($msg, 'UNIQUE') !== false || strpos($msg, 'unique') !== false) {
                $this->forgetGoogleSignupPending($token);

                return response()->json([
                    'success' => false,
                    'code' => 'account_exists',
                    'message' => 'An account with this email or Google profile already exists. Continue with Google sign-in.',
                ], 409);
            }
            throw $e;
        }

        if ($conflict || ! $user) {
            return response()->json([
                'success' => false,
                'code' => 'account_exists',
                'message' => 'An account with this email or Google profile already exists. Continue with Google sign-in.',
            ], 409);
        }

        if ($role === 'CLIENT') {
            \Log::info('oauth_google_completed_client', ['user_id' => $user->id]);
        } else {
            \Log::info('oauth_google_completed_business', ['user_id' => $user->id]);
        }

        try {
            ActivityService::logRegister($user->fresh());
        } catch (\Throwable $e) {
            \Log::warning('Google complete register activity: '.$e->getMessage());
        }

        try {
            $user->last_login_at = now();
            $user->saveQuietly();
            ActivityService::logLogin($user->fresh());
        } catch (\Throwable $e) {
            \Log::warning('Google complete login activity: '.$e->getMessage());
        }

        return $this->tokenJsonResponse($user->fresh()->load('profile'))->setStatusCode(201);
    }

    private function generateCompanySlug(string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'business';
        }
        $attempts = 0;
        do {
            $slug = $base.'-'.Str::lower(Str::random(6));
            $attempts++;
        } while (Company::where('slug', $slug)->exists() && $attempts < 25);

        return $slug;
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

