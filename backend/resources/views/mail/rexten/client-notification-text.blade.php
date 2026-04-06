{{ $emailTitle }}

{{ $intro }}

{{ __('mail.client.open_bookings', [], $locale) }}: {{ $actionUrl }}

{{ __('mail.client.note', ['app' => $appName], $locale) }}

—
{{ __('mail.client.footer', ['app' => $appName], $locale) }}
