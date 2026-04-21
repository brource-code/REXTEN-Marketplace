<?php

namespace App\Services;

use App\Models\EmailVerificationCode;
use App\Models\User;
use App\Support\PasswordResetMailLocale;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

class EmailOtpService
{
    private const CODE_LENGTH = 6;

    private const EXPIRE_MINUTES = 15;

    private const MAX_ATTEMPTS = 5;

    private const RESEND_COOLDOWN_SECONDS = 60;

    private const HOURLY_SEND_LIMIT = 6;

    /**
     * Поиск пользователя по email без учёта регистра и пробелов по краям (как в форме).
     */
    private function userByEmail(string $email): ?User
    {
        $normalized = mb_strtolower(trim($email));

        return User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$normalized])
            ->first();
    }

    /**
     * Язык письма: сначала явная подсказка с клиента (язык интерфейса), затем users.locale, затем app.locale.
     */
    private function resolveMailLang(?User $user, ?string $localeHintRaw): string
    {
        $fromHint = PasswordResetMailLocale::toMailLang($localeHintRaw);
        if ($fromHint !== null) {
            return $fromHint;
        }

        $fromUser = PasswordResetMailLocale::toMailLang($user?->locale);
        if ($fromUser !== null) {
            return $fromUser;
        }

        $fromApp = PasswordResetMailLocale::toMailLang((string) config('app.locale', 'en'));

        return $fromApp ?? 'en';
    }

    private function sendVerificationMail(User $user, string $plainCode, ?string $localeHintRaw = null): void
    {
        $locale = $this->resolveMailLang($user, $localeHintRaw);
        $expireMinutes = self::EXPIRE_MINUTES;
        $appName = (string) config('app.name');

        $data = [
            'appName' => $appName,
            'code' => $plainCode,
            'expireMinutes' => $expireMinutes,
            'locale' => $locale,
        ];

        Mail::send(
            [
                'html' => 'mail.rexten.verify-email',
                'text' => 'mail.rexten.verify-email-text',
            ],
            $data,
            function ($message) use ($user, $appName, $locale) {
                $message->to($user->getEmailForVerification())
                    ->subject(__('mail.verify_email.subject', ['app' => $appName], $locale));
            }
        );
    }

    /**
     * Выдать новый код и отправить письмо (регистрация, логин с неподтверждённым email).
     * При активном cooldown и ещё действующем коде письмо не дублируется.
     *
     * @return array{sent: bool, reason?: string}
     */
    public function issueAndSend(User $user, ?string $localeHintRaw = null): array
    {
        if ($user->hasVerifiedEmail()) {
            return ['sent' => false, 'reason' => 'verified'];
        }

        $hourlyKey = 'email-otp-hourly:'.$user->email;
        if (RateLimiter::tooManyAttempts($hourlyKey, self::HOURLY_SEND_LIMIT)) {
            return ['sent' => false, 'reason' => 'hourly_limit'];
        }

        $row = EmailVerificationCode::query()->where('user_id', $user->id)->first();
        $now = now();

        if ($row && $row->expires_at->isFuture() && $row->sent_at->gt($now->copy()->subSeconds(self::RESEND_COOLDOWN_SECONDS))) {
            return ['sent' => false, 'reason' => 'cooldown'];
        }

        $plain = str_pad((string) random_int(0, 999999), self::CODE_LENGTH, '0', STR_PAD_LEFT);

        EmailVerificationCode::query()->where('user_id', $user->id)->delete();

        EmailVerificationCode::query()->create([
            'user_id' => $user->id,
            'code_hash' => Hash::make($plain),
            'expires_at' => $now->copy()->addMinutes(self::EXPIRE_MINUTES),
            'attempts' => 0,
            'sent_at' => $now,
        ]);

        try {
            $this->sendVerificationMail($user, $plain, $localeHintRaw);
            RateLimiter::hit($hourlyKey, 3600);
        } catch (\Throwable $e) {
            Log::warning('Email OTP send failed: '.$e->getMessage());

            return ['sent' => false, 'reason' => 'mail_failed'];
        }

        return ['sent' => true];
    }

    /**
     * Повторная отправка с публичной страницы (кнопка «Отправить снова»).
     *
     * @return array{sent: bool, reason?: string, wait_seconds?: int}
     */
    public function resendByEmail(string $email, ?string $localeHintRaw = null): array
    {
        $user = $this->userByEmail($email);
        if (! $user || $user->hasVerifiedEmail()) {
            return ['sent' => true];
        }

        $row = EmailVerificationCode::query()->where('user_id', $user->id)->first();
        $now = now();

        if ($row && $row->sent_at->gt($now->copy()->subSeconds(self::RESEND_COOLDOWN_SECONDS))) {
            $elapsed = (int) abs($now->timestamp - $row->sent_at->timestamp);
            $wait = max(1, self::RESEND_COOLDOWN_SECONDS - $elapsed);

            return ['sent' => false, 'reason' => 'cooldown', 'wait_seconds' => $wait];
        }

        $issued = $this->issueAndSend($user, $localeHintRaw);
        if (! $issued['sent'] && ($issued['reason'] ?? '') === 'hourly_limit') {
            return ['sent' => false, 'reason' => 'hourly_limit'];
        }

        if (! $issued['sent'] && ($issued['reason'] ?? '') === 'cooldown') {
            $rowAfter = EmailVerificationCode::query()->where('user_id', $user->id)->first();
            if ($rowAfter) {
                $elapsed = (int) abs(now()->timestamp - $rowAfter->sent_at->timestamp);
                $wait = max(1, self::RESEND_COOLDOWN_SECONDS - $elapsed);

                return ['sent' => false, 'reason' => 'cooldown', 'wait_seconds' => $wait];
            }
        }

        return $issued;
    }

    /**
     * @return array{ok: bool, user?: User, error?: string}
     */
    public function verify(string $email, string $digits): array
    {
        $code = preg_replace('/\D/', '', $digits) ?? '';
        if (strlen($code) !== self::CODE_LENGTH) {
            return ['ok' => false, 'error' => 'invalid_format'];
        }

        $user = $this->userByEmail($email);
        if (! $user) {
            return ['ok' => false, 'error' => 'invalid_code'];
        }

        if ($user->hasVerifiedEmail()) {
            return ['ok' => false, 'error' => 'already_verified'];
        }

        $row = EmailVerificationCode::query()->where('user_id', $user->id)->first();
        if (! $row) {
            return ['ok' => false, 'error' => 'invalid_code'];
        }

        if ($row->expires_at->isPast()) {
            return ['ok' => false, 'error' => 'expired'];
        }

        if ($row->attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'error' => 'too_many_attempts'];
        }

        if (! Hash::check($code, $row->code_hash)) {
            $row->increment('attempts');

            return ['ok' => false, 'error' => 'invalid_code'];
        }

        if (! $user->hasVerifiedEmail()) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $row->delete();

        return ['ok' => true, 'user' => $user->fresh()];
    }

    /**
     * Удаление просроченных записей (планировщик).
     */
    public function deleteExpired(): int
    {
        return EmailVerificationCode::query()->where('expires_at', '<', now())->delete();
    }
}
