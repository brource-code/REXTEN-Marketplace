{{ __('mail.verify_email.plain_code', ['code' => $code, 'count' => $expireMinutes], $locale) }}

—
{{ __('mail.verify_email.footer', ['app' => $appName], $locale) }}
