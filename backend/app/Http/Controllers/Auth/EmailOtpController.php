<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\IssuesAuthTokens;
use App\Http\Controllers\Controller;
use App\Services\ActivityService;
use App\Services\EmailOtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmailOtpController extends Controller
{
    use IssuesAuthTokens;

    public function verify(Request $request, EmailOtpService $otp)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
            'code' => 'required|string|max:32',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $result = $otp->verify($request->input('email'), (string) $request->input('code'));

        if (! $result['ok']) {
            $err = $result['error'] ?? 'invalid_code';
            $map = [
                'invalid_format' => [422, 'invalid_format', 'Введите 6-значный код из письма.'],
                'invalid_code' => [422, 'invalid_code', 'Неверный код.'],
                'expired' => [422, 'expired', 'Код истёк. Запросите новый на странице входа или по кнопке ниже.'],
                'too_many_attempts' => [429, 'too_many_attempts', 'Слишком много неверных попыток. Запросите новый код.'],
                'already_verified' => [422, 'already_verified', 'Email уже подтверждён. Войдите с паролем.'],
            ];
            [$status, $code, $message] = $map[$err] ?? [422, $err, 'Не удалось подтвердить код.'];

            return response()->json([
                'success' => false,
                'code' => $code,
                'message' => $message,
            ], $status);
        }

        $user = $result['user'];
        try {
            $user->last_login_at = now();
            $user->saveQuietly();
            ActivityService::logLogin($user->fresh());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Verify OTP login activity: '.$e->getMessage());
        }

        return $this->tokenJsonResponse($user->load('profile'));
    }

    public function resend(Request $request, EmailOtpService $otp)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email|max:255',
            'locale' => 'nullable|string|in:en,ru,es-MX,hy-AM,uk-UA',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $result = $otp->resendByEmail($request->input('email'), $request->input('locale'));

        if (($result['reason'] ?? '') === 'cooldown') {
            return response()->json([
                'success' => false,
                'code' => 'resend_cooldown',
                'wait_seconds' => $result['wait_seconds'] ?? 60,
                'message' => 'Подождите перед повторной отправкой.',
            ], 429);
        }

        if (($result['reason'] ?? '') === 'hourly_limit') {
            return response()->json([
                'success' => false,
                'code' => 'hourly_limit',
                'message' => 'Слишком много писем за час. Попробуйте позже.',
            ], 429);
        }

        if (! ($result['sent'] ?? false) && ($result['reason'] ?? '') === 'mail_failed') {
            return response()->json([
                'success' => false,
                'code' => 'mail_failed',
                'message' => 'Не удалось отправить письмо. Проверьте настройки почты сервера или попробуйте позже.',
            ], 503);
        }

        return response()->json([
            'success' => true,
            'message' => 'Если аккаунт существует и email ещё не подтверждён, мы отправили новый код.',
        ]);
    }
}
