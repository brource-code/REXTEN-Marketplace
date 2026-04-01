{{ __('mail.reset_password.plain', ['url' => $url, 'count' => $expireMinutes], $locale) }}

—
{{ __('mail.reset_password.footer', ['app' => $appName], $locale) }}
